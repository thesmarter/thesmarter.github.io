/**
 * fetch-releases.mjs — pull recent releases for repos in src/data/repos.json.
 *
 * - Reads src/data/repos.json projects (full_name list)
 * - For each repo GET https://api.github.com/repos/{full}/releases?per_page=10
 * - Headers: User-Agent + Accept + optional Authorization (GITHUB_TOKEN / GH_TOKEN)
 * - Concurrency: 5
 * - Collects non-draft releases (drafts skipped)
 * - Writes: src/data/releases.json { generated_at, totals, releases[] }
 *           src/data/releases-meta.json summary
 * - Fail-soft: on rate-limit / network error keep existing files and exit 0.
 * - No deps beyond node built-ins.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "src", "data");
const REPOS_PATH = join(DATA_DIR, "repos.json");
const RELEASES_PATH = join(DATA_DIR, "releases.json");
const RELEASES_META_PATH = join(DATA_DIR, "releases-meta.json");

const API_BASE = "https://api.github.com";
const CONCURRENCY = 5;
const PER_PAGE = 10;

function headers() {
  const h = {
    "User-Agent": "thesmarter.github.io",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function slugifyRelease(org, repo, tag) {
  const s = `${org}-${repo}-${tag}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || `${String(org).toLowerCase()}-${String(repo).toLowerCase()}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const err = new Error(`GitHub rate limited: ${res.status} remaining=${remaining} url=${url}`);
    err.code = "RATE_LIMITED";
    err.status = res.status;
    throw err;
  }
  if (res.status === 404) {
    // Repo not found or releases disabled — treat as empty, not fatal.
    return null;
  }
  if (!res.ok) {
    const err = new Error(`GitHub fetch failed: ${res.status} ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function mapAsset(a) {
  return {
    id: a?.id ?? null,
    name: a?.name ?? "",
    label: a?.label ?? null,
    content_type: a?.content_type ?? null,
    size: a?.size ?? 0,
    download_count: a?.download_count ?? 0,
    digest: a?.digest ?? null,
    browser_download_url: a?.browser_download_url ?? "",
    created_at: a?.created_at ?? null,
  };
}

function mapRelease(full_name, org, repo, r) {
  const tag = r?.tag_name ?? "";
  return {
    id: r?.id ?? null,
    slug: slugifyRelease(org, repo, tag),
    org,
    repo,
    full_name,
    tag_name: tag,
    name: r?.name ?? null,
    html_url: r?.html_url ?? `https://github.com/${full_name}/releases/tag/${tag}`,
    author: r?.author
      ? {
          login: r.author.login ?? null,
          avatar_url: r.author.avatar_url ?? null,
          html_url: r.author.html_url ?? null,
        }
      : null,
    created_at: r?.created_at ?? null,
    published_at: r?.published_at ?? null,
    updated_at: r?.updated_at ?? null,
    prerelease: Boolean(r?.prerelease),
    body: r?.body ?? "",
    tarball_url: r?.tarball_url ?? null,
    zipball_url: r?.zipball_url ?? null,
    assets: Array.isArray(r?.assets) ? r.assets.map(mapAsset) : [],
  };
}

function loadFullNames() {
  const raw = readFileSync(REPOS_PATH, "utf8");
  const obj = JSON.parse(raw);
  const projects = Array.isArray(obj?.projects) ? obj.projects : [];
  const names = projects.map((p) => p?.full_name).filter((s) => typeof s === "string" && s.includes("/"));
  return [...new Set(names)];
}

function splitFull(full) {
  const idx = full.indexOf("/");
  return [full.slice(0, idx), full.slice(idx + 1)];
}

function keepExisting(reason) {
  const hasReleases = existsSync(RELEASES_PATH);
  const hasMeta = existsSync(RELEASES_META_PATH);
  console.warn(
    `[fetch-releases] fail-soft: ${reason}. Keeping existing files (releases:${hasReleases} meta:${hasMeta}).`,
  );
}

function writeEmptySkeleton(reason) {
  const now = new Date().toISOString();
  const releasesJson = {
    generated_at: now,
    totals: { releases: 0, assets: 0, total_downloads: 0 },
    releases: [],
  };
  const metaJson = {
    generated_at: now,
    totals: { releases: 0, assets: 0, total_downloads: 0, repos_checked: 0, repos_with_releases: 0 },
    byOrg: {},
    byRepo: {},
    latest: null,
    note: `empty skeleton (${reason})`,
  };
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(RELEASES_PATH, JSON.stringify(releasesJson, null, 2) + "\n", "utf8");
  writeFileSync(RELEASES_META_PATH, JSON.stringify(metaJson, null, 2) + "\n", "utf8");
}

async function fetchRepoReleases(full) {
  const [org, repo] = splitFull(full);
  const url = `${API_BASE}/repos/${full}/releases?per_page=${PER_PAGE}`;
  const data = await fetchJson(url);
  if (data === null) return []; // 404 -> no releases
  if (!Array.isArray(data)) throw new Error(`Unexpected releases payload for ${full}`);
  return data
    .filter((r) => !r?.draft)
    .map((r) => mapRelease(full, org, repo, r));
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  let rateLimited = null;

  async function runOne() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      if (rateLimited) {
        results[i] = [];
        continue;
      }
      try {
        results[i] = await worker(items[i]);
      } catch (err) {
        if (err?.code === "RATE_LIMITED" || err?.status === 403 || err?.status === 429) {
          rateLimited = err;
          results[i] = [];
        } else {
          console.warn(`[fetch-releases] warn: ${items[i]}: ${err?.message || err} (skipped)`);
          results[i] = [];
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runOne));
  return { results, rateLimited };
}

async function main() {
  let fullNames;
  try {
    fullNames = loadFullNames();
  } catch (err) {
    keepExisting(`cannot read repos.json: ${err?.message || err}`);
    if (!existsSync(RELEASES_PATH) || !existsSync(RELEASES_META_PATH)) {
      writeEmptySkeleton("repos.json unreadable, no existing releases");
    }
    process.exit(0);
  }

  if (fullNames.length === 0) {
    console.warn("[fetch-releases] no projects in repos.json, writing empty releases.");
    const now = new Date().toISOString();
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(
      RELEASES_PATH,
      JSON.stringify({ generated_at: now, totals: { releases: 0, assets: 0, total_downloads: 0 }, releases: [] }, null, 2) + "\n",
      "utf8",
    );
    writeFileSync(
      RELEASES_META_PATH,
      JSON.stringify(
        { generated_at: now, totals: { releases: 0, assets: 0, total_downloads: 0, repos_checked: 0, repos_with_releases: 0 }, byOrg: {}, byRepo: {}, latest: null },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    process.exit(0);
  }

  let collected = [];
  try {
    const { results, rateLimited } = await runPool(fullNames, fetchRepoReleases, CONCURRENCY);
    if (rateLimited) throw rateLimited;
    collected = results.flat();
  } catch (err) {
    // Network failure (fetch TypeError) or rate limit -> fail-soft, keep existing.
    const msg = err?.message || String(err);
    keepExisting(msg);
    if (!existsSync(RELEASES_PATH) || !existsSync(RELEASES_META_PATH)) {
      writeEmptySkeleton(msg);
    }
    process.exit(0);
  }

  // Newest first by published_at fallback created_at.
  collected.sort((a, b) =>
    String(b.published_at || b.created_at || "").localeCompare(String(a.published_at || a.created_at || "")),
  );

  let assetCount = 0;
  let totalDownloads = 0;
  const byOrg = {};
  const byRepo = {};
  for (const r of collected) {
    const n = r.assets?.length || 0;
    assetCount += n;
    let dls = 0;
    for (const a of r.assets || []) dls += a.download_count || 0;
    totalDownloads += dls;
    byOrg[r.org] = (byOrg[r.org] || 0) + 1;
    const e = (byRepo[r.full_name] = byRepo[r.full_name] || {
      releases: 0,
      assets: 0,
      downloads: 0,
      latest_tag: null,
      latest_name: null,
      latest_published_at: null,
      latest_slug: null,
      latest_html_url: null,
    });
    e.releases += 1;
    e.assets += n;
    e.downloads += dls;
    // collected is newest-first, so first seen is latest.
    if (!e.latest_tag) {
      e.latest_tag = r.tag_name;
      e.latest_name = r.name;
      e.latest_published_at = r.published_at;
      e.latest_slug = r.slug;
      e.latest_html_url = r.html_url;
    }
  }

  const reposWithReleases = Object.keys(byRepo).length;
  const now = new Date().toISOString();
  const totals = { releases: collected.length, assets: assetCount, total_downloads: totalDownloads };

  const releasesJson = { generated_at: now, totals, releases: collected };

  const latest = collected[0]
    ? {
        slug: collected[0].slug,
        full_name: collected[0].full_name,
        tag_name: collected[0].tag_name,
        name: collected[0].name,
        html_url: collected[0].html_url,
        published_at: collected[0].published_at,
      }
    : null;

  const metaJson = {
    generated_at: now,
    totals: { ...totals, repos_checked: fullNames.length, repos_with_releases: reposWithReleases },
    byOrg,
    byRepo,
    latest,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(RELEASES_PATH, JSON.stringify(releasesJson, null, 2) + "\n", "utf8");
  writeFileSync(RELEASES_META_PATH, JSON.stringify(metaJson, null, 2) + "\n", "utf8");
  console.log(
    `[fetch-releases] wrote ${collected.length} releases, ${assetCount} assets, ${totalDownloads} downloads from ${fullNames.length} repos (${reposWithReleases} with releases)`,
  );
}

main();

/**
 * fetch-repos.mjs — pull public repos for 3 orgs, merge with overrides, write data files.
 *
 * - GET https://api.github.com/orgs/{thesmarter,AdaaSystem,DetaElectPro}/repos?per_page=100
 * - Headers: User-Agent + Accept + optional Authorization (GITHUB_TOKEN)
 * - Merge: src/data/overrides.json (featured, featured_order, category, description_en, install, curated, domains)
 * - Write: src/data/repos.json { generated_at, orgs[], projects[] }
 *          src/data/meta.json  { totals, byOrg, byLang, byCategory }
 * - Fail-soft: on 403 / rate-limit / network error keep existing files and exit 0.
 * - No deps beyond node built-ins.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "src", "data");
const OVERRIDES_PATH = join(DATA_DIR, "overrides.json");
const REPOS_PATH = join(DATA_DIR, "repos.json");
const META_PATH = join(DATA_DIR, "meta.json");

const ORGS = ["thesmarter", "AdaaSystem", "DetaElectPro"];
const API_BASE = "https://api.github.com";

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

async function fetchJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const err = new Error(`GitHub rate limited: ${res.status} remaining=${remaining}`);
    err.code = "RATE_LIMITED";
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GitHub fetch failed: ${res.status} ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function slugify(org, name) {
  const s = `${org}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || name.toLowerCase();
}

function loadOverrides() {
  try {
    const raw = readFileSync(OVERRIDES_PATH, "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function keepExisting(reason) {
  const hasRepos = existsSync(REPOS_PATH);
  const hasMeta = existsSync(META_PATH);
  console.warn(`[fetch-repos] fail-soft: ${reason}. Keeping existing files (repos:${hasRepos} meta:${hasMeta}).`);
}

async function main() {
  const overrides = loadOverrides();

  let allApiRepos = [];
  let orgInfos = [];

  try {
    for (const org of ORGS) {
      const [repos, info] = await Promise.all([
        fetchJson(`${API_BASE}/orgs/${org}/repos?per_page=100`),
        fetchJson(`${API_BASE}/orgs/${org}`).catch(() => null),
      ]);
      if (!Array.isArray(repos)) throw new Error(`Unexpected repos payload for ${org}`);
      allApiRepos.push(...repos);
      const first = repos[0]?.owner;
      orgInfos.push({
        login: info?.login || first?.login || org,
        html_url: info?.html_url || first?.html_url || `https://github.com/${org}`,
        avatar_url: info?.avatar_url || first?.avatar_url || "",
        repo_count: repos.length,
      });
    }
  } catch (err) {
    keepExisting(err?.message || err);
    process.exit(0);
  }

  const projects = allApiRepos.map((r) => {
    const full = r.full_name;
    const o = overrides[full] || {};
    return {
      id: r.id,
      slug: slugify(r.owner?.login || "", r.name || ""),
      org: r.owner?.login || "",
      name: r.name,
      full_name: full,
      html_url: r.html_url,
      description: r.description ?? null,
      description_en: o.description_en ?? null,
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      forks_count: r.forks_count ?? 0,
      open_issues: r.open_issues_count ?? r.open_issues ?? 0,
      topics: Array.isArray(r.topics) ? r.topics : [],
      homepage: r.homepage || null,
      license: r.license?.spdx_id || r.license?.name || null,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      fork: Boolean(r.fork),
      featured: Boolean(o.featured),
      featured_order: o.featured_order ?? null,
      curated: o.curated === false ? false : true,
      category: o.category ?? null,
      domains: Array.isArray(o.domains) ? o.domains : [],
      install: o.install ?? null,
    };
  });

  // Sort: featured first (by featured_order), then stars desc, then updated_at desc
  projects.sort((a, b) => {
    const fa = a.featured ? 0 : 1;
    const fb = b.featured ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (fa === 0) return (a.featured_order ?? 999) - (b.featured_order ?? 999);
    if (b.stars !== a.stars) return b.stars - a.stars;
    return String(b.updated_at).localeCompare(String(a.updated_at));
  });

  const byOrg = {};
  const byLang = {};
  const byCategory = {};
  let stars = 0;
  let featured = 0;
  let curated = 0;
  for (const p of projects) {
    byOrg[p.org] = (byOrg[p.org] || 0) + 1;
    const lang = p.language || "Other";
    byLang[lang] = (byLang[lang] || 0) + 1;
    if (p.category) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    stars += p.stars || 0;
    if (p.featured) featured += 1;
    if (p.curated) curated += 1;
  }

  // Keep org order stable as ORGS
  orgInfos.sort((a, b) => ORGS.indexOf(a.login) - ORGS.indexOf(b.login) || a.login.localeCompare(b.login));

  const reposJson = {
    generated_at: new Date().toISOString(),
    orgs: orgInfos,
    projects,
  };
  const metaJson = {
    totals: {
      orgs: orgInfos.length,
      projects: projects.length,
      featured,
      curated,
      stars,
    },
    byOrg,
    byLang,
    byCategory,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(REPOS_PATH, JSON.stringify(reposJson, null, 2) + "\n", "utf8");
  writeFileSync(META_PATH, JSON.stringify(metaJson, null, 2) + "\n", "utf8");
  console.log(`[fetch-repos] wrote ${projects.length} projects (${featured} featured, ${curated} curated)`);
}

main();

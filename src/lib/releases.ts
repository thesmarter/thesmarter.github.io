import data from "../data/releases.json";

export interface ReleaseAuthor {
  login: string | null;
  avatar_url: string | null;
  html_url: string | null;
}

export interface ReleaseAsset {
  id: number | null;
  name: string;
  label: string | null;
  content_type: string | null;
  size: number;
  download_count: number;
  digest: string | null;
  browser_download_url: string;
  created_at: string | null;
}

export interface Release {
  id: number | null;
  slug: string;
  org: string;
  repo: string;
  full_name: string;
  tag_name: string;
  name: string | null;
  html_url: string;
  author: ReleaseAuthor | null;
  created_at: string | null;
  published_at: string | null;
  updated_at: string | null;
  prerelease: boolean;
  body: string;
  tarball_url: string | null;
  zipball_url: string | null;
  assets: ReleaseAsset[];
}

interface ReleasesFile {
  generated_at: string;
  totals: {
    releases: number;
    assets: number;
    total_downloads: number;
  };
  releases: Release[];
}

const file = (data ?? {}) as Partial<ReleasesFile>;

const releases: Release[] = Array.isArray(file.releases) ? (file.releases as Release[]) : [];

export const generatedAt: string = file.generated_at ?? "";

export const releaseTotals = file.totals ?? { releases: releases.length, assets: 0, total_downloads: 0 };

/** Slugify `{org}-{repo}-{tag}`, e.g. thesmarter-thesmarter-github-io-v1-0. */
export function slugifyRelease(org: string, repo: string, tag: string): string {
  const s = `${org}-${repo}-${tag}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || `${String(org).toLowerCase()}-${String(repo).toLowerCase()}`;
}

export interface ParsedReleaseUrl {
  org: string;
  repo: string;
  tag: string;
}

/**
 * Parse GitHub release URLs:
 * - https://github.com/{org}/{repo}/releases/tag/{tag}
 * - https://github.com/{org}/{repo}/releases/download/{tag}/{file}
 * - https://github.com/{org}/{repo}/releases/latest
 * Returns {org, repo, tag} (`tag` is "latest" for /latest) or null.
 */
export function parseReleaseUrl(url: string | null | undefined): ParsedReleaseUrl | null {
  if (!url || typeof url !== "string") return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  // Expect at least [org, repo, "releases", ...]
  if (parts.length < 4) return null;
  const [org, repo, releasesSeg, fourth, fifth] = parts;
  if (!org || !repo || releasesSeg !== "releases") return null;
  if (fourth === "tag" && fifth) {
    let tag: string;
    try {
      tag = decodeURIComponent(fifth);
    } catch {
      tag = fifth;
    }
    if (!tag) return null;
    return { org, repo, tag };
  }
  if (fourth === "download" && fifth) {
    let tag: string;
    try {
      tag = decodeURIComponent(fifth);
    } catch {
      tag = fifth;
    }
    if (!tag) return null;
    return { org, repo, tag };
  }
  if (fourth === "latest") {
    return { org, repo, tag: "latest" };
  }
  return null;
}

/** Human-readable byte size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0 B";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const value = n / Math.pow(1024, idx);
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[idx]}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** True if text contains Arabic/RTL script characters. */
export function isRtl(text: string | null | undefined): boolean {
  if (!text || typeof text !== "string") return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/** All releases, newest first. */
export function getReleases(): Release[] {
  return [...releases];
}

export function getReleaseBySlug(slug: string | null | undefined): Release | undefined {
  if (!slug) return undefined;
  return releases.find((r) => r.slug === slug);
}

export function getReleasesByRepo(full_name: string | null | undefined): Release[] {
  if (!full_name) return [];
  return releases.filter((r) => r.full_name === full_name);
}

/** Sum of `download_count` across the given releases (defaults to all). */
export function totalDownloads(list: Release[] = releases): number {
  if (!Array.isArray(list)) return 0;
  let total = 0;
  for (const r of list) {
    for (const a of r?.assets || []) total += a?.download_count || 0;
  }
  return total;
}

/** Downloads for a single release. */
export function releaseDownloads(release: Release | null | undefined): number {
  if (!release || !Array.isArray(release.assets)) return 0;
  return release.assets.reduce((s, a) => s + (a?.download_count || 0), 0);
}

export type AssetIcon = "apk" | "archive" | "exe" | "dmg" | "doc" | "other";

/** Icon key from content-type / file extension. */
export function assetIcon(
  content_type: string | null | undefined,
  name: string | null | undefined,
): AssetIcon {
  const ct = (content_type || "").toLowerCase();
  const nm = (name || "").toLowerCase();

  if (nm.endsWith(".apk") || ct.includes("android")) return "apk";
  if (nm.endsWith(".exe") || nm.endsWith(".msi") || ct.includes("msdos") || ct.includes("msdownload"))
    return "exe";
  if (nm.endsWith(".dmg") || ct.includes("apple-diskimage")) return "dmg";

  const archiveExt = [".zip", ".tar.gz", ".tgz", ".tar", ".gz", ".bz2", ".xz", ".rar", ".7z"];
  if (archiveExt.some((e) => nm.endsWith(e))) return "archive";
  if (
    ct.includes("zip") ||
    ct.includes("gzip") ||
    ct.includes("x-tar") ||
    ct.includes("compressed") ||
    ct.includes("x-7z")
  )
    return "archive";

  const docExt = [".pdf", ".md", ".markdown", ".txt", ".doc", ".docx", ".odt", ".rtf"];
  if (docExt.some((e) => nm.endsWith(e))) return "doc";
  if (
    ct.includes("pdf") ||
    ct.startsWith("text/") ||
    ct.includes("msword") ||
    ct.includes("officedocument") ||
    ct.includes("markdown")
  )
    return "doc";

  return "other";
}

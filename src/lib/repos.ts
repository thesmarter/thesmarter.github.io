import data from "../data/repos.json";

export interface Org {
  login: string;
  html_url: string;
  avatar_url: string;
  repo_count: number;
}

export interface Repo {
  id: number;
  slug: string;
  org: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  description_en: string | null;
  language: string | null;
  stars: number;
  forks_count: number;
  open_issues: number;
  topics: string[];
  homepage: string | null;
  license: string | null;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  featured: boolean;
  featured_order: number | null;
  curated: boolean;
  category: string | null;
  domains: string[];
  install: string | null;
}

interface ReposFile {
  generated_at: string;
  orgs: Org[];
  projects: Repo[];
}

const file = data as ReposFile;

export const orgs: Org[] = file.orgs ?? [];
export const projects: Repo[] = file.projects ?? [];
export const generatedAt: string = file.generated_at;

/** Featured projects ordered by featured_order. */
export function getFeatured(): Repo[] {
  return projects
    .filter((p) => p.featured)
    .sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999));
}

/** Curated projects (curated !== false), featured first then stars/updated. */
export function getCurated(): Repo[] {
  return projects.filter((p) => p.curated);
}

/** Display description: prefer curated English copy, fall back to API text. */
export function displayDescription(p: Repo): string {
  return p.description_en || p.description || "";
}

export type SortKey = "stars" | "updated" | "pushed" | "name" | "featured";

export function filterRepos(
  q = "",
  org = "",
  lang = "",
  cat = "",
  hideForks = false,
  featuredOnly = false,
): Repo[] {
  const needle = q.trim().toLowerCase();
  return getCurated().filter((p) => {
    if (featuredOnly && !p.featured) return false;
    if (hideForks && p.fork) return false;
    if (org && org !== "all" && p.org !== org) return false;
    if (lang && lang !== "all" && (p.language || "Other") !== lang) return false;
    if (cat && cat !== "all" && p.category !== cat) return false;
    if (!needle) return true;
    const hay = `${p.full_name} ${p.description || ""} ${p.description_en || ""} ${(p.topics || []).join(" ")} ${p.language || ""}`.toLowerCase();
    return needle.split(/\s+/).every((w) => hay.includes(w));
  });
}

/**
 * Sort a repo list. Single-arg form `sortRepos(sort)` sorts the curated list;
 * two-arg form `sortRepos(list, sort)` sorts the given list.
 */
export function sortRepos(list: Repo[], sort?: SortKey | string): Repo[];
export function sortRepos(sort?: SortKey | string): Repo[];
export function sortRepos(first?: Repo[] | SortKey | string, second?: SortKey | string): Repo[] {
  let list: Repo[];
  let sort: string;
  if (Array.isArray(first)) {
    list = [...first];
    sort = second || "updated";
  } else {
    list = [...getCurated()];
    sort = (first as string) || "updated";
  }
  switch (sort) {
    case "stars":
      list.sort((a, b) => b.stars - a.stars || String(b.updated_at).localeCompare(String(a.updated_at)));
      break;
    case "pushed":
      list.sort((a, b) => String(b.pushed_at).localeCompare(String(a.pushed_at)));
      break;
    case "name":
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      break;
    case "featured":
      list.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          (a.featured_order ?? 999) - (b.featured_order ?? 999) ||
          b.stars - a.stars,
      );
      break;
    case "updated":
    default:
      list.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      break;
  }
  return list;
}

export interface Category {
  value: string;
  label: string;
}

export const categories: Category[] = [
  { value: "payments-fintech", label: "Payments & Fintech" },
  { value: "islamic", label: "Islamic" },
  { value: "laravel-php", label: "Laravel & PHP" },
  { value: "medical", label: "Medical" },
  { value: "erp-commerce", label: "ERP & Commerce" },
  { value: "devops-infra", label: "DevOps & Infra" },
  { value: "web-mobile-starter", label: "Web & Mobile Starters" },
];

export function categoryLabel(value: string | null): string {
  if (!value) return "Uncategorized";
  return categories.find((c) => c.value === value)?.label || value;
}

/** Unique languages across all projects, sorted (null -> "Other" last-ish). */
export const languages: string[] = Array.from(
  new Set(projects.map((p) => p.language || "Other")),
).sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));

export const orgLogins: string[] = orgs.map((o) => o.login);

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

import rss from "@astrojs/rss";
import reposRaw from "../data/repos.json";

const SITE = "https://thesmarter.github.io";

function list(): any[] {
  const r = reposRaw as unknown as any;
  if (Array.isArray(r)) return r;
  return r?.repos ?? r?.items ?? [];
}

function norm(r: any, i: number) {
  const slug = String(
    r.slug ?? r.name?.toLowerCase?.().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ?? `repo-${i}`
  );
  const org = String(r.org ?? r.owner ?? r.fullName?.split("/")?.[0] ?? r.full_name?.split("/")?.[0] ?? "thesmarter");
  const name = String(r.name ?? r.fullName?.split("/")?.pop() ?? slug);
  return {
    slug,
    title: String(r.fullName ?? r.full_name ?? `${org}/${name}`),
    description: String(r.description ?? "Open-source project from Smart Team."),
    url: String(r.url ?? r.html_url ?? `https://github.com/${org}/${name}`),
    pubDate: new Date(String(r.updatedAt ?? r.updated_at ?? r.pushed_at ?? Date.now())),
  };
}

export async function GET(context: { site?: URL | string }) {
  const site = String(context?.site ?? SITE);
  const items = list()
    .map(norm)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 40)
    .map((r) => ({
      title: r.title,
      description: r.description,
      link: `/repos/${r.slug}/`,
      pubDate: r.pubDate,
    }));

  return rss({
    title: "Smart Team — Open Source Hub",
    description: "Latest updated repositories from Smart Team (thesmarter, AdaaSystem, DetaElectPro).",
    site,
    items,
    customData: `<language>en</language>`,
  });
}

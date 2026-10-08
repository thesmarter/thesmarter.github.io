import rss from "@astrojs/rss";
import { projects, displayDescription } from "../lib/repos";

export async function GET(context: { site?: URL | string }) {
  const site = String((context as any)?.site ?? "https://thesmarter.github.io");
  const items = [...projects]
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, 40)
    .map((p) => ({
      title: p.full_name,
      description: displayDescription(p),
      link: `/repos/${p.slug}/`,
      pubDate: new Date(p.updated_at || p.pushed_at || Date.now()),
    }));

  return rss({
    title: "Smart Team — Open Source Hub",
    description: "Latest updated repositories from Smart Team (thesmarter, AdaaSystem, DetaElectPro).",
    site,
    items,
    customData: `<language>en</language>`,
  });
}

import { projects, displayDescription } from "../lib/repos";

export async function GET() {
  const items = [...projects]
    .sort((a, b) => b.stars - a.stars)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      description: displayDescription(p).slice(0, 280),
      topics: (p.topics || []).slice(0, 12),
      language: p.language || "",
      stars: p.stars,
      updated: p.updated_at || p.pushed_at || "",
    }));

  return new Response(JSON.stringify(items), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

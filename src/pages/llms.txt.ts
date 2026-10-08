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
  const name = String(r.name ?? slug);
  return {
    slug,
    name: String(r.fullName ?? r.full_name ?? `${org}/${name}`),
    description: String(r.description ?? "Open-source project from Smart Team."),
    url: String(r.url ?? r.html_url ?? `https://github.com/${org}/${name}`),
    language: String(r.language ?? r.primaryLanguage ?? "TypeScript"),
    org,
  };
}

export async function GET() {
  const repos = list()
    .map(norm)
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  lines.push(`# Smart Team — Open Source Hub`);
  lines.push(``);
  lines.push(`> Smart Team is an open-source collective across three GitHub organizations — thesmarter (core platform), AdaaSystem (ERP and business systems), and DetaElectPro (medical and electrophysiology) — maintaining 40 public repositories with permissive licenses, docs, and live demos.`);
  lines.push(``);
  lines.push(`## Organizations`);
  lines.push(``);
  lines.push(`- [thesmarter](https://github.com/thesmarter): core platform, tooling, and shared libraries.`);
  lines.push(`- [AdaaSystem](https://github.com/AdaaSystem): ERP and business systems (HR, accounting, inventory).`);
  lines.push(`- [DetaElectPro](https://github.com/DetaElectPro): medical and electrophysiology tooling.`);
  lines.push(``);
  lines.push(`## Projects`);
  lines.push(``);
  lines.push(`Browse the catalog at ${SITE}/#catalog. Machine index at ${SITE}/search-index.json.`);
  lines.push(``);
  for (const r of repos) {
    lines.push(`- [${r.name}](${SITE}/repos/${r.slug}/): ${r.description} [code](${r.url})`);
  }
  lines.push(``);
  lines.push(`## Contribute`);
  lines.push(``);
  lines.push(`- Fork, branch, and open a PR with \`gh pr create\`. Guide: ${SITE}/#contribute`);
  lines.push(``);
  lines.push(`## FAQ`);
  lines.push(``);
  lines.push(`- What is Smart Team? An open collective across 3 orgs. Full answers: ${SITE}/faq/`);
  lines.push(`- Licenses? Mostly MIT/Apache-2.0; each repo declares its LICENSE.`);
  lines.push(`- Security? Report privately via SECURITY.md, never via public issues.`);
  lines.push(``);
  lines.push(`## Links`);
  lines.push(``);
  lines.push(`- Catalog: ${SITE}/#catalog`);
  lines.push(`- FAQ: ${SITE}/faq/`);
  lines.push(`- RSS: ${SITE}/rss.xml`);
  lines.push(`- Full corpus: ${SITE}/llms-full.txt`);
  lines.push(``);

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

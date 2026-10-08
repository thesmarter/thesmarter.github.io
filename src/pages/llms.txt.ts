import { projects, displayDescription } from "../lib/repos";

const SITE = "https://thesmarter.github.io";

export async function GET() {
  const repos = [...projects].sort((a, b) => a.full_name.localeCompare(b.full_name));

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
  for (const p of repos) {
    lines.push(`- [${p.full_name}](${SITE}/repos/${p.slug}/): ${displayDescription(p)} [code](${p.html_url})`);
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

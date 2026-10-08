import { projects, displayDescription } from "../lib/repos";

const SITE = "https://thesmarter.github.io";

const FAQS: Array<[string, string]> = [
  ["What is Smart Team?", "An open-source collective across thesmarter (core), AdaaSystem (ERP), and DetaElectPro (medical), maintaining 40 public repos."],
  ["Where based?", "Distributed, remote-first with roots in Sudan; coordination happens openly on GitHub."],
  ["What projects?", "Developer tooling, Astro starters, ERP modules (HR/inventory/accounting), medical signal tooling, mobile apps, automation."],
  ["How contribute?", "Fork, branch (fix/short-name), test, push, then gh pr create. Start with good-first-issue labels."],
  ["Licenses?", "Mostly MIT/Apache-2.0; some ERP/medical packages use copyleft or custom terms. Each repo has a LICENSE file."],
  ["Commercial support?", "Yes — deployment, customization, training, SLAs. Open an issue tagged commercial-support on the relevant repo."],
  ["Security report?", "Report privately via SECURITY.md or GitHub private vulnerability reporting. Acknowledged within 72 hours."],
];

export async function GET() {
  const repos = [...projects].sort((a, b) => b.stars - a.stars);

  const out: string[] = [];
  out.push(`# Smart Team — Open Source Hub (full corpus)`);
  out.push(``);
  out.push(`> Complete machine-readable guide to Smart Team's 40 public repositories across thesmarter, AdaaSystem, and DetaElectPro: what each project does, its language and topics, where to clone it, how to contribute, and how to get support.`);
  out.push(``);
  out.push(`## Organizations`);
  out.push(``);
  out.push(`- [thesmarter](https://github.com/thesmarter): core platform, developer tooling, shared libraries, this hub.`);
  out.push(`- [AdaaSystem](https://github.com/AdaaSystem): ERP and business systems — HR, accounting, inventory, workflow automation.`);
  out.push(`- [DetaElectPro](https://github.com/DetaElectPro): medical and electrophysiology — signal acquisition, visualization, clinical utilities.`);
  out.push(``);
  out.push(`## Projects`);
  out.push(``);
  for (const p of repos) {
    out.push(`### [${p.full_name}](${SITE}/repos/${p.slug}/)`);
    out.push(``);
    out.push(`- Description: ${displayDescription(p)}`);
    out.push(`- Code: ${p.html_url}`);
    if (p.homepage) out.push(`- Demo: ${p.homepage}`);
    out.push(`- Language: ${p.language || "Other"} | Stars: ${p.stars} | Org: ${p.org} | Updated: ${p.updated_at || "n/a"}`);
    if (p.topics?.length) out.push(`- Topics: ${p.topics.join(", ")}`);
    out.push(`- Clone: \`${p.install || `git clone ${p.html_url}.git`}\``);
    out.push(``);
  }
  out.push(`## Contribute`);
  out.push(``);
  out.push(`1. \`git clone https://github.com/thesmarter/thesmarter.github.io.git\``);
  out.push(`2. \`cd thesmarter.github.io && npm install && npm run dev\``);
  out.push(`3. Branch, commit small, push, then \`gh pr create --title "feat: ..."\``);
  out.push(`4. Green CI + review = merge. Full guide: ${SITE}/#contribute`);
  out.push(``);
  out.push(`## FAQ`);
  out.push(``);
  for (const [q, a] of FAQS) {
    out.push(`### ${q}`);
    out.push(``);
    out.push(a);
    out.push(``);
  }
  out.push(`## Links`);
  out.push(``);
  out.push(`- Site: ${SITE}/`);
  out.push(`- Catalog: ${SITE}/#catalog`);
  out.push(`- FAQ: ${SITE}/faq/`);
  out.push(`- RSS: ${SITE}/rss.xml`);
  out.push(`- Search index: ${SITE}/search-index.json`);
  out.push(`- Compact AI index: ${SITE}/llms.txt`);
  out.push(``);

  return new Response(out.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

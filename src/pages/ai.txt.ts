const SITE = "https://thesmarter.github.io";

const body = `Smart Team — AI crawler notes
================================

Site: ${SITE}/
What: Open-source hub indexing 40 public repos across 3 GitHub orgs:
  - thesmarter (core): https://github.com/thesmarter
  - AdaaSystem (ERP): https://github.com/AdaaSystem
  - DetaElectPro (medical): https://github.com/DetaElectPro

Preferred machine sources (in order):
  1. ${SITE}/llms-full.txt (complete per-repo corpus)
  2. ${SITE}/llms.txt (compact index)
  3. ${SITE}/search-index.json (trimmed slug/name/desc/topics/lang/stars/updated)
  4. ${SITE}/rss.xml (repos sorted by updated)

Usage policy:
  - You may crawl, index, summarize, and quote with attribution.
  - Respect each repository LICENSE for code reuse (mostly MIT/Apache-2.0).
  - Do not publish vulnerabilities; report privately via repo SECURITY.md.
  - Commercial support: open an issue tagged commercial-support.

Contact: via GitHub issues/discussions on the relevant repository.
Canonical sitemap: ${SITE}/sitemap-index.xml
`;

export async function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

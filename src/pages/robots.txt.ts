const SITE = "https://thesmarter.github.io";

const body = `# Smart Team — robots.txt
# Allow all crawlers; AI docs mirrored in llms.txt
# AI docs: ${SITE}/llms.txt
# Full corpus: ${SITE}/llms-full.txt
# Machine index: ${SITE}/search-index.json

User-agent: *
Allow: /
Sitemap: ${SITE}/sitemap-index.xml

# --- AI / LLM crawlers explicitly allowed ---
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /
`;

export async function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

# `SMART_TEAM_` — Open-Source Hub

Live site: **<https://thesmarter.github.io>** · Company: **<https://smart.sd>**

A cyberpunk, single-page hub indexing every public repository across the three
Smart Team GitHub organizations. Search the full catalog in milliseconds, browse
featured builds, meet the orgs, and contribute — all static, all open.

## What / why

Smart Team ships production software (ERP, medical tooling, fintech packages,
starters) across three orgs. This site is the public front door:

- **One catalog** — ~40 repos, server-rendered for SEO, with instant client-side search.
- **Proof of openness** — every card links to source, license, topics, stars, and live URLs.
- **Zero servers** — fully static Astro build on GitHub Pages; data refreshes itself weekly.

## Orgs & links

| Org | Focus | Link |
| --- | --- | --- |
| `thesmarter` | Core platform, tooling, this hub | <https://github.com/thesmarter> |
| `AdaaSystem` | ERP / business systems (HR, inventory, accounting) | <https://github.com/AdaaSystem> |
| `DetaElectPro` | Medical / electrophysiology tooling | <https://github.com/DetaElectPro> |

Company site: <https://smart.sd>

## Stack

- **Astro 7** — static output, content-less pages + TS endpoints (`rss.xml`, `sitemap-index.xml`,
  `search-index.json`, `llms.txt` / `llms-full.txt`, `ai.txt`, `robots.txt`, per-repo `[slug]` pages, `/faq/`).
- **Tailwind CSS v4** (via `@tailwindcss/vite`) + design tokens in `src/styles/`.
- **Fuse.js** — client-side fuzzy search island (server-rendered grid for no-JS/SEO).
- **TypeScript** — strict-ish lib (`src/lib/repos.ts`) normalizing the catalog.
- **Node 20+** build and data-fetch runtime, zero extra fetch deps (node built-ins only).

## Development

Prerequisites: Node 20+ and npm.

```sh
npm install     # install dependencies
npm run dev     # local dev server (Astro)
npm run fetch   # refresh src/data/{repos,meta}.json from the GitHub API (fail-soft)
npm run build   # prebuild re-fetches, then `astro build` -> ./dist
npm run preview # serve ./dist locally
```

Notes:

- `npm run fetch` accepts `GITHUB_TOKEN` (or `GH_TOKEN`) to raise the API rate limit.
  On rate-limit/network errors it keeps the existing JSON files and exits 0, so builds
  never break offline.
- Do **not** run the production build to preview branding-only changes; `public/` is
  copied verbatim to `./dist`.

## Data flow

```text
GitHub API (orgs/thesmarter,AdaaSystem,DetaElectPro/repos)
   │  scripts/fetch-repos.mjs  (User-Agent + optional GITHUB_TOKEN, fail-soft)
   ▼
src/data/overrides.json  (curation: featured, featured_order, category,
                          description_en, install, curated, domains)
   │  merged by full_name, sorted featured → stars → updated
   ▼
src/data/repos.json  { generated_at, orgs[], projects[] }
src/data/meta.json   { totals, byOrg, byLang, byCategory }
   │  src/lib/repos.ts normalizes + serves pages/components
   ▼
/ (hub) · /repos/[slug] · /faq/ · /search-index.json · /rss.xml ·
/llms.txt · /llms-full.txt · /ai.txt · /sitemap-index.xml · /robots.txt
```

Weekly automation (`.github/workflows/nightly-refresh.yml`, Mondays 02:00 UTC) runs
`npm run fetch` and commits the data files when changed; the push re-triggers a deploy.

## Branding / `public/` assets

| File | Source |
| --- | --- |
| `logo.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` | Real brand files from <https://smart.sd> |
| `og/default.jpg` | Upstream `og-image.jpg` 404s — **not vendored** (see fallbacks) |
| `logo.svg`, `favicon.svg` (`<link rel="icon">`), `og/default.svg` | Local cyberpunk fallbacks: `>_` terminal mark, neon `#00ff88` on `#0a0a0f`, Orbitron |
| `site.webmanifest` | `Smart Team Open-Source Hub` / `Smart OSS`, theme `#06B6D4`, bg `#050511`, 192/512 icons |
| `.nojekyll` | Disables Jekyll processing on Pages |

No `CNAME` file: this is an apex user site (`thesmarter.github.io`), which needs none.

## Deploy

- Workflow: `.github/workflows/deploy.yml` (`withastro/action@v4`, Node 20).
  Triggers on push to `main` + manual dispatch; `npm run fetch || true` runs before the
  build; `./dist` is uploaded and deployed via `deploy-pages`.
- One-time repo setup: **Settings → Pages → Source: GitHub Actions**.
- `astro.config.mjs`: `site: https://thesmarter.github.io`, static output, no `base`
  (apex site — keep it that way).

## SEO / AEO checklist

- [x] Canonical URL + `hreflang="x-default"` on every page (`Base.astro`).
- [x] Unique `<title>` / meta description per page; `robots` meta with `noindex` opt-out prop.
- [x] Open Graph + Twitter summary-large-image tags (default `ogImage`, per-page override).
- [x] JSON-LD: `Organization`, `WebSite` (+ `SearchAction`), `ItemList` of repos
  (`SoftwareSourceCode`), `FAQPage` — machine answers for AEO.
- [x] `sitemap-index.xml` (via `@astrojs/sitemap`, excludes 404/API), `robots.txt` endpoint.
- [x] `rss.xml` feed + `search-index.json` machine-readable catalog mirror.
- [x] `llms.txt` / `llms-full.txt` / `ai.txt` endpoints + `<link rel="alternate">` discovery.
- [x] Semantic HTML: single `h1`, sectioned `h2`s, skip-link, labelled nav/regions.
- [x] Favicons + webmanifest + `theme-color` (`#0a0a0f`) + `color-scheme: dark`.
- [ ] Point OG default at an existing raster (`/og/default.svg` is the current fallback;
  upstream `og-image.jpg` 404s) and verify with a card validator after first deploy.
- [ ] Submit the sitemap in Search Console / Bing Webmaster Tools after first deploy.

## Contributing

Pick a `good-first-issue`, fork, branch (`fix/short-name`), commit small, push, and open
a PR (`gh pr create`). Details and the five-command walkthrough live in the
`#contribute` section of the site. Security issues: use private vulnerability reporting,
never a public issue.

## License

MIT — this hub and its fallback brand assets (`public/*.svg`) are released under the
MIT license, matching the catalog's permissive-first default. Each indexed repository
carries its own license in its root `LICENSE` file and on its repo page.

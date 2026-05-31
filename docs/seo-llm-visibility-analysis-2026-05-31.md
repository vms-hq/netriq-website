---
title: "NetrIQ.ai — SEO & LLM-Agent Visibility: Analysis and P0 Implementation"
author: "NetrIQ Engineering"
date: "2026-05-31"
---

# NetrIQ.ai — SEO & LLM-Agent Visibility

**Site:** https://netriq.ai · **Repo:** `netriq-website` (static HTML on GitHub Pages, Cloudflare DNS) · **Date:** 2026-05-31

## 1. Context — why this work

`netriq.ai` had solid on-page basics (unique `<title>` + `<meta description>` per page, `robots.txt`, `sitemap.xml`, favicon) but was effectively invisible to the two channels that now drive B2B discovery:

1. **Search-engine rich results** — *zero* structured data, no canonical tags, no Open Graph / Twitter cards, no `lastmod`. Google/Bing could not build an entity for "NetrIQ", deduplicate apex vs `www`, or render a rich snippet.
2. **LLM answer engines** (ChatGPT/Claude/Perplexity/Gemini search) — no `llms.txt`, no machine-readable entity graph, no preview card to cite. Asked "what is NetrIQ", an agent had only raw prose to work from.

This document records the gap analysis, the P0 fixes shipped, and the live portals + thresholds we now measure against.

## 2. Gap analysis (before)

| Surface | Before | Impact |
|---|---|---|
| Title / meta description | Present, unique | OK |
| Canonical | None | apex vs `www` dilution, duplicate-URL risk |
| Open Graph / Twitter | None | no social/LLM preview card |
| JSON-LD structured data | None | no rich results, no entity, weak LLM grounding |
| `og:image` | None | no preview thumbnail anywhere |
| `llms.txt` / `llms-full.txt` | None | no curated source for LLM agents |
| `robots.txt` | Basic | didn't explicitly welcome AI crawlers |
| `sitemap.xml` | No `lastmod` | crawlers couldn't judge freshness |
| Core Web Vitals | Unmeasured | unknown ranking-factor baseline |

## 3. What shipped (P0)

**On-page metadata** — every indexable page (`index`, `platform`, `verticals`, `why-netriq`, `contact`) now carries: `rel=canonical`, `robots` (`max-image-preview:large`), `theme-color`, full Open Graph (`type/site_name/locale/url/title/description/image` + dimensions + alt), and Twitter `summary_large_image`. `404.html` is set `noindex`.

**Structured data (JSON-LD)** — grounded only in true facts (legal entity **Nysha Technologies**, brand **NetrIQ**, `leads@netriq.ai`, +91 94825 14646, India):

- `Organization` + `WebSite` (home) — establishes the entity with logo, contact point, area served.
- `SoftwareApplication` + `BreadcrumbList` (platform) — category `SecurityApplication`, full `featureList`.
- `BreadcrumbList` + `ItemList` of the 9 verticals (verticals).
- `FAQPage` + `BreadcrumbList` (why-netriq) — backed by a **new visible FAQ section** so markup matches on-page content (Google policy).
- `ContactPage` + `BreadcrumbList` (contact).

**LLM-agent surface** — `llms.txt` (curated index per the llmstxt.org convention) and `llms-full.txt` (full distilled content for retrieval), both served from the site root.

**Preview imagery** — branded 1200×630 `og:image` (`assets/og/netriq-card.png`) sitewide; a product-screenshot card (`netriq-platform.png`) on the Platform page; a 512px raster logo for the `Organization` schema.

**Crawl directives** — `robots.txt` now explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended and CCBot, and points at the sitemap; `sitemap.xml` gained `<lastmod>`.

**Continuous measurement** — `scripts/seo_check.py` (stdlib-only) validates every page's canonical/OG/Twitter/JSON-LD, the llms files, robots and sitemap, and — against the live URL — pulls Core Web Vitals + Lighthouse scores from the PageSpeed Insights API. Wired into `.github/workflows/seo-check.yml` (PR gate + weekly live run). Baseline local run: **41/41 checks pass**.

## 4. Live portals & target thresholds

These are the dashboards that expose real, third-party data for the site. **Instant** ones validate the moment the change deploys; **accruing** ones build data over days.

### Instant (validate on deploy)

| Portal | URL | Pass criteria |
|---|---|---|
| Google Rich Results Test | search.google.com/test/rich-results | Organization, SoftwareApplication, FAQ, Breadcrumb detected; 0 errors |
| Schema.org Validator | validator.schema.org | 0 errors across all pages |
| PageSpeed Insights | pagespeed.web.dev | Performance ≥ 90 (mobile), SEO = 100, CWV all green (LCP < 2.5s, CLS < 0.1, INP < 200ms) |
| OpenGraph debugger | opengraph.xyz | Branded card renders, correct title/description |
| LinkedIn Post Inspector | linkedin.com/post-inspector | Card renders (re-scrape clears cache) |
| X Card Validator | (X dev cards tool) | `summary_large_image` renders |
| llms.txt reachability | `curl https://netriq.ai/llms.txt` | HTTP 200, valid markdown |

### Accruing (stand up now, read over days/weeks)

| Portal | What it exposes | Target |
|---|---|---|
| Google Search Console | Impressions, clicks, avg position, coverage, rich-result enhancements | Sitemap "Success"; all 5 pages indexed; rich results "Valid"; impressions trending up |
| Bing Webmaster Tools | Index coverage, sitemap status (also feeds ChatGPT/Copilot grounding) | Sitemap accepted; pages indexed |
| AI answer-engine spot-check | Whether netriq.ai is cited by ChatGPT / Claude / Perplexity / Gemini | "What is NetrIQ?" / "VMS for existing CCTV in India" cites or names netriq.ai after crawl |

**Verification cadence:** instant portals at deploy and on every content change; GSC/Bing weekly for the first month then monthly; AI spot-check monthly. The GitHub Action runs the automated subset weekly and on every PR.

## 5. Owner actions still required (non-blocking)

1. **Search Console + Bing verification** — provide the verification tokens (added as `<meta>` tags in `index.html`, placeholders already in place) **and** add the matching DNS TXT records in Cloudflare (belt-and-suspenders, covers apex + `www`). Then submit `sitemap.xml` in both consoles.
2. **`sameAs` profiles** — confirm any public social profiles to add to the `Organization` schema (omitted for now — none confirmed).
3. **Optional `PAGESPEED_API_KEY`** repo secret for un-throttled CI PageSpeed runs.

## 6. Expected outcome

A correct entity in Google's/Bing's graph, eligibility for FAQ / breadcrumb / sitelink rich results, branded preview cards on every share and LLM citation, an authoritative `llms.txt` for answer engines, and a measured Core-Web-Vitals baseline — all continuously regression-checked in CI.

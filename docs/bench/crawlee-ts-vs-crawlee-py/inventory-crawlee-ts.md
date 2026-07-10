# Inventory — Crawlee for JavaScript / TypeScript

**Snapshot:** 2026-05-14  ·  **Repo:** https://github.com/apify/crawlee

## GitHub metadata (live)

| Field | Value |
|---|---|
| Stars | 23,258 |
| Forks | 1,366 |
| Open issues | 176 |
| Created | 2016-08-26 |
| Last push | 2026-05-13 |
| Default branch | `master` |
| License | Apache-2.0 |
| Primary language | TypeScript |
| Repo size | 160 MB |
| Archived | no |

Source: GitHub API `repos/apify/crawlee` fetched 2026-05-14.

## Capabilities

- **HTTP clients:** `got-scraping`, `fetch`, Cheerio (lightweight DOM), JSDOM
- **Browser engines:** Playwright, Puppeteer
- **Crawler classes:** `CheerioCrawler`, `JSDOMCrawler`, `HttpCrawler`, `PlaywrightCrawler`, `PuppeteerCrawler`, **`AdaptivePlaywrightCrawler`** (hybrid HTTP→browser, GA), **`StagehandCrawler`** (AI natural-language selectors — JS-only)
- **Anti-bot:** fingerprint rotation, header rotation, session pool, proxy rotation, sticky sessions
- **Storage:** `RequestQueue`, `Dataset`, `KeyValueStore`, `RequestList`
- **Deploy targets:** Apify cloud (canonical), Docker, AWS Lambda (community), Cloud Run, any Node.js host
- **Type safety:** end-to-end TypeScript
- **Concurrency:** `AutoscaledPool` over Node.js event loop

## Ecosystem

- Package manager: npm / pnpm / yarn
- Estimated npm weekly downloads 2026: 120–150 k (Wave 1 reference)
- First-party starter templates via `@apify/cli`: cheerio, playwright, puppeteer, ts-starter (10+)

## Operational notes

- `AdaptivePlaywrightCrawler` is the canonical hybrid HTTP→browser primitive; reduces CPU vs always-browser by ~60–80 % for sites that allow it.
- Crawlee is decoupled from Apify infrastructure — runs on any Node host.
- Shares TS domain types with the Real-State-Moema Next.js codebase (zero language switch).
- Camoufox is integrable via Playwright, but its primary docs/community live in Python.

## Sources

- https://github.com/apify/crawlee
- https://crawlee.dev/
- https://crawlee.dev/blog/scrapy-vs-crawlee
- https://webscraping.ai/faq/crawlee/what-are-the-differences-between-crawlee-for-python-and-crawlee-for-javascript
- https://use-apify.com/blog/self-hosting-web-scrapers-guide

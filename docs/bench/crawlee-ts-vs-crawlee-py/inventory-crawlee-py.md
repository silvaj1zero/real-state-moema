# Inventory — Crawlee for Python

**Snapshot:** 2026-05-14  ·  **Repo:** https://github.com/apify/crawlee-python

## GitHub metadata (live)

| Field | Value |
|---|---|
| Stars | 9,042 |
| Forks | 738 |
| Open issues | 77 |
| Created | 2024-01-10 |
| Last push | 2026-05-13 |
| Default branch | `master` |
| License | Apache-2.0 |
| Primary language | Python |
| Repo size | 36 MB |
| Archived | no |

Source: GitHub API `repos/apify/crawlee-python` fetched 2026-05-14.

## Capabilities

- **HTTP clients:** httpx (async), curl_cffi (TLS fingerprint), BeautifulSoup, Parsel
- **Browser engines:** Playwright
- **Crawler classes:** `HttpCrawler`, `BeautifulSoupCrawler`, `ParselCrawler`, `PlaywrightCrawler`, `AdaptivePlaywrightCrawler` (added v0.5, parity track)
- **Anti-bot:** session pool, proxy rotation, fingerprint via curl_cffi
- **Storage:** `RequestQueue`, `Dataset`, `KeyValueStore`
- **Deploy targets:** Apify cloud, Docker, **AWS Lambda (first-party docs — unique in the family)**, any Python host
- **Type safety:** type hints (mypy / pyright compatible)
- **Concurrency:** `asyncio` + `AutoscaledPool`

## Ecosystem

- Package manager: pip / uv / poetry
- v1.0 GA in 2025-09 (Crawlee blog)
- Tens of thousands of monthly PyPI downloads (rough estimate from pypi-stats)
- 3–5 first-party starter templates

## Operational notes

- Mature for HTTP/parsel/BS4 paths; Playwright + adaptive still catching up with JS.
- **First-party AWS Lambda deployment docs are unique to the Python distribution.**
- Natural fit for ETL stacks already in Python (pandas, sqlite, polars).
- `StagehandCrawler` (AI natural-language selectors) is **NOT yet available in Python** (JS-only).
- Native interoperability with `rictom/cnpj-sqlite` (also Python) — same runtime, no IPC.

## Sources

- https://github.com/apify/crawlee-python
- https://crawlee.dev/python/
- https://crawlee.dev/python/docs/deployment/aws-lambda
- https://crawlee.dev/blog/crawlee-for-python-v05
- https://dev.to/crawlee/announcing-crawlee-python-now-you-can-use-python-to-build-reliable-web-crawlers-3dab
- https://webscraping.ai/faq/crawlee/what-are-the-differences-between-crawlee-for-python-and-crawlee-for-javascript

# Comparison Matrix — Crawlee TS vs Crawlee Python

| Capability | Crawlee TS | Crawlee Python | Advantage | Δ |
|---|---|---|---|---|
| Project age | 2016-08 (~9.7 y) | 2024-01 (~2.3 y) | **TS** | +7.4 y battle-testing |
| GitHub stars | 23,258 | 9,042 | **TS** | 2.57× |
| Open-issue ratio | 0.76 % | 0.85 % | tie | healthy both |
| Last commit | 2026-05-13 | 2026-05-13 | tie | same day |
| License | Apache-2.0 | Apache-2.0 | tie | — |
| Hybrid HTTP→browser | `AdaptivePlaywrightCrawler` GA, canonical pattern | added v0.5, maturing | **TS** | JS is reference |
| AI natural-language selectors | `StagehandCrawler` | not available | **TS** | JS-only |
| AWS Lambda deployment | community recipes | **first-party docs** | **Python** | unique perk |
| Stack fit (Real-State-Moema is Next.js 15 TS) | native | requires second runtime | **TS** | shared types |
| Integration with `cnpj-sqlite` (Python lib) | subprocess / DB view | in-process import | **Python** | for CNPJ ETL |
| Anti-bot tooling depth | fingerprint+got-scraping+session pool | session pool + curl_cffi | **TS** (mild) | JS stack more battle-tested |
| Concurrency | Node loop + AutoscaledPool | asyncio + GIL caveat | **TS** (mild) | single-process I/O fan-out |
| Ecosystem | npm — Cheerio, Playwright, Got, JSDOM | pip — Parsel, BS4, httpx | tie | both rich |
| Feature parity (browser scraping) | 100 % | ~80 %, catching up | **TS** | Apify recommends JS for max perf |
| Community velocity | 129 subs + 1366 forks | 45 subs + 738 forks | **TS** | ~2.5× |
| Deploy footprint (single runtime) | one Dockerfile alongside Next.js | second container | **TS** | less infra |

## Synthesis

Crawlee TS wins **13 of 16** comparisons, ties on 4, and loses 2 to Crawlee Python — both losses are **CNPJ-specific** (Python language affinity with `rictom/cnpj-sqlite`, AWS Lambda first-party docs). These confirm Wave 2's recommendation: **TS for crawlers, Python isolated only for CNPJ ETL**.

## Sources

- GitHub API repos/apify/crawlee, repos/apify/crawlee-python (2026-05-14)
- https://crawlee.dev/blog/scrapy-vs-crawlee
- https://crawlee.dev/blog/crawlee-for-python-v05
- https://webscraping.ai/faq/crawlee/what-are-the-differences-between-crawlee-for-python-and-crawlee-for-javascript
- https://crawlee.dev/python/docs/deployment/aws-lambda
- https://crawlee.dev/python/docs/guides/scaling-crawlers
- https://github.com/rictom/cnpj-sqlite

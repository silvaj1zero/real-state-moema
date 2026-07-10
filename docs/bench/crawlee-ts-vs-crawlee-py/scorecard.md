# Scorecard — Crawlee TS vs Crawlee Python

**Scale:** 0–100 (100 = ideal for this project · 50 = workable · 0 = blocker)
**Context:** Epic 7 scraping in Real-State-Moema (Next.js 15 + Supabase); Python kept only for CNPJ ETL.

| Dimension | Weight | Crawlee TS | Crawlee Python | Δ | Evidence |
|---|---|---|---|---|---|
| Maturity | 0.15 | **95** | 70 | +25 | 9.7 y vs 2.3 y, 23k vs 9k stars; v1.0 Python only Sep-2025 |
| Developer experience | 0.10 | **90** | 82 | +8 | TS edges via Stagehand + larger template gallery |
| Stack fit (Next.js 15 TS) | 0.15 | **100** | 35 | +65 | Shared types/build; Python = 2nd runtime |
| Ecosystem (npm vs pip) | 0.10 | 88 | 85 | +3 | Both rich, near tie |
| Hybrid HTTP→browser | 0.10 | **95** | 75 | +20 | Adaptive GA in JS, maturing in Python |
| Integration `cnpj-sqlite` | 0.10 | 60 | **95** | −35 | Python in-process |
| Deploy footprint | 0.10 | **92** | 70 | +22 | Single runtime vs two containers |
| Anti-bot capability | 0.10 | **88** | 78 | +10 | got-scraping fingerprints more battle-tested |
| Community velocity | 0.10 | **92** | 78 | +14 | 129+1366 vs 45+738 |

### Weighted total

| Subject | Score |
|---|---|
| **Crawlee TypeScript** | **89.75** |
| Crawlee Python | 72.05 |
| **Δ** | **+17.70 pts in favor of TS** |

## Verdict

**CONFIRM** the Wave 2 winner. The decisive dimensions (stack fit, hybrid pattern, maturity, deploy footprint) all favor TS. Python keeps a clean 35-point advantage in `cnpj-sqlite` integration, which validates the dual-runtime split: **TS for crawlers, Python isolated for CNPJ.**

## Sources

- GitHub API 2026-05-14 (apify/crawlee, apify/crawlee-python)
- https://crawlee.dev/blog/scrapy-vs-crawlee
- https://crawlee.dev/blog/crawlee-for-python-v05
- https://webscraping.ai/faq/crawlee/what-are-the-differences-between-crawlee-for-python-and-crawlee-for-javascript
- https://github.com/rictom/cnpj-sqlite
- https://crawlee.dev/python/docs/deployment/aws-lambda
- https://crawlee.dev/python/docs/guides/scaling-crawlers

# Executive Report — Crawlee TS vs Crawlee Python

**Bench ID:** BENCH-01-crawlee-ts-vs-crawlee-py
**Date:** 2026-05-14
**Author:** spy-bench-analyst (Phase 3)
**Wave 2 suggested winner:** Crawlee TypeScript
**Verdict:** **CONFIRM** · confidence **High**

---

## TL;DR

Crawlee TypeScript wins **13 of 16** capability comparisons and scores **89.75 vs 72.05** (+17.7 pts) on the weighted scorecard. The decisive dimensions — stack fit (+65), maturity (+25), deploy footprint (+22) — all align with Real-State-Moema's Next.js 15 + Supabase substrate. Crawlee Python's only wins are **bounded to the CNPJ ETL subsystem** (in-process `rictom/cnpj-sqlite`, first-party AWS Lambda docs), which exactly matches Wave 2's dual-runtime split.

---

## Decision

| | Value |
|---|---|
| Crawlers (MercadoLivre, ImovelWeb, ZAP, OLX, VivaReal new sources) | **Crawlee TypeScript** |
| CNPJ ETL (rictom/cnpj-sqlite consumer) | **Python (Crawlee Python optional, plain Python script likely enough)** |
| Bridge | Supabase materialized views / DB tables |
| Lock-in | Soft. Both libraries are Apache-2.0 and run anywhere Node/Python runs |

---

## Quantitative summary

| Dimension | Weight | TS | PY | Δ |
|---|---|---|---|---|
| Maturity | 15% | 95 | 70 | +25 |
| Developer experience | 10% | 90 | 82 | +8 |
| Stack fit Next.js 15 TS | 15% | 100 | 35 | **+65** |
| Ecosystem npm vs pip | 10% | 88 | 85 | +3 |
| Hybrid HTTP→browser | 10% | 95 | 75 | +20 |
| Integration cnpj-sqlite | 10% | 60 | 95 | **−35** |
| Deploy footprint | 10% | 92 | 70 | +22 |
| Anti-bot capability | 10% | 88 | 78 | +10 |
| Community velocity | 10% | 92 | 78 | +14 |
| **Total** | **100%** | **89.75** | **72.05** | **+17.7** |

---

## Qualitative highlights

- **TS is the canonical reference implementation** for Crawlee. Adaptive hybrid pattern, Stagehand AI-selector layer and richest template gallery are all JS-only (as of 2026-05).
- **Python is catching up but isn't there yet.** v1.0 GA only landed in September 2025; Apify itself recommends JS for max throughput/concurrency.
- **The only structurally Python-leaning gap is `cnpj-sqlite` affinity**, which is already isolated in the architecture by Wave 2.

---

## Cross-source consistency

No contradiction found across Wave 1, Wave 2, and Phase 3 sources. Three independent sources (Apify's own blog, WebScraping.AI FAQ, and live GitHub metrics on 2026-05-14) converge on the TS-as-canonical conclusion.

---

## Recommendation (P0 / P1 / P2)

| Priority | Action |
|---|---|
| **P0** | Lock Crawlee TS as crawler runtime in PRD Epic 7 (Wave A & B). Scaffold under `packages/crawler/` or `apps/crawler/` |
| **P0** | Keep Python container for CNPJ ETL only; communicate exclusively via Supabase tables/views |
| **P1** | Adopt `AdaptivePlaywrightCrawler` as default; HTTP-only `CheerioCrawler` as override for low-defense pages |
| **P1** | Plan Stagehand integration for high-churn DOMs (ImovelWeb, MercadoLivre) — track as Wave B optimization |
| **P2** | Watch Crawlee Python parity announcements; revisit only if Python community adds something the JS lacks (unlikely 12-month horizon) |

---

## Handoff to Phase 4 (code-anatomist)

Clone targets:

1. **`apify/crawlee`** — focus folders: `packages/playwright-crawler/`, `packages/core/` (specifically `AutoscaledPool`), `packages/utils/` (fingerprints).
2. **`rictom/cnpj-sqlite`** — Python module surface for the ETL container.
3. **`Bunsly/HomeHarvest`** — selector patterns for real estate (US, transferable to BR portals).

Skip cloning `apify/crawlee-python` for now — second iteration only if Wave B requires.

---

## Sources

- GitHub API `repos/apify/crawlee` and `repos/apify/crawlee-python` (fetched 2026-05-14)
- https://crawlee.dev/blog/scrapy-vs-crawlee
- https://crawlee.dev/blog/crawlee-for-python-v05
- https://webscraping.ai/faq/crawlee/what-are-the-differences-between-crawlee-for-python-and-crawlee-for-javascript
- https://crawlee.dev/python/docs/deployment/aws-lambda
- https://crawlee.dev/python/docs/guides/scaling-crawlers
- https://github.com/apify/crawlee
- https://github.com/apify/crawlee-python
- https://github.com/rictom/cnpj-sqlite

# Scorecard — Crawlee Self-Hosted vs Apify Cloud

**Context:** Wave A Epic 7 likely 10–30 k pgs/mês; Wave B may scale to 50–100 k pgs/mês.

| Dimension | Weight | Self-hosted | Apify Cloud | Δ |
|---|---|---|---|---|
| Cost @ 10 k pgs/mês | 0.12 | 35 | **95** | −60 |
| Cost @ 50 k pgs/mês | 0.18 | 70 | **80** | −10 |
| Cost @ 100 k pgs/mês | 0.10 | **90** | 60 | +30 |
| Proxy rotation quality | 0.10 | **85** | 70 | +15 |
| Anti-bot bypass | 0.10 | 75 | 75 | 0 |
| Scheduler native | 0.08 | 60 | **90** | −30 |
| Monitoring/observability | 0.08 | 65 | **88** | −23 |
| Time-to-first-scrape | 0.08 | 55 | **95** | −40 |
| Operational overhead | 0.08 | 55 | **92** | −37 |
| Vendor lock-in | 0.08 | **95** | 65 | +30 |

### Weighted total

| Subject | Score |
|---|---|
| **Apify Cloud** | **80.70** |
| Crawlee Self-Hosted | 68.20 |
| **Δ** | **+12.5 pts in favor of Apify (overall scorecard)** |

## Verdict — **REFINE**

Wave 2's H-005 was directionally correct **but overstated**: at the volumes Real-State-Moema will actually run in **Wave A (10–30 k pgs/mês)**, **Apify Cloud is cheaper AND operationally lighter**. Self-hosted only dominates above ~50–80 k pgs/mês — a Wave B scenario that may never materialize for Zona Sul boutique scope.

### Refined recommendation

- **Wave A (now → Epic 7 Sprint 1-3, ≤ 30 k pgs/mês):** stay on Apify cloud. Add MercadoLivre + ImovelWeb as Apify Actors (or reuse `brasil-scrapers/quinto-andar-api` pattern).
- **Wave B trigger:** when sustained traffic exceeds ~50 k pgs/mês, migrate MercadoLivre + ImovelWeb workers to Crawlee TS on Hetzner. Code stays portable because Apify Actors already run Crawlee under the hood.

## Sources

- TCO model in this folder (see comparison-matrix.md)
- https://apify.com/pricing
- https://use-apify.com/docs/what-is-apify/apify-pricing
- https://use-apify.com/docs/what-is-apify/apify-compute-units
- https://www.hetzner.com/cloud/regular-performance
- https://iproyal.com/pricing/residential-proxies/
- https://use-apify.com/blog/self-hosting-web-scrapers-guide

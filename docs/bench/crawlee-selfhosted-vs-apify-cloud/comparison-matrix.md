# Comparison Matrix — Crawlee Self-Hosted vs Apify Cloud

## TCO model — assumptions

- **FX:** USD–BRL ≈ 5.10 · EUR–BRL ≈ 5.50 (spot 2026-05-14, *recheck before budget commit*).
- **Page mix:** 70 % HTTP / 30 % browser (typical for MercadoLivre + ImovelWeb listing + detail).
- **Bandwidth/page:** 250 KB HTTP · 1.2 MB browser.
- **Engineer cost:** R$ 1.000/dia mid-senior · R$ 125/h.
- **Self-hosted setup:** 4 eng-days, amortized over 12 months (R$ 333/mês).
- **Self-hosted maintenance:** 6 h/mês (R$ 750/mês).
- **Apify plan picked per scenario:** Creator ($50, $0.20/CU) up to ~80k pgs/mês; Scale ($249, $0.16/CU) above.
- **Crawlee throughput on Apify (per Apify docs):** ~3 000 pgs/CU on Cheerio · ~300 pgs/CU on Playwright.

## TCO scenarios (R$/mês)

| Volume | Crawlee self-hosted | Apify Cloud | Winner | Δ |
|---|---|---|---|---|
| **10 000 pgs/mês** | R$ 1 435 | **R$ 481** | **Apify** | −R$ 954 |
| **50 000 pgs/mês** | **R$ 1 944** | R$ 1 383 (Creator) / R$ 2 386 (Scale) | tilts **Apify-Creator** but operationally **self-hosted** is competitive | ±R$ 561 |
| **100 000 pgs/mês** | **R$ 2 542** | R$ 3 502 (Scale) | **Self-hosted** | −R$ 960 |

### Breakdown @ 50 000 pgs/mês

| Component | Self-hosted | Apify (Creator) |
|---|---|---|
| Compute (VPS / CU) | R$ 116 (CPX31) | R$ 50 base + R$ 13 CU (USD 2.47×5.10) |
| Proxy 26 GB | R$ 666 (IPRoyal $5/GB) | R$ 1 066 ($8/GB × 26 = $209) |
| Plan base | — | R$ 255 ($50) |
| Maintenance | R$ 750 (6 h × R$125) | R$ 0 |
| Setup amortized | R$ 333 | R$ 0 |
| Monitoring | R$ 80 | R$ 0 (Console included) |
| **Total** | **R$ 1 944** | **R$ 1 383** |

> The Wave 2 estimate (~R$ 430 self-hosted vs ~R$ 1 160–2 320 Apify) was **partially refuted by Phase 3 TCO modeling**: Wave 2 underestimated maintenance hours and ignored amortized setup. At 50k pgs/mês the gap is much narrower (within ±R$ 600) and **Apify Creator actually wins on raw cost** when ops time is priced honestly.

**Verdict on cost dimension:** Apify wins ≤ ~30–40k pgs/mês. Crawlee self-hosted wins ≥ ~80 k pgs/mês. **Tipping point: ~30–40 k pgs/mês** for this project's mix.

## Feature matrix

| Capability | Self-hosted | Apify Cloud | Advantage |
|---|---|---|---|
| Time to first scrape | 3–5 dias | minutes to hours | **Apify** |
| Per-page cost @ 50k | ~R$ 0.039 | **~R$ 0.028** | Apify (Creator) |
| Per-page cost @ 100k | **~R$ 0.025** | ~R$ 0.035 | Self-hosted |
| Proxy quality (residential) | multi-vendor, $1.75–$7/GB | single vendor $8/GB | **Self-hosted** |
| DataDome / Cloudflare bypass | Crawlee + Camoufox | same Crawlee SDK | tie |
| Scheduler | BYO (pg_cron + Edge Fn) | first-class Actor schedules | **Apify** |
| Observability | BYO (Sentry, pino, Better Stack) | Apify Console out-of-box | **Apify** |
| Operational overhead | ~6 h/mês | near zero | **Apify** |
| Vendor lock-in | zero | Actor format coupling | **Self-hosted** |
| Latency to BR portals | Hetzner EU ~150 ms | similar | tie |

## Sources

- https://use-apify.com/docs/what-is-apify/apify-pricing
- https://use-apify.com/docs/what-is-apify/apify-compute-units
- https://apify.com/pricing
- https://www.hetzner.com/cloud/regular-performance
- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- https://iproyal.com/pricing/residential-proxies/
- https://use-apify.com/blog/iproyal-pricing-plans-2026
- https://use-apify.com/blog/self-hosting-web-scrapers-guide
- https://use-apify.com/blog/best-residential-proxies-2026

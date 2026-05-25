# Executive Report — Crawlee Self-Hosted vs Apify Cloud

**Bench ID:** BENCH-02-crawlee-selfhosted-vs-apify-cloud
**Date:** 2026-05-14
**Author:** spy-bench-analyst (Phase 3)
**Wave 2 suggested winner:** Crawlee self-hosted (above 10 k pgs/mês)
**Verdict:** **REFINE** · confidence **Medium-High**

---

## TL;DR

Wave 2's H-005 estimated **~R$ 430 self-hosted vs ~R$ 1 160–2 320 Apify** at 50 k pgs/mês — a 3–6× spread. Phase 3 TCO with **honest maintenance & amortized setup** narrows the gap dramatically: at 50 k pgs/mês **Apify Creator at R$ 1 383 actually beats self-hosted at R$ 1 944**. The crossover point is real but lives **at ~50–80 k pgs/mês, not 10 k**. For Real-State-Moema Wave A (10–30 k pgs/mês), staying on Apify is the right call. Wave 2 was directionally correct (self-hosted IS cheaper at high volume) but **overstated the magnitude and underestimated where the crossover is**.

---

## Decision

| Phase | Choice | Trigger to revisit |
|---|---|---|
| **Wave A** (now → Epic 7 Sprint 1-3) | Apify cloud only | when monthly bill > R$ 1 500 OR sustained 50 k pgs/mês |
| **Wave B** (high volume) | Hybrid: Apify for marketplace Actors (`brasil-scrapers/quinto-andar-api`, etc.); Crawlee TS self-hosted for custom MercadoLivre + ImovelWeb workers | n/a |

---

## Quantitative summary

### TCO model (R$/mês) — full breakdown

| Volume | Self-hosted breakdown | Apify breakdown | Self total | Apify total | Winner |
|---|---|---|---|---|---|
| **10 k pgs** | R$ 116 VPS + R$ 187 proxy + R$ 333 setup + R$ 750 maint + R$ 50 mon | R$ 255 plan + R$ 13 CU + R$ 213 proxy | R$ 1 435 | **R$ 481** | Apify (−R$ 954) |
| **50 k pgs** | R$ 116 VPS + R$ 666 proxy + R$ 333 setup + R$ 750 maint + R$ 80 mon | R$ 255 plan + R$ 63 CU + R$ 1 066 proxy | R$ 1 944 | **R$ 1 383** (Creator) | Apify (−R$ 561) |
| **100 k pgs** | R$ 176 VPS + R$ 933 proxy + R$ 333 setup + R$ 1 000 maint + R$ 100 mon | R$ 1 270 plan + R$ 100 CU + R$ 2 132 proxy | **R$ 2 542** | R$ 3 502 (Scale) | Self-hosted (−R$ 960) |

### Weighted scorecard

| Subject | Score |
|---|---|
| **Apify Cloud** | **80.70** |
| Crawlee Self-Hosted | 68.20 |

Apify wins on cost @ 10–50 k pgs/mês, scheduler, observability, time-to-first-scrape, and ops overhead. Self-hosted wins on cost @ 100 k+ pgs/mês, proxy quality flexibility, and vendor lock-in.

---

## Cross-source consistency

| Source | Wave 2 claim | Phase 3 finding | Status |
|---|---|---|---|
| https://use-apify.com/blog/self-hosting-web-scrapers-guide | self-hosted cheaper above ~10 k pgs/mês | crossover actually closer to 50–80 k pgs/mês once maintenance is priced | **REFINED** |
| Hetzner CPX31 €21/mês | accurate | confirmed € 16.49 today, rising toward € 21–24 post-Apr 2026 | **OK** |
| IPRoyal $52/mês committed | rough | depends heavily on GB consumed; entry $7/GB | **CONTEXT** |
| Apify R$ 1 160-2 320/mês | overstated at 50k | actual ~R$ 1 383 at Creator | **REFUTED partial** |

---

## Recommendation (P0 / P1 / P2)

| Priority | Action |
|---|---|
| **P0** | Lock Apify Cloud as Wave A runtime for new portals (MercadoLivre, ImovelWeb pilot, anything before 50 k pgs/mês). Reuse Epic 6 deployment patterns. |
| **P0** | Write Wave A code as plain Crawlee TS Actors so migration to self-hosted is mechanical when triggered. Avoid Apify-only APIs. |
| **P0** | Defer ImovelWeb to Wave B regardless (DataDome difficulty + lower priority). |
| **P1** | Define Wave B migration trigger: sustained ≥ 50 k pgs/mês for 60 days OR Apify monthly bill > R$ 1 500. |
| **P1** | Build a real ops ledger after first 60 days of Apify usage to validate the maintenance-cost assumption. |
| **P2** | Pre-evaluate Hetzner CPX31 + IPRoyal account so Wave B trigger fires with infra ready in 1-2 days, not 5. |
| **P2** | Watch Camoufox + DataDome bypass community for breakthrough; revisit ImovelWeb scope if a clean approach lands. |

---

## Top risks identified by this bench (that Wave 2 missed)

1. **Hidden maintenance cost.** Wave 2 modeled €21 VPS + $52 proxy = ~R$ 430. It ignored 6 h/mês founder time + 4-day setup. Real number is ~R$ 1 944 at 50 k pgs/mês.
2. **Apify Creator plan is unexpectedly competitive** at 50 k pgs/mês because its $0.20/CU rate * Crawlee Cheerio's 3 000-pgs/CU efficiency makes compute almost free; proxy + plan base dominate.
3. **Crossover point is volume-sensitive AND mix-sensitive.** A 90/10 HTTP/browser mix shifts the tipping point right by ~20 k pgs; a 30/70 mix shifts it left by ~20 k pgs.

---

## Handoff to Phase 4 (code-anatomist)

Clone targets — **deferred to when Wave B triggers**:

1. `apify/crawlee` — focus on `packages/playwright-crawler/` + `AutoscaledPool` for self-hosted blueprint.
2. `Bunsly/HomeHarvest` for real-estate-specific selector heuristics that work without Apify's managed proxy.

For Wave A, no new Phase 4 clone targets are unlocked by this bench (Apify Actor format is already known via Epic 6).

---

## Sources

- TCO model in this folder (comparison-matrix.md / comparison-matrix.json)
- https://apify.com/pricing
- https://use-apify.com/docs/what-is-apify/apify-pricing
- https://use-apify.com/docs/what-is-apify/apify-compute-units
- https://apify.com/pricing/creator-plan
- https://prospeo.io/s/apify-vs-firecrawl
- https://checkthat.ai/brands/apify/pricing
- https://www.hetzner.com/cloud/regular-performance
- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- https://iproyal.com/pricing/residential-proxies/
- https://use-apify.com/blog/iproyal-pricing-plans-2026
- https://use-apify.com/blog/best-residential-proxies-2026
- https://use-apify.com/blog/self-hosting-web-scrapers-guide
- https://supabase.com/docs/guides/cron

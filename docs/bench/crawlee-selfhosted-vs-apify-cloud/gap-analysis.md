# Gap Analysis — Crawlee Self-Hosted vs Apify Cloud

## Gaps where Apify beats Self-hosted

| ID | Gap | Severity | Mitigation |
|---|---|---|---|
| gap-sh-1 | No managed scheduler with retries + webhooks | medium | pg_cron + Edge Function with idempotency keys |
| gap-sh-2 | No managed observability console | medium | Sentry (already in stack) + pino + Better Stack |
| **gap-sh-3** | **Setup 3–5 eng-days + 6 h/mês maintenance** | **HIGH** | Defer to Wave B; only invest above 30–50 k pgs/mês trigger |
| gap-sh-4 | No Actor marketplace shortcuts (e.g. `brasil-scrapers/quinto-andar-api`) | medium | Hybrid: keep marketplace Actors on Apify, self-host only custom MercadoLivre/ImovelWeb |
| gap-sh-5 | DataDome on ImovelWeb hard either way; Apify has more aggregate tuning | low | Camoufox plan B; defer ImovelWeb to Wave B |

## Gaps where Self-hosted beats Apify

| ID | Gap | Severity | Mitigation |
|---|---|---|---|
| gap-ap-1 | Proxy locked at Apify $8/GB | medium | Migrate when residential cost dominates total bill (~50 k pgs/mês) |
| gap-ap-2 | Compute scales linearly per-CU; no VPS efficiency | medium | Migrate when monthly CU spend > ~R$ 1 000 |
| gap-ap-3 | Actor packaging coupling (soft lock-in) | low | Code under Actors is Crawlee TS — refactor is mechanical |
| gap-ap-4 | Concurrent runs capped (32 on Creator plan) | low | Upgrade to Scale or self-host if cap is hit |
| gap-ap-5 | Vendor risk — pricing/terms can change | medium | Keep code portable as ongoing insurance |

## Interpretation

Apify and self-hosted are **NOT mutually exclusive**; they're a **sequence keyed to volume**:

```
0 → 30k pgs/mês     Apify cloud only (managed-services premium worth it)
30k → 50k pgs/mês   evaluate trigger; usually still Apify if Ops time is scarce
50k → 100k pgs/mês  hybrid: keep Apify for commoditized Actors, migrate custom workers to Crawlee self-hosted
100k+ pgs/mês       mostly self-hosted, Apify only for marketplace shortcuts
```

This **refines** Wave 2's H-005: the cost crossover exists, but it kicks in **later than Wave 2 estimated** once maintenance hours are priced honestly.

## Sources

- TCO model in this folder
- https://apify.com/pricing
- https://www.hetzner.com/cloud/regular-performance
- https://iproyal.com/pricing/residential-proxies/
- https://use-apify.com/blog/self-hosting-web-scrapers-guide
- https://use-apify.com/blog/best-residential-proxies-2026

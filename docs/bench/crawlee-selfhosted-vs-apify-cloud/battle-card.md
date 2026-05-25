# Battle Card — Crawlee Self-Hosted vs Apify Cloud

**Context:** Where should Epic 7 new portals (MercadoLivre, ImovelWeb) be deployed?
**Decision needed by:** @architect / @devops / @pm before Sprint 1.

## Verdict — REFINE Wave 2

> **Wave A: stay on Apify Cloud.**
> **Wave B trigger (~50 k pgs/mês sustained): migrate custom workers to Crawlee TS self-hosted; keep marketplace Actors on Apify.**

**Scorecard:** Apify **80.70** vs Self-hosted **68.20** · Δ +12.5 pts at *today's* volumes · confidence **Medium-High**.

## TCO snapshot (R$/mês)

| Volume | Self-hosted | Apify | Winner |
|---|---|---|---|
| 10 k pgs | R$ 1 435 | **R$ 481** | Apify (3x) |
| 50 k pgs | R$ 1 944 | **R$ 1 383** | Apify-Creator |
| 100 k pgs | **R$ 2 542** | R$ 3 502 | Self-hosted |

*Wave 2 H-005 numbers (R$ 430 vs R$ 1 160–2 320) underestimated maintenance hours. Phase 3 TCO with honest ops cost narrows the gap and pushes tipping point to ~50–80 k pgs/mês.*

## Why Apify wins now

1. **Setup cost dominates at small volume.** 3–5 eng-days = R$ 4–5k that buys ~9 months of Apify Creator plan at 50 k pgs/mês.
2. **Managed scheduler + observability** removes a real source of weekly ops drag for a 2-person team.
3. **`brasil-scrapers/quinto-andar-api` and similar Actors** are commoditized — no point reinventing them.

## Why Self-hosted wins later

1. **Compute amortization.** Hetzner CPX31 at R$ 116/mês supports ~150 k pgs/mês on a single box.
2. **Proxy flexibility.** Multi-vendor (IPRoyal, Bright Data, Smartproxy) drops $/GB by 4× at high commit.
3. **Zero vendor lock-in.** Crawlee code is the same under both runtimes; migration is mechanical.

## Risks

- **R1 — DataDome on ImovelWeb:** equally hard on both surfaces. Postpone ImovelWeb to Wave B regardless of runtime choice.
- **R2 — Apify pricing change:** vendor risk. Mitigation = keep Crawlee TS code portable from day 1 (i.e., don't write Apify-only code).
- **R3 — Hidden ops cost on self-hosted:** Wave 2 understated maintenance. Build a real ledger after migration.

## Migration trigger checklist (Wave B)

Trigger migration when **any two** of:
- Sustained ≥ 50 k pgs/mês for 60 days
- Monthly Apify bill > R$ 1 500
- Specific Actor needs ≥ 32 concurrent runs (Creator cap)
- Founder/Luciana ops time on Apify schedules > 2 h/mês

## One-line decision

> Today: Apify only. Above 50 k pgs/mês: hybrid Apify (marketplace) + Crawlee TS self-hosted (custom).

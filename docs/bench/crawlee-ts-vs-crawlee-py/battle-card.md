# Battle Card — Crawlee TS vs Crawlee Python

**Context:** Epic 7 lead-prospecting crawler on Real-State-Moema (Next.js 15 + Supabase).
**Decision needed by:** @architect / @pm before Sprint 1 of Epic 7.

## Verdict — CONFIRM Wave 2 winner

> **Crawlee TypeScript for all crawlers.**
> **Crawlee Python isolated only for CNPJ ETL** (driven by `rictom/cnpj-sqlite` library affinity).

**Scorecard:** TS **89.75** vs PY **72.05** · Δ +17.7 pts · confidence **High**.

## Why TS wins (top 3)

1. **Stack fit (Δ +65 pts).** Next.js 15 + TS already powers the app; shared domain types, single tsconfig, single Dockerfile.
2. **Maturity (Δ +25 pts).** 9.7 yrs vs 2.3 yrs, 23k vs 9k stars, hybrid `AdaptivePlaywrightCrawler` is canonical in JS.
3. **Deploy footprint (Δ +22 pts).** Single Node runtime vs second Python container = less ops surface for a 2-person team.

## Where Python wins (and why it doesn't change the verdict)

- `rictom/cnpj-sqlite` integration (Δ −35 pts): contained inside the CNPJ ETL subsystem — exactly the place we already planned to keep Python.
- AWS Lambda first-party docs: nice-to-have; Wave A targets Hetzner / Cloud Run.

## Risks

- **R1:** Crawlee TS lacks the in-process Python ML libraries → Wave B classifier/calibration must live in a Python sidecar. Tracked in CQ-011 strategy.
- **R2:** `StagehandCrawler` (AI selectors) is JS-only — opportunity to bias TS even further when MercadoLivre / ImovelWeb DOM churns.

## Cost implication

- Single TS runtime spares ~R$ 0/mês (vs double infra) and one engineer-day/sprint of dual-stack maintenance.

## Phase 4 follow-ups (code-anatomist)

- Clone `apify/crawlee` → confirm `AdaptivePlaywrightCrawler` source patterns and copy into Epic 7 scaffold.
- Clone `rictom/cnpj-sqlite` → confirm Python module surface for ETL container.
- Inspect `Bunsly/HomeHarvest` for proven real-estate selector heuristics (US, transferable).

## One-line decision

> Crawlee TS for everything that scrapes the open web. Python only where `cnpj-sqlite` lives.

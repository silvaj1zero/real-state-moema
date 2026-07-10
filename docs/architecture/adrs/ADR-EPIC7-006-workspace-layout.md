# ADR-EPIC7-006: Workspace Layout — In-App Monolith with Selective Code Sharing

**Date:** 2026-05-18
**Status:** Accepted
**Epic:** 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte
**Supersedes:** N/A (initial layout decision for Epic 7)
**Related:** ADR-EPIC7-001 (Crawlee TS), ADR-EPIC7-002 (Apify Cloud Wave A), ADR-EPIC7-003 (cron-Supabase Wave A), ADR-EPIC7-005 (CNPJ Python container)

---

## Context

Epic 7 introduces code that crosses three execution contexts:

1. **Next.js app server-side** (`app/`, deployed to Vercel) — API routes, cron handlers, server components.
2. **Apify Actors** (Wave A target runtime per ADR-EPIC7-002) — independent crawler deploys, each shipped as a self-contained TS bundle to Apify Cloud.
3. **Supabase Edge Functions** (Deno runtime, planned per FR-059 / ADR-EPIC7-003) — pipeline orchestration, classify-anuncio boundary.

Plus a parallel Python container (ADR-EPIC7-005) for the CNPJ ETL, which the bench already isolated and does NOT share code with TS.

Stories 7.1 and 7.2 were drafted with two alternative paths for shared TS code:

- **Path A — Monorepo:** `packages/shared/schemas/`, `packages/scrapers/`, `apps/web/` (rename of current `app/`), `apps/crawlers/`. Tooling: npm workspaces, pnpm workspaces, or turborepo.
- **Path B — In-app monolith:** `app/src/lib/schemas/epic7/`, `app/src/lib/scrapers/`, with copy-on-build (or symlink) duplication into Apify Actor packages and Edge Functions.

The decision blocks 7 Wave A stories (7.1, 7.2, 7.3, 7.4, 7.5, 7.7, indirectly others) from starting because file paths in their ACs reference one or the other.

### Prior-Art Search (per `.claude/rules/prior-art-search.md`)

| Claim | Search | Matches | Verdict |
|---|---|---|---|
| "No monorepo tooling exists at root" | Glob `package.json` at repo root, `turbo.json`, `pnpm-workspace.yaml`, Grep `workspaces` in `app/package.json` | 0 in all | CONFIRMED_ABSENT |
| "No `packages/` or `apps/` directories exist" | Glob `packages/**`, `apps/**` | 0, 0 | CONFIRMED_ABSENT |
| "Vercel deploys from `app/` subdir" | Read `app/vercel.json` (contains 8 cron entries pointing to `/api/cron/*`) | confirmed | CONFIRMED_PRESENT |
| "Schema dir already exists in-app" | Bash `ls app/src/lib/schemas/` → `search.ts` | 1 | CONFIRMED_PRESENT |
| "No Supabase Edge Functions deployed yet" | Bash `ls supabase/functions/` → No such file or directory | 0 | CONFIRMED_ABSENT |

---

## Decision

**Adopt Path B: in-app monolith with selective code sharing via explicit re-export and copy-on-build, NOT a monorepo.**

Canonical layout for Epic 7 shared code:

```
app/
├── src/
│   ├── lib/
│   │   ├── schemas/
│   │   │   ├── search.ts             (existing — Epic 6)
│   │   │   └── epic7/                (NEW — Story 7.1 lands here)
│   │   │       ├── agent.ts
│   │   │       ├── broker.ts
│   │   │       ├── builder.ts
│   │   │       ├── office.ts
│   │   │       ├── advertisers.ts
│   │   │       ├── home-flags.ts
│   │   │       ├── property-epic7.ts
│   │   │       ├── index.ts          (barrel — public surface)
│   │   │       ├── README.md
│   │   │       └── __tests__/
│   │   ├── scrapers/                 (NEW — Story 7.2 lands here)
│   │   │   ├── portal-crawler.ts
│   │   │   ├── telemetry.ts
│   │   │   ├── hooks/
│   │   │   │   ├── shouldPropagateError.ts
│   │   │   │   ├── resultChecker.ts
│   │   │   │   ├── resultComparator.ts
│   │   │   │   ├── preNavigationHooks.ts
│   │   │   │   └── postNavigationHooks.ts
│   │   │   ├── index.ts              (barrel)
│   │   │   ├── README.md
│   │   │   └── __tests__/
│   │   └── ... (existing apify.ts, geocoding.ts, etc.)
apps/
└── crawlers/                         (NEW — Wave A+ Apify Actors)
    ├── mercadolivre/
    │   ├── package.json              (self-contained — its own deps)
    │   ├── src/main.ts
    │   └── scripts/sync-shared.mjs   (copies app/src/lib/schemas/epic7
    │                                  + app/src/lib/scrapers into
    │                                  ./src/_shared at build/deploy time)
    └── ... (future portals)
supabase/
└── functions/                        (NEW — when first Edge Function ships)
    ├── classify-anuncio/
    │   ├── index.ts
    │   └── _shared/                  (copied from app/src/lib/... by
    │                                  scripts/sync-edge-shared.mjs)
    └── ... (future functions)
```

### Sharing contract

1. **Source of truth:** `app/src/lib/schemas/epic7/` and `app/src/lib/scrapers/` are the authoritative copies. The Next.js app consumes them directly via existing TS path aliases (`@/lib/schemas/epic7/...`, `@/lib/scrapers/...`).

2. **Apify Actors** (under `apps/crawlers/{portal}/`) are independent npm projects with their own `package.json`. They consume shared code via a **pre-build sync script** (`scripts/sync-shared.mjs`) that copies `app/src/lib/schemas/epic7/` and `app/src/lib/scrapers/` into `apps/crawlers/{portal}/src/_shared/` before `apify push`. Drift is prevented by:
   - The sync script being mandatory in the Actor's `prebuild` npm script.
   - A CI check (`npm run validate:shared-sync`) that fails if `_shared/` diverges from source.
   - Story 7.4 (first Actor) authors the sync script; subsequent Actors REUSE it.

3. **Supabase Edge Functions** (under `supabase/functions/{name}/`) follow the same pattern via `scripts/sync-edge-shared.mjs`. Deno's import-map / URL imports are out of scope; we keep imports relative to `./_shared/` for portability and avoid the workspace-package URL mess.

4. **Schema serializability constraint:** Code shared with Actors and Edge Functions MUST be pure TS (no Node-specific APIs, no Next.js imports). `app/src/lib/schemas/epic7/` enforces this by convention; lint rule added when first violation occurs.

5. **The Python container (CNPJ ETL)** does NOT participate in TS sharing. It communicates exclusively via Supabase tables/views, as established by ADR-EPIC7-005.

---

## Alternatives Considered

| Alternative | Evaluated as | Why rejected |
|---|---|---|
| **npm workspaces monorepo** (`packages/shared/`, `packages/scrapers/`, `apps/web/`, `apps/crawlers/`) | Strong on paper | Requires renaming `app/` → `apps/web/` which breaks Vercel deploy root config + 8 cron paths in `vercel.json` + every existing import + CI. Migration cost is high (4-8h + redeploy risk) for zero functional gain at Wave A scale (single web app, single CNPJ container, single new portal). Founder principle KISS / `.claude/rules/kiss-no-overengineering.md` Gate 4 (migration cost bounded) fails. |
| **pnpm workspaces** | Same as npm workspaces | Same blocker plus introduces pnpm where the project today uses npm (per `package-lock.json` in `app/`). New tool, new install instructions, new CI changes — Gate 1 (cite real failure) fails: no failure today justifies tool churn. |
| **Turborepo** | Same as workspaces + caching | Adds an entire build orchestrator for a project with one buildable app. Gate 3 (measurable benefit) fails: turbo's wins are remote cache + parallel builds, neither applicable here. |
| **Symlinks instead of copy-on-build** | Possible | Cross-platform symlink behavior on Windows (Zero's dev box) is unreliable; Apify CLI does not follow symlinks consistently. Copy-on-build is boring and works. |
| **TypeScript project references (`tsconfig` `references`)** | Possible | Solves type-checking across boundaries but does NOT solve runtime bundling for Apify Actors or Edge Functions. Would have to be paired with workspaces anyway. |
| **Path A as drafted (`packages/shared/schemas/`)** | The 7.1/7.2 alternative | Same migration cost as npm workspaces. Pulled stories into "OR" indecision that has blocked 7 stories for 4 days. |

---

## Consequences

### Positive

- **Zero disruption to Vercel deploy.** `app/` stays the deploy root. `vercel.json` unchanged. 8 production crons unaffected.
- **Stories unblocked immediately.** 7.1, 7.2, 7.3, 7.4, 7.5, 7.7 all get a single canonical path; no more "OR" branches in ACs.
- **Reversible.** If Wave B explodes in crawler count (>=5 portals) or a second consumer app appears, we can lift `app/src/lib/schemas/epic7/` + `app/src/lib/scrapers/` into `packages/shared/` and `packages/scrapers/` in a single mechanical migration (codemod of imports + workspace config). The in-app layout chose names (`schemas/epic7/`, `scrapers/`) that translate 1:1 to future packages — no rename needed at lift time.
- **Founder principle honored** (`.claude/rules/kiss-no-overengineering.md` — "Files flat under squad dirs. Use existing agent, rule, validator, registry before creating new ones. Edit existing file before adding a new one.").
- **Maturity gate explicit.** Re-evaluate workspace lift when EITHER: (a) >=3 Apify Actors AND a drift incident occurs that the CI sync-check missed, OR (b) a second buildable app (mobile, ops dashboard) materializes. Until then, copy-on-build is the boring choice that works.
- **Edge Functions stay shippable.** Deno's import constraints are sidestepped — no URL-based workspace imports to invent.

### Negative

- **Duplication on disk** between `app/src/lib/scrapers/` and `apps/crawlers/{portal}/src/_shared/scrapers/`. Mitigated by sync script being mandatory + CI check.
- **No automatic cross-package type-checking across the boundary.** `apps/crawlers/{portal}/` has its own `tsconfig.json` and its own `tsc`. Mitigated by the shared code being already typechecked in `app/` before being copied — the Actor build is a downstream consumer, not the typechecker of truth.
- **Future migration to true monorepo will require a codemod**, not a no-op. Mitigated by naming convention chosen above (`schemas/epic7/` → `packages/shared/schemas/`, `scrapers/` → `packages/scrapers/lib/`) so the codemod is mechanical.
- **Apify Actor builds depend on a hand-rolled sync script.** Mitigated by writing it once in Story 7.4 and ADR-locking its location.

### Trade-off balance

The equation: complexity of monorepo (4-8h migration + new tooling + ongoing config maintenance) vs. complexity of sync script (one ~50-line Node script + one CI check) at Wave A scale (1 Actor, 0 Edge Functions deployed today).

Sync script wins by an order of magnitude. The equations balance.

---

## Migration Plan

**No migration required.** Existing files stay where they are. The decision applies forward to Epic 7 stories.

For Stories 7.1 and 7.2, the in-app paths are canonical (see "Story Updates" section below).

For Story 7.4 (first Apify Actor — MercadoLivre, not yet drafted): the sync script `scripts/sync-shared.mjs` and the `apps/crawlers/` directory are introduced. Story 7.4's ACs will include "write sync script + CI check" as a sub-task. If 7.4 has already been drafted, it inherits the path canonically; if not, @sm will draft against this ADR.

For Edge Functions: the first one to ship introduces `scripts/sync-edge-shared.mjs` analogously.

---

## Re-evaluation Triggers

Re-open this ADR when ANY of the following hits:

1. **>=3 Apify Actors** AND a drift incident slips past the CI sync-check.
2. **A second buildable app** materializes (e.g., a separate ops dashboard or a React Native app for Luciana).
3. **An Edge Function needs to import a package** from app/src/lib that has runtime Node deps (signal that the shared layer outgrew "pure TS").
4. **CodeRabbit or QA flags** chronic duplication issues across `_shared/` copies.

At that point we revisit Path A (npm/pnpm workspaces) with the migration codemod budgeted explicitly.

---

## Evidence

- `app/package.json` — single npm project, no `workspaces` field, deploys to Vercel rooted at `app/`.
- `app/vercel.json` — 8 cron entries pointing to `/api/cron/*`; renaming `app/` breaks them.
- `app/src/lib/schemas/search.ts` — Epic 6 schema already lives in-app; Epic 7 follows the same convention.
- `supabase/functions/` — does not exist yet; Edge Functions are forward work, no migration cost on this side.
- `docs/bench/crawlee-ts-vs-crawlee-py/executive-report.md` — P0 recommendation says "Scaffold under `packages/crawler/` or `apps/crawler/`"; bench is binding on **the runtime** (Crawlee TS), advisory on the **directory layout**. This ADR resolves the advisory portion in favor of in-app monolith with `apps/crawlers/` reserved for the Apify Actor deploys (the recommended naming is preserved at the Actor level).
- `.claude/rules/kiss-no-overengineering.md` — Gates 1, 3, 4, 5 all fail for the workspace alternative under current scale.

---

*ADR-EPIC7-006 — Aria (@architect) — 2026-05-18*

# Epic 7 Wave A — PO Validation Summary

**Validator:** @po (Pax)
**Date:** 2026-05-14
**Protocol:** `*validate-story-draft` (10-point checklist + cross-story incremental analysis)
**Scope:** 10 Wave A stories (Epic 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte)
**Upstream:** PRD v1.0 (`docs/prd/EPIC-7-LEAD-PROSPECTING.md`), 5 ADRs, 4 code-anatomy artifacts, Wave 2 research

---

## Headline Verdict

**LIBERAR @dev para Wave A com 2 fixes coordenados pelo @sm em paralelo.**

8/10 stories PASS imediato (Ready). 2/10 stories CONCERNS resolveis com edits de wording em <15min do @sm. Nenhuma story FAIL ou bloqueio constitucional.

---

## Contagem Verdicts

| Verdict | Count | Stories |
|---|---|---|
| **PASS (Ready)** | 10 | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10 |
| **CONCERNS (Draft)** | 0 | — |
| **FAIL** | 0 | — |

**Update 2026-05-18:** Re-validation Pax (@po) aplicou auto-fix em 7.4 e 7.6. Ambas as stories agora Ready. Coordenacao cross-story 7.2 AC5 reescrita (consume em vez de define). Todas as 10 stories Wave A liberadas para @dev.

Score breakdown:
- **10/10:** 7.1, 7.2, 7.3, 7.5, 7.7, 7.10 (6 stories — exemplary rastreabilidade)
- **9/10:** 7.8, 7.9 (2 stories — minor improvements optional)
- **8/10:** 7.4, 7.6 (2 stories — process-level CONCERNS, content quality high)

---

## Stories READY for @dev (8)

| Story | Title | Score | Effort | Mode rec. |
|---|---|---|---|---|
| 7.1 | Schema Unificado + Migration 008 | 10/10 | M (5-7pt) | Interactive |
| 7.2 | Wrapper PortalCrawler + Telemetry | 10/10 | L (8pt + PoC) | Pre-Flight |
| 7.3 | classifyAdvertiser pure fn (FISBO 4-signal) | 10/10 | S (3pt) | YOLO |
| 7.5 | Container CNPJ ETL + cnpj_enrichment | 10/10 | L (8pt + PoC) | Pre-Flight |
| 7.7 | creciService unified (Conselho + SP) | 10/10 | M (6pt) | Pre-Flight |
| 7.8 | Review Queue UI confidence<0.70 | 9/10 | M (5pt) | Interactive |
| 7.9 | Workshop Luciana 200 anuncios | 9/10 | S (3pt + 2h Luciana) | Pre-Flight |
| 7.10 | LGPD Foundation (LIA + cifragem + opt-out + audit) | 10/10 | L (8pt + PoC) | Pre-Flight **MANDATORY** |

---

## Stories DRAFT (CONCERNS) — Need @sm fix

### 7.4 — Crawler MercadoLivre (8/10)
**Required fixes:**
1. Add Story 7.10 to `Dependencies` field with note "DEPLOY GATE: cannot deploy until 7.10 Done" (currently only in Risk R5; visibility issue).
2. Resolve C-01 (pg_cron schedule duplication with 7.6). Recommended: AC8 modified to remove cron schedule creation; declare "cron schedule owned by Story 7.6 migration 012". Keep Edge Function creation in 7.4.

**ETA after @sm fix:** Re-validate, PASS expected.

### 7.6 — Pipeline cron-Supabase + Self-Healing (8/10)
**Required fixes:**
1. Resolve C-01 (cron schedule ownership) — coordinate with 7.4 author. Recommended: 7.6 OWNS all schedules.
2. Resolve `fn_mark_stale_runs()` ownership (declared in BOTH 7.2 AC5 and 7.6 AC2). Recommended: function definition lives in migration 013 (this story). 7.2 AC5 reworded to "consumes fn_mark_stale_runs() defined in Story 7.6".
3. Add explicit pre-Sprint @data-engineer check for pgmq availability (AC11 or Dev Note).

**ETA after @sm fix:** Re-validate, PASS expected.

---

## Top 3 Critical Cross-Story Issues (CROSS-STORY-ANALYSIS.md detail)

| # | Issue | Severity | Owner | Action |
|---|---|---|---|---|
| 1 | **C-07 LIA counsel REMAX external blocker** | **HIGH** | @pm | Initiate counsel engagement DAY 1 of Sprint 1. AC1 of 7.10 cannot complete without external signature. |
| 2 | **C-01 pg_cron schedule duplication (7.4 vs 7.6)** | Medium | @sm | Coordinate single owner per cron schedule. Edit 7.4 AC8 OR 7.6 AC1 to remove duplication. |
| 3 | **C-05 `packages/` workspace existence** | Medium | @architect | Decide pre-7.1 start: monorepo workspace or `app/src/lib/` fallback. Cascades to 7.2, 7.3, 7.7. |

Sprint-level operational items (not story content):
- C-06 pgmq availability — @data-engineer validates pre-7.6 start
- C-04 calendar 14d post-7.4-deploy for 7.9 workshop — @pm sprint plan
- Vault vs pgcrypto decision (7.10) — @data-engineer validates pre-7.10 start

---

## Order of Execution Recommended for @dev (Wave A)

### Sprint 1 (week 1-2) — Foundation + Compliance
1. **7.1** Schema + Migration 008 — START
2. **7.10** LGPD Foundation — START IN PARALLEL (counsel external work)

### Sprint 1-2 (week 2-3) — Core libs
3. **7.2** PortalCrawler + Telemetry (needs 7.1)
4. **7.5** CNPJ ETL container (needs 7.2; can parallel with 7.7)

### Sprint 2 (week 3-4) — Classification + CRECI
5. **7.3** classifyAdvertiser (needs 7.1, 7.5)
6. **7.7** creciService (needs 7.2; parallel with 7.3)

### Sprint 2-3 (week 4-5) — Crawler
7. **7.4** MercadoLivre crawler (needs 7.1-7.3, 7.5; **DEPLOY GATED on 7.10 Done**)

### Sprint 3 (week 5-6) — Orchestration + UX
8. **7.6** Pipeline cron + self-healing (needs 7.2, 7.4, 7.5)
9. **7.8** Review Queue UI (needs 7.1, 7.3, 7.10, Epic 2.1)

### Sprint 4+ (week 7-8 + 14d data accrual) — Empirical Validation
10. **7.9** Workshop Luciana (needs 7.4 deploy + 14d data + 7.7 + 7.8 + Luciana 2h)

**Critical path length:** ~6 weeks of @dev work + 2h Luciana + counsel REMAX async.

---

## Recommendation to Founder (Zero)

**LIBERAR @dev para iniciar Wave A com a seguinte sequencia operacional:**

**Day 1 (Sprint 1 kickoff):**
- @pm initiates counsel REMAX LIA engagement
- @architect decides `packages/` workspace layout (cascade decision for 7.1)
- @data-engineer validates Supabase plan supports Vault + pgmq
- @sm applies 2 fixes (7.4 + 7.6) — 15min work, then validation re-runs
- @dev starts on 7.1 (foundation) + 7.10 (compliance/LIA in parallel)

**Não bloquear @dev start em 7.1 e 7.10 enquanto fixes 7.4/7.6 ocorrem em paralelo.** 7.4 e 7.6 sao Sprint 2-3, ha tempo para re-validar.

**Cross-story risk profile:** Medium-Manageable. Sem dependencias circulares. Order of execution claro. Calendar coupling (7.9) e external blocker (7.10 LIA) sao operacionais, nao tecnicos.

---

## Artifacts Produced

| Path | Purpose |
|---|---|
| `docs/stories/validation/CROSS-STORY-ANALYSIS.md` | Dependency graph, circular check, schema consistency, gaps, order of execution |
| `docs/stories/validation/7.1.validation.md` | Individual PO validation |
| `docs/stories/validation/7.2.validation.md` | Individual PO validation |
| `docs/stories/validation/7.3.validation.md` | Individual PO validation |
| `docs/stories/validation/7.4.validation.md` | Individual PO validation (CONCERNS — fixes listed) |
| `docs/stories/validation/7.5.validation.md` | Individual PO validation |
| `docs/stories/validation/7.6.validation.md` | Individual PO validation (CONCERNS — fixes listed) |
| `docs/stories/validation/7.7.validation.md` | Individual PO validation |
| `docs/stories/validation/7.8.validation.md` | Individual PO validation |
| `docs/stories/validation/7.9.validation.md` | Individual PO validation |
| `docs/stories/validation/7.10.validation.md` | Individual PO validation |
| `docs/stories/7-validation-summary.md` | This file |

**Status updates applied to story files:**
- 7.1 Draft → Ready (Change Log appended)
- 7.2 Draft → Ready (Change Log appended)
- 7.3 Draft → Ready (Change Log appended)
- 7.5 Draft → Ready (Change Log appended)
- 7.7 Draft → Ready (Change Log appended)
- 7.8 Draft → Ready (Change Log appended)
- 7.9 Draft → Ready (Change Log appended)
- 7.10 Draft → Ready (Change Log appended)
- 7.4 Draft → CONCERNS (2026-05-14) → Ready (2026-05-18 auto-fix re-validacao)
- 7.6 Draft → CONCERNS (2026-05-14) → Ready (2026-05-18 auto-fix re-validacao)
- 7.2 cross-story coord update (2026-05-18) — AC5 reescrito para consumir fn_mark_stale_runs() (ownership transferida para 7.6)

---

*Pax (@po) — Protecting product quality, one story at a time — 2026-05-14*

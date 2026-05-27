# Cross-Story Analysis — Epic 7 Wave A (Stories 7.1 — 7.10)

**Validator:** @po (Pax)
**Date:** 2026-05-14
**Scope:** 10 Wave A stories (P0 fundamento, captacao, enriquecimento, orquestracao, UX, validacao, compliance)
**Upstream artifacts:**
- `docs/prd/EPIC-7-LEAD-PROSPECTING.md` (PRD v1.0, 34 FRs)
- `docs/architecture/adrs/ADR-EPIC7-001..005.md` (5 ADRs)
- `docs/research/2026-05-14-leads-zonasul-sp/wave-2-summary.md` (discovery)
- `docs/code-anatomy/bunsly-homeharvest/07-business-rules.md` (FISBO heuristic)
- `docs/code-anatomy/buscacreci/07-business-rules.md` (CRECI patterns)

---

## 1. Dependency Graph (textual + ASCII)

### Declared dependencies (verbatim from story files)

| Story | Depends-on | Blocks |
|---|---|---|
| 7.1 Schema + Migration 008 | 6.1 (scraped_listings), 1.1 (Supabase types pipeline) | 7.2, 7.3, 7.4, 7.7 |
| 7.2 PortalCrawler + Telemetry | 7.1 (Property schema), Edge Functions runtime | 7.4, 7.6, 7.8 |
| 7.3 classifyAdvertiser | 7.1 (Advertiser schema), 7.5 (cnpj_enrichment table) | 7.4, 7.6, 7.8 |
| 7.4 MercadoLivre crawler | 7.1, 7.2, 7.3, **7.5 soft** | 7.8, 7.9 |
| 7.5 CNPJ ETL container | 7.2 (crawl_runs table), Supabase Vault/pgcrypto | 7.3, 7.4 |
| 7.6 Pipeline cron + self-healing | 7.2 (crawl_runs etc), 7.4 (Edge fns), 7.5 (CNPJ trigger), pg_cron+pgmq | smoke E2E Wave A |
| 7.7 creciService unified | 7.2 (telemetry optional), 2Captcha contract @devops | 7.3 (`hasCRECI` signal), 7.4 |
| 7.8 Review Queue UI | 7.1 (schemas), 7.3 (confidence), 7.10 (lgpd_audit), 2.1 (funil) | 7.9 |
| 7.9 Workshop Luciana | 7.4, 7.7, 7.8, Luciana 2h | Wave B kickoff |
| 7.10 LGPD Foundation | 7.1, Vault/pgcrypto, counsel REMAX | **Deploy de qualquer crawler PF** (7.4 etc) |

### ASCII Dependency DAG

```
                      ┌──────────────────────────────────────┐
                      │  7.1 Schema/Migration 008 (M, 5-7pt) │
                      └───────────┬──────────────┬────────────┘
                                  │              │
                ┌─────────────────┼──────────────┼──────────────┐
                v                 v              v              v
        ┌───────────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐
        │ 7.2 Portal    │  │ 7.3 classify│  │ 7.7 CRECI│  │ 7.10 LGPD   │
        │ Crawler+      │  │ Advertiser  │  │ Service  │  │ Foundation  │
        │ Telemetry (L) │  │ (S, 3pt)    │  │ (M, 6pt) │  │ (L, 8pt)    │
        └───────┬───────┘  └──────┬──────┘  └────┬─────┘  └──────┬──────┘
                │                 ^               │               │
                │                 │               │               │
                │           ┌─────┴─────────┐    │               │
                │           │ 7.5 CNPJ ETL  │    │               │
                │           │ container (L) │    │               │
                │           └─────────┬─────┘    │               │
                │                     │           │               │
                └────────┬────────────┴───────────┘               │
                         v                                         │
                ┌───────────────────┐                              │
                │  7.4 MercadoLivre │<─── BLOCKED until 7.10 ──────┘
                │  Crawler (L, 8pt) │
                └────────┬──────────┘
                         │
                         v
                ┌───────────────────┐
                │ 7.6 Pipeline cron │
                │ + self-healing(M) │ <── needs 7.2, 7.4, 7.5
                └─────────┬─────────┘
                          │
                          v
                ┌───────────────────┐
                │ 7.8 Review Queue  │ <── needs 7.1, 7.3, 7.10, 2.1
                │ UI (M, 5pt)       │
                └─────────┬─────────┘
                          │
                          v
                ┌───────────────────┐
                │ 7.9 Workshop      │ <── needs 7.4, 7.7, 7.8, Luciana
                │ Luciana 200 (S+2h)│
                └───────────────────┘
```

### Strict topological sort (one possible order)

```
1.  7.1   (no Epic-7 deps; only Epic 1 + 6.1)
2.  7.10  (only depends on 7.1 + counsel — BLOCKER for crawler PF)
3.  7.2   (depends on 7.1)
4.  7.5   (depends on 7.2)
5.  7.3   (depends on 7.1, 7.5)
6.  7.7   (depends on 7.2 — independent of 7.3)
7.  7.4   (depends on 7.1, 7.2, 7.3, 7.5; BLOCKED by 7.10 for deploy)
8.  7.6   (depends on 7.2, 7.4, 7.5)
9.  7.8   (depends on 7.1, 7.3, 7.10, 2.1)
10. 7.9   (depends on 7.4, 7.7, 7.8 + Luciana agenda)
```

---

## 2. Circular Dependencies — Detection

### Suspect: 7.1 <-> 7.3
- 7.1 AC1 declares `advertisers.ts` exports `AdvertiserSignals` type.
- 7.3 Modified Files lists `packages/shared/schemas/advertisers.ts` (modify — import `AdvertiserSignals` or alias).
- **Verdict:** NOT circular. 7.1 owns the schema; 7.3 only consumes it (read), modify is optional aliasing. Resolution direction: 7.1 → 7.3.

### Suspect: 7.3 <-> 7.5
- 7.3 depends on 7.5 (`cnpj_enrichment` table populated).
- 7.5 depends on 7.2 (`crawl_runs` table) — NOT on 7.3.
- **Verdict:** NOT circular. Resolution direction: 7.5 → 7.3.

### Suspect: 7.4 <-> 7.6
- 7.4 AC8 creates Edge Functions `trigger_mercadolivre_crawl` + `webhook_mercadolivre_done` + pg_cron schedule (migration 010 in 7.4 file list).
- 7.6 AC1 also creates `epic7_mercadolivre_daily` pg_cron schedule (migration 012).
- **Verdict:** OVERLAP — both stories touch the MercadoLivre cron schedule. Resolution: 7.4 deploys the Edge Functions; 7.6 owns the SCHEDULE (cron entry) in a separate migration that calls 7.4's function. Mild redundancy in AC wording. **NOT a cycle**, but minor scope-boundary issue (see §4 below).

### Verdict: NO TRUE CIRCULAR DEPENDENCIES. DAG is acyclic.

---

## 3. Schema Consistency Across Stories

| Schema/Table | Story owner | Consumers | Consistency |
|---|---|---|---|
| `AdvertiserSignals` type | 7.1 (declared AC1) | 7.3 (consumes), 7.4 (emits) | OK |
| `classification` column on scraped_listings | 7.1 AC4 (ALTER) | 7.3 UPDATE, 7.4 UPDATE, 7.8 SELECT | OK |
| `home_flags` column on scraped_listings | 7.1 AC4 | 7.4 emits | OK |
| `crawl_runs` table | 7.2 AC4 | 7.5 (stats portal='cnpj_rfb'), 7.6 (status update + healer), 7.4 (insert/update) | OK |
| `crawl_runs.retry_count` | 7.6 AC4 (adds via ALTER) | 7.6 healer uses it | **Inconsistency:** 7.2 declares crawl_runs in migration 009; 7.6 ALTERs it (migration 012). Acceptable pattern but 7.2 AC could note this explicitly. Minor. |
| `cnpj_enrichment.cnae_primario` | 7.5 AC3 | 7.3 lookupCNAE consumes | OK |
| `creci_cache` | 7.7 AC3 | 7.3 (read for hasCRECI if pre-populated) | OK |
| `lgpd_audit` | 7.10 AC3 | 7.8 AC10 inserts (reveal_phone) | OK |
| `review_status` on scraped_listings | 7.8 AC5 (ALTER) | 7.9 page consumes (read for filtering) | OK |
| `lead_type` ENUM on leads | 7.1 AC4 | implicit (no Wave A story explicitly UPDATEs leads.lead_type) | **GAP — see §5** |

---

## 4. Issues Sistemicos Detectados

### Issue C-01 — pg_cron schedule duplication (7.4 vs 7.6)
**Severity:** Medium
**Detail:** Story 7.4 AC8 declares `trigger_mercadolivre_crawl` + cron schedule via migration `010_epic7_mercadolivre_cron.sql`. Story 7.6 AC1 declares the same MercadoLivre cron schedule via migration `012_epic7_cron_schedules.sql`.
**Risk:** If both migrations create the schedule, second one fails or duplicates. Two migrations should not both `cron.schedule(...)` the same job name.
**Resolution required:**
- Option A: 7.4 omits cron schedule, only declares the Edge Function; 7.6 owns ALL schedules.
- Option B: 7.4 creates schedule guarded by IF NOT EXISTS, 7.6 references it (no-op if exists).
**Recommendation:** Option A. @sm clarifies in 7.4 AC8 that scheduling is delegated to 7.6.
**Stories affected:** 7.4, 7.6.

### Issue C-02 — 7.3 declares hard dependency on 7.5; in practice 7.4 declares 7.5 as SOFT dep
**Severity:** Low (already noted in 7.4 as "soft dependency")
**Detail:** 7.3 AC4 helper `lookupCNAE` consults `cnpj_enrichment`; if empty (7.5 not run yet) returns `''` (graceful per 7.3 Risk table). 7.4 declares 7.5 as soft. Consistent in spirit but 7.3 Dependencies states "Depends on: 7.5" (hard) — inconsistent with the soft-fail in implementation.
**Resolution:** No change required in story files (acceptable hedge); @dev should be aware that 7.3 CAN run before 7.5 (returns unknown for CNPJ-bearing ads until 7.5 lands).
**Stories affected:** 7.3 (clarification only).

### Issue C-03 — 7.8 depends on 7.10 (`lgpd_audit` exists); 7.10 in turn blocks deployment of 7.4
**Severity:** Low (deliberate, captured in 7.10 risk table)
**Detail:** Hard chain: 7.10 must Done BEFORE 7.4 deploys (LGPD). 7.8 needs 7.10. 7.9 needs 7.8 + 7.4 deploy + 14d of real data. This forces order: 7.10 early in Sprint 1; 7.4 deploy gated on 7.10.
**Resolution:** Captured in `Order of execution` (Section 1 above). 7.10 promoted to Sprint 1 start alongside 7.1.
**Stories affected:** 7.4, 7.10 (deploy gate).

### Issue C-04 — Workshop validation batch (7.9) requires 100+ real listings; story 7.4 just deployed
**Severity:** Medium
**Detail:** 7.9 AC1 stratifies 200 listings from `scraped_listings`; AC6 notes "agendar com Luciana via @pm + Zero apos Story 7.4 deploy + 100 anuncios reais em DB". 7.9 Risk table notes "aguardar 14 dias acumular volume". Effectively 7.9 cannot run end-to-end until 14 days post-7.4-deploy.
**Resolution:** Captured. 7.9 effort is `3 pts + 2h Luciana` but calendar window is real. @pm schedules accordingly. Not a story-file fix; sprint planning concern.
**Stories affected:** 7.4, 7.9 (calendar coupling).

### Issue C-05 — `packages/shared/schemas/` and `packages/scrapers/lib/` workspace existence
**Severity:** Medium (PROCESS risk, not story-content risk)
**Detail:** 7.1 Risk notes "Pacote `packages/shared/schemas/` nao existe no monorepo → fallback `app/src/lib/schemas/epic7/`". Same for 7.2 (`packages/scrapers/`). The project is single-app Next.js; monorepo workspace not yet set up.
**Resolution:** @architect or @dev decides workspace fallback at Story 7.1 start (Pre-Flight mode recommended). Once decided, 7.2/7.3/7.7 follow same convention. NOT a blocker — fallback path is documented in each story.
**Stories affected:** 7.1, 7.2, 7.3, 7.7 (cascading path decision).

### Issue C-06 — `pgmq` availability not validated pre-Sprint
**Severity:** Medium
**Detail:** 7.6 AC5 enables pgmq extension; Risk table notes "pgmq nao disponivel no plano Supabase | Fallback `epic7_task_queue` table manual; validar antes de Sprint 1". 7.2 mentions pgmq optional Wave A.
**Resolution:** @data-engineer validates pgmq availability in Supabase plan BEFORE 7.6 starts. If unavailable, fallback documented. Not a story-content fix; pre-Sprint validation.
**Stories affected:** 7.6 (decision moment); 7.2 mention.

### Issue C-07 — 7.10 LIA depends on external counsel (RE/MAX legal) → real calendar risk
**Severity:** High (BLOCKER)
**Detail:** 7.10 AC1 requires LIA reviewed + signed by counsel RE/MAX. Risk table flags "Counsel RE/MAX atrasa revisao LIA → bloqueia Wave A". No story-level fix; @pm must initiate counsel engagement at Sprint 1 kickoff.
**Resolution:** Captured. @pm action item out-of-scope for @po. Sprint planning must flag this hard.
**Stories affected:** 7.10 (operational risk).

---

## 5. Gaps Verticais (Missing Stories Detection)

### Gap G-01 — `lead_type` ENUM populated in `leads` table
**Detail:** 7.1 AC4 ALTERs `leads.lead_type` adding the ENUM column. NO Wave A story explicitly UPDATEs `leads.lead_type` after classification. Implicit assumption: when scraped_listing converts to lead (Epic 2 funnel), `lead_type` derived from `scraped_listings.classification`.
**Severity:** Low (implicit but acceptable). Epic 2 conversion logic likely owns this; or 7.4 AC5 already mentions "criar evento `intelligence_feed`" which feeds Epic 3; lead creation downstream.
**Recommendation:** Add note in 7.4 or 7.8 (where confirm/reject creates lead) that `lead_type` is set from `classification`. NOT a blocker.

### Gap G-02 — No story for `ITBI_transactions` table DDL
**Detail:** 7.6 AC1 references `trigger_itbi_snapshot` cron schedule but ITBI ingest table itself is out of scope ("apenas o cron schedule placeholder"). 7.6 Out of Scope clarifies.
**Severity:** None (deliberate scope cut). Wave B (Story 7.11 stub mentioned in 7.6 Out of Scope) owns ITBI ingest.
**Recommendation:** Confirm 7.11 stub exists in backlog. Not a blocker for Wave A.

### Gap G-03 — No story for Apify Actor deployment infrastructure / Dockerfile build
**Detail:** 7.4 lists `Dockerfile` + `actor.json` in File List. 7.5 has its own Dockerfile (Python). No dedicated infra/CI story for Apify deploy or container build/push (e.g., `.github/workflows/cnpj-etl-monthly.yml` is mentioned in 7.5 but as part of 7.5's own File List).
**Severity:** Low. 7.4 and 7.5 each carry their own Docker artifact. @devops handles deploy via *push.
**Recommendation:** None. Each story scopes its own container.

### Gap G-04 — No explicit story for `intelligence_feed` entry creation (FISBO event)
**Detail:** 7.4 AC5 mandates "criar evento `intelligence_feed` tipo `novo_fisbo_detectado`" but `intelligence_feed` table is presumably from Epic 3 (existing). Not validated here.
**Severity:** Low. Assumed Epic 3 infrastructure pre-existing.
**Recommendation:** @dev verifies table exists at 7.4 start. Not a story-level fix.

### Gap G-05 — No story addresses telephone normalization (E.164) for cross-portal matching
**Detail:** 7.7 Technical Notes mentions normalize to E.164 for CRECI. 7.10 doesn't address PII normalization. classifyAdvertiser uses `listingCountByPhone` (7.3 signal) which requires consistent phone format across portals.
**Severity:** Low. Implicit in 7.4 parser (cleanup as part of parseDetail). Could be a shared util.
**Recommendation:** Add brief mention in 7.3 Dev Notes that `listingCountByPhone` queries assume E.164-normalized telefone. NOT a blocker.

---

## 6. Order of Execution Recommendation for @dev (Wave A)

**Sprint 1 (week 1-2) — Foundation:**
1. **7.1** Schema + Migration 008 (M, 5-7pt) — unblocks everything
2. **7.10** LGPD Foundation (L, 8pt) — START EARLY due counsel external dependency; runs in parallel with 7.1

**Sprint 1-2 (week 2-3) — Core libs:**
3. **7.2** PortalCrawler + Telemetry (L, 8pt + PoC) — needs 7.1 done
4. **7.5** CNPJ ETL container (L, 8pt + PoC) — needs 7.2 (crawl_runs); can parallel with 7.7

**Sprint 2 (week 3-4) — Classification + CRECI:**
5. **7.3** classifyAdvertiser pure fn (S, 3pt) — needs 7.1 + 7.5
6. **7.7** creciService unified (M, 6pt) — needs 7.2; parallel-safe with 7.3

**Sprint 2-3 (week 4-5) — Crawler:**
7. **7.4** MercadoLivre crawler (L, 8pt + PoC) — needs 7.1, 7.2, 7.3, 7.5; **DEPLOY GATED on 7.10 Done**

**Sprint 3 (week 5-6) — Orchestration:**
8. **7.6** Pipeline cron + self-healing (M, 5pt) — needs 7.2, 7.4, 7.5

**Sprint 3-4 (week 6-7) — UX:**
9. **7.8** Review Queue UI (M, 5pt) — needs 7.1, 7.3, 7.10, Epic 2.1

**Sprint 4+ (week 7-8 + 14d data accrual) — Validation:**
10. **7.9** Workshop Luciana (S 3pt + 2h Luciana) — needs 7.4 deploy + 14d data + 7.7 + 7.8

**Parallelization opportunities:**
- 7.1 + 7.10 (counsel work in parallel)
- 7.3 + 7.7 (both depend on 7.2 only; 7.3 has soft dep on 7.5)
- After 7.6 done, 7.8 can start while smoke E2E runs

---

## 7. Top Critical Cross-Story Issues (Summary)

| # | Issue | Severity | Resolution Owner |
|---|---|---|---|
| 1 | C-01 — pg_cron schedule duplication (7.4 vs 7.6) | Medium | @sm clarify in 7.4 OR 7.6 (one owner per schedule) |
| 2 | C-07 — LIA counsel external blocker | High | @pm initiate Day 1 of Sprint 1 |
| 3 | C-05 — packages/ workspace existence | Medium | @architect decide pre-7.1 start |
| 4 | C-04 — 7.9 calendar coupling (14d post-7.4) | Medium | @pm sprint plan accordingly |
| 5 | C-06 — pgmq availability validation | Medium | @data-engineer pre-7.6 validate |

NONE of these is a content fix to story ACs. All are operational / clarification / external. **No NO-GO from cross-story analysis.** A single AC clarification recommended for C-01 (cleanup duplicate cron declaration). All other items are sprint planning, not story validation.

---

*Pax (@po) — Cross-story analysis — Epic 7 Wave A — 2026-05-14*

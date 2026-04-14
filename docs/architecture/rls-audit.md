# RLS Audit — Row Level Security Policy Inventory

**Migration:** `supabase/migrations/20260414000001_rls_policies.sql`
**Story:** 5.2 AC7 — Close zero-RLS gap
**Date:** 2026-04-14
**Auditor:** @data-engineer (Dara)

---

## Executive Summary

- **24 user-facing tables** across 4 epics
- **1 system table** skipped (`spatial_ref_sys`)
- **1 view** inherits RLS from base table (`checklists_preparacao` -> `checklist_preparacao`)
- **82 RLS policies** created
- **Zero tables left without RLS**

---

## Policy Categories

| Category | Strategy | Tables |
|----------|----------|--------|
| **Tenant-isolated** | `consultant_id = auth.uid()` | 17 tables |
| **Hybrid (default + custom)** | Public read for defaults, own for custom | 1 table (scripts) |
| **Shared registry** | Authenticated read, creator write | 1 table (edificios) |
| **System/cron data** | Authenticated read-only | 2 tables |
| **Junction via parent** | EXISTS sub-query | 1 table |
| **Child via parent** | EXISTS sub-query | 1 table |
| **Reference/seed** | Authenticated read-only | 1 table |

---

## Table-by-Table Inventory

### Epic 1 — Foundation

| # | Table | consultant_id | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|-------|
| 1 | `consultant_settings` | YES | ON | own | own | own | own | 1 row per consultant |
| 2 | `epicentros` | YES | ON | own | own | own | own | Concentric expansion |
| 3 | `edificios` | NO (created_by) | ON | auth | auth | creator | -- | Shared building registry |
| 4 | `edificios_qualificacoes` | YES | ON | own | own | own | own | Per-consultant qualifications |

### Epic 2 — Methodology

| # | Table | consultant_id | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|-------|
| 5 | `leads` | YES | ON | own | own | own | own | |
| 6 | `informantes` | YES | ON | own | own | own | own | |
| 7 | `informantes_edificios` | NO (junction) | ON | parent | parent | -- | parent | Via informantes.consultant_id |
| 8 | `acoes_gentileza` | YES | ON | own | own | own | own | |
| 9 | `funnel_transitions` | YES | ON | own | own | -- | -- | Append-only audit log |
| 10 | `agendamentos` | YES | ON | own | own | own | own | |
| 11 | `scripts` | YES (nullable) | ON | own+default | own | own (non-default) | own (non-default) | Hybrid: is_default=true readable by all |
| 12 | `frog_contacts` | YES | ON | own | own | own | own | |
| 13 | `checklist_preparacao` | YES | ON | own | own | own | own | View inherits RLS |
| 14 | `dossies` | YES | ON | own | own | own | own | |

### Epic 3 — Intelligence

| # | Table | consultant_id | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|-------|
| 15 | `scraped_listings` | NO (system) | ON | auth | -- | -- | -- | Cron/service_role writes |
| 16 | `acm_comparaveis` | YES | ON | own | own | own | own | |
| 17 | `listing_cross_refs` | NO (system) | ON | auth | -- | -- | -- | Cron/service_role writes |
| 18 | `intelligence_feed` | YES | ON | own | own | own | -- | No user delete; mark as read |

### Epic 4 — Partnerships

| # | Table | consultant_id | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|-------|
| 19 | `referrals` | YES | ON | own | own | own | own | |
| 20 | `safari_events` | YES | ON | own | own | own | own | |
| 21 | `safari_event_rsvps` | NO (child) | ON | parent | parent | parent | parent | Via safari_events.consultant_id |
| 22 | `comissoes` | YES | ON | own | own | own | own | |
| 23 | `marketing_plans` | YES | ON | own | own | own | own | |
| 24 | `clubes_remax_thresholds` | NO (reference) | ON | auth | -- | -- | -- | Seed data, service_role writes |

### Skipped

| Table | Reason |
|-------|--------|
| `spatial_ref_sys` | PostGIS system catalog |

---

## Access Patterns

### Browser (anon key + auth.uid())
- All tenant-isolated tables: full CRUD on own rows only
- edificios: read all, insert any, update own creations
- scraped_listings / listing_cross_refs / clubes_remax_thresholds: read-only
- scripts: read defaults + own, write own non-defaults only

### API Routes (service_role key)
- Bypasses ALL RLS automatically
- Used for: cron jobs (scrape-portals, geocode-listings, match-listings, cross-reference)
- Used for: admin operations on scraped_listings, listing_cross_refs, clubes_remax_thresholds

### RPC Functions
- All functions use SECURITY INVOKER (default) and respect the caller's RLS
- fn_edificios_no_raio, fn_cobertura_raio: no consultant filter needed (edificios is readable by all)
- fn_comparaveis_no_raio: filters by p_consultant_id which aligns with RLS
- fn_match_listing_edificio: reads scraped_listings (readable by all auth) and edificios (readable by all auth)
- fn_set_listing_coordinates, fn_insert_scraped_listing_with_coords: called by service_role (bypasses RLS)

---

## Design Decisions

1. **funnel_transitions is append-only.** No UPDATE/DELETE policies for users. This preserves the audit trail. Service_role can still modify via admin client if needed.

2. **intelligence_feed has no DELETE policy.** Users mark events as read (UPDATE) but cannot delete history. Service_role handles cleanup.

3. **edificios allows UPDATE by creator OR seed data.** The `created_by IS NULL` clause lets authenticated users update seed-imported buildings that have no creator. This supports the seed-first workflow.

4. **scripts uses hybrid pattern.** System default scripts (is_default=true, consultant_id IS NULL) are readable by everyone. Users can only create/edit/delete their own non-default scripts.

5. **No explicit service_role bypass policies.** Supabase's service_role key bypasses RLS by design. The `createAdminClient()` in `app/src/lib/supabase/admin.ts` uses this key.

---

## Verification Queries

After applying the migration, run these to verify:

```sql
-- Check all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

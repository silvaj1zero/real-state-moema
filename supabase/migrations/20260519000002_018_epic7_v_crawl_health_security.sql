-- =============================================================================
-- MIGRATION 018: Epic 7 — v_crawl_health SECURITY INVOKER hardening
-- Story: 7.6 — Pipeline cron-Supabase + Self-Healing (QA fix SEC-001)
-- Depends on: 013 (creates v_crawl_health)
-- Ref: docs/qa/gates/7.6-cron-pipeline.yml (commit fde1ca3)
-- =============================================================================
--
-- QA Fix SEC-001 (medium severity):
--   View v_crawl_health was created in migration 013 without an explicit
--   security model. Postgres defaults to invoker-rights for views, but the
--   behavior is NOT declared in the DDL — making the RLS interaction with
--   crawl_runs implicit and easy to misread during audits.
--
-- Fix: force `security_invoker = true` so the view explicitly respects the
-- RLS policies of the calling role. Service role bypasses RLS (full read);
-- `authenticated` role sees only what its RLS allows (currently empty for
-- crawl_runs per Stories 7.2/7.5 — that's a separate observability gap to
-- be addressed in a follow-up policy story).
--
-- This is a metadata-only ALTER; no data is moved, no view definition
-- changes. ALTER VIEW ... SET (security_invoker = true) is idempotent —
-- re-running has no effect once the option is set.
--
-- Postgres version: requires 15+ (Supabase is 15+).
-- =============================================================================

ALTER VIEW public.v_crawl_health SET (security_invoker = true);

COMMENT ON VIEW public.v_crawl_health IS
  'Story 7.6 AC10 — 24h health snapshot per portal: counts, success rate, avg duration, retries. Hardened with security_invoker=true (migration 018, QA fix SEC-001) so RLS of crawl_runs is enforced per calling role.';

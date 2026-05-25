# Inventory — pg_cron + Supabase Edge Functions

**Snapshot:** 2026-05-14

## pg_cron

- Postgres extension (originally Citus), GA in Supabase
- Cron syntax inside SQL: `SELECT cron.schedule(...)`
- Single Postgres cluster (no cross-cluster orchestration)
- **Limitations:**
  - No native retry — implement via execution IDs + status table
  - 5000 ms timeout when invoking Edge Functions through Supabase Cron UI (pg_net itself can be configured higher)
- Source: https://supabase.com/docs/guides/cron · https://github.com/orgs/supabase/discussions/37574

## Edge Functions

- Deno-based serverless on Supabase
- Triggered by `pg_net` from `pg_cron`, webhooks, or API calls
- Wall-time limits: Free 25 s · Pro 150 s · Team 400 s
- **Self-healing pattern**: status table + execution ID idempotency (documented community pattern)
- Source: https://supabase.com/docs/guides/functions · https://dev.to/domoniqueluchin/building-a-self-healing-cron-system-with-pgcron-and-supabase-edge-functions-5420

## Optional queue — pgmq

When > 5 s timeout needed, `pg_cron` enqueues into pgmq, an async worker drains.
Source: https://supabase.com/blog/processing-large-jobs-with-edge-functions

## Cost model

| Component | Cost |
|---|---|
| pg_cron | **FREE** (included in Supabase plan, even free tier) |
| Edge Functions (Free) | 500 k invocations/mês free |
| Edge Functions (Pro) | $10/mês + $2/million after 2 M included |

## Operational characteristics

- 100 % deterministic — same input ⇒ same output
- Token cost: **0** (no LLM)
- Native observability: `cron.job_run_details`, Supabase Logs, Insights
- Code lives in SQL functions / Edge Functions (TS) — already in stack
- Replay: query `cron.job_run_details` + manual re-trigger

## Sources

- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/database/extensions/pg_cron
- https://supabase.com/blog/processing-large-jobs-with-edge-functions
- https://dev.to/domoniqueluchin/building-a-self-healing-cron-system-with-pgcron-and-supabase-edge-functions-5420
- https://github.com/orgs/supabase/discussions/37574
- https://boringsql.com/posts/time-keepers-pg-cron-pg-timetable/

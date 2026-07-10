# CNPJ Backups — Lifecycle Runbook

**Bucket:** `cnpj-backups`
**Project:** remax-moema (ref `hculsnvpyccnekfyficu`)
**Visibility:** PRIVATE (`public: false`)
**Created:** 2026-05-25 by @devops (Gage), Story 7.5 infra prep
**Owner:** @devops
**Cadence:** Quarterly review (manual)

## Purpose

This bucket stores monthly CNPJ ETL backups (raw CSV/Parquet exports from Receita Federal CNPJ public dataset) consumed by the Story 7.x pipeline. Backups are retained for **12 months** to support reprocessing, regression debugging, and audit traceability. Older snapshots are pruned to control storage cost.

Per ADR-EPIC7-MVP-LOCAL-WAIVER (2026-05-23), the Epic 7 posture is MVP-LOCAL: no managed lifecycle automation in this phase. Lifecycle is enforced by a quarterly manual review documented here.

## Why manual (not pg_cron)

Supabase Storage does not expose S3-style lifecycle policies natively. The two automation options are:

1. `pg_cron` + `storage.objects` DELETE — feasible but adds a moving part for a single-bucket cleanup that runs 4x/year.
2. Manual quarterly review — aligns with MVP-LOCAL waiver, zero additional surface area to maintain.

Option 2 is chosen for the MVP. If/when CNPJ ETL stabilizes and Epic 7 graduates from MVP-LOCAL, revisit and implement a `pg_cron` job (see "Future automation" below).

## Quarterly review procedure

Run on the 1st business day of Jan / Apr / Jul / Oct.

### 1. List current objects

```bash
curl -sS -X POST "https://hculsnvpyccnekfyficu.supabase.co/storage/v1/object/list/cnpj-backups" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000, "offset": 0, "sortBy": {"column": "created_at", "order": "asc"}}'
```

### 2. Identify objects older than 365 days

For each object in the response, compare `created_at` to `NOW() - INTERVAL '365 days'`. Objects with `created_at < cutoff` are deletion candidates.

### 3. Delete expired objects

For each expired key:

```bash
curl -sS -X DELETE "https://hculsnvpyccnekfyficu.supabase.co/storage/v1/object/cnpj-backups/<key>" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### 4. Log the review

Append an entry to `docs/runbooks/cnpj-backups-lifecycle-log.md` (create on first run):

```
## YYYY-MM-DD — quarterly review
- Objects scanned: N
- Objects deleted (>365d): M
- Storage reclaimed (approx): X MB
- Reviewer: @devops
- Notes: ...
```

### 5. Verify

Re-list and confirm no object has `created_at` older than 365 days.

## Access control

- Bucket is `public: false` — only callers with the service-role JWT or signed URLs can read/write.
- The service-role key is exposed via the `SUPABASE_SERVICE_ROLE_KEY` GitHub Actions secret.
- The CNPJ ETL workflow uses the service-role key to write monthly snapshots. No anon-key access is permitted.

## Cron status

`CNPJ_ETL_ENABLED` GitHub secret is `false` as of 2026-05-25. The founder will flip it to `true` when the cron schedule is ready to go live. While disabled, no new objects accrue and quarterly review is a no-op.

## Future automation (post-MVP)

When Epic 7 graduates from MVP-LOCAL:

1. Create `pg_cron` job:

```sql
SELECT cron.schedule(
  'cnpj-backups-prune',
  '0 3 1 * *',  -- 03:00 UTC, 1st of month
  $$
  DELETE FROM storage.objects
  WHERE bucket_id = 'cnpj-backups'
    AND created_at < NOW() - INTERVAL '365 days';
  $$
);
```

2. Verify with `SELECT * FROM cron.job WHERE jobname = 'cnpj-backups-prune';`
3. Retire this manual procedure (keep this doc for historical context).

## Related

- ADR: `docs/architecture/adrs/ADR-EPIC7-MVP-LOCAL-WAIVER.md`
- Story: `docs/stories/7.5.story.md`
- GH secrets: `CNPJ_ETL_ENABLED`, `DATABASE_URL`, `SUPABASE_STORAGE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_REST_URL`

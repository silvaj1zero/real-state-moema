# CNPJ ETL Container — Epic 7 (Story 7.5)

Monthly ETL that hydrates `cnpj_enrichment` (Supabase) with a SP-only,
real-estate-CNAE subset of the RFB CNPJ public dump. Used by
`classifyAdvertiser` (Story 7.3) for Builder / Broker / Administradora /
Holding classification.

## Architecture

```
RFB (gov.br)
    │  PROPFIND WebDAV (rictom/cnpj-sqlite)
    ▼
[ download zips → sqlite ETL ]   ← scripts-upstream/*.py (pinned SHA)
    │
    ▼   /data/cnpj.db   (~30 GB)
[ filter_epic7_imobiliario.py ]  ← SP + 10 target CNAEs + situacao='02'
    │
    ▼   /data/cnpj-imobiliario-sp.db  (< 2 GB, ~50–100k rows)
[ push_supabase.sh ]              ← psql \copy → temp → INSERT ... ON CONFLICT
    │
    ▼
Supabase: public.cnpj_enrichment
```

## Files

| Path | Purpose |
|---|---|
| `Dockerfile` | python:3.11-slim image, pinned RICTOM_SHA via ARG |
| `requirements.txt` | Python deps (pandas, parfive, sqlalchemy — DASK discarded) |
| `filter_epic7_imobiliario.py` | NEW — SP + CNAE filter (verbatim list per ADR-EPIC7-005) |
| `entrypoint.sh` | Pipeline: download → etl → filter → push |
| `push_supabase.sh` | sqlite → CSV → temp staging → idempotent UPSERT |
| `restore_cnpj_db.sh` | Restore a monthly snapshot from Supabase Storage |
| `docker-compose.yml` | Local orchestration + persistent volume |
| `scripts-upstream/*.py` | STUBS — must be materialized from rictom/cnpj-sqlite at pinned SHA |
| `__tests__/test_filter.py` | Pytest unit tests (22 cases, offline fixture) |

## Setup (local dev)

```bash
cd infrastructure/cnpj-etl

# 1. Materialize the upstream scripts at the pinned SHA.
#    (Manual step until @devops automates `make refresh-upstream`.)
RICTOM_SHA=$(grep '^ARG RICTOM_SHA=' Dockerfile | cut -d= -f2)
curl -fsSL "https://raw.githubusercontent.com/rictom/cnpj-sqlite/${RICTOM_SHA}/dados_cnpj_baixa.py" \
  > scripts-upstream/dados_cnpj_baixa.py
curl -fsSL "https://raw.githubusercontent.com/rictom/cnpj-sqlite/${RICTOM_SHA}/dados_cnpj_para_sqlite.py" \
  > scripts-upstream/dados_cnpj_para_sqlite.py

# 2. Create .env
cat > .env <<EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
EOF

# 3. Build + run
docker compose build
docker compose run --rm cnpj-etl full-pipeline
```

**Disk + memory:** plan ≥40 GB free disk and ≥8 GB RAM. Total build time is
typically 90–120 minutes (most of it is the RFB download).

## Tests

```bash
# Run filter unit tests on the host (no Docker needed)
python -m pytest infrastructure/cnpj-etl/__tests__/ -v
```

22 cases, fully offline (synthetic sqlite fixture).

## Running individual stages

```bash
docker compose run --rm cnpj-etl download
docker compose run --rm cnpj-etl etl
docker compose run --rm cnpj-etl filter
docker compose run --rm cnpj-etl push
```

## Scheduling

Monthly schedule lives in `.github/workflows/cnpj-etl-monthly.yml`. **It is
guarded by `if: false`** — @devops enables it after upstream scripts are
materialized and a self-hosted runner is provisioned.

Cron: `0 2 20 * *` (day 20 of each month, 02:00 UTC, margin for RFB monthly
release on days 5–15).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `dados_cnpj_baixa.py: stub` exit 70 | scripts-upstream not materialized | Run the `curl` block in Setup §1 |
| Container exits 4 from filter | Filtered count = 0 — RFB schema changed | Inspect /data/cnpj.db tables; bump RICTOM_SHA if upstream has a fix |
| `share_token` expired | RFB rotated their WebDAV token | Re-detect via PROPFIND; patch upstream config |
| Build > 4h | Network slow OR runner undersized | Move to Hetzner CPX21; alert in AC7 telemetry |
| `psql ... duplicate key` | Should not happen — UPSERT is idempotent | Inspect CSV for malformed cnpj rows |

## Story refs

- Story: `docs/stories/7.5.story.md`
- ADR: `docs/architecture/adrs/ADR-EPIC7-005-cnpj-etl.md` (referenced)
- Anatomy: `docs/code-anatomy/rictom-cnpj-sqlite/extraction-notes.md`
- PoC: `docs/poc/7.5-cnpj-etl-smoke.md`
- Migration: `supabase/migrations/20260514000004_011_epic7_cnpj_enrichment.sql`

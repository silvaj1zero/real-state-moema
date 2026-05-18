#!/usr/bin/env bash
# =============================================================================
# push_supabase.sh — UPSERT filtered CNPJ DB into Supabase cnpj_enrichment
#
# Strategy (idempotent):
#   1. Export filtered sqlite to CSV.
#   2. psql \copy into a temp staging table.
#   3. INSERT ... ON CONFLICT (cnpj) DO UPDATE — re-run safe.
#
# Env:
#   DATABASE_URL   — full Postgres connection string (required)
# =============================================================================
set -euo pipefail

DB_FILTERED="${1:-/data/cnpj-imobiliario-sp.db}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

log() { printf "[push_supabase] %s\n" "$*"; }

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL must be set" >&2
  exit 2
fi
if [ ! -f "$DB_FILTERED" ]; then
  echo "ERROR: filtered DB not found: $DB_FILTERED" >&2
  exit 2
fi

CSV_OUT="$WORKDIR/cnpj_enrichment.csv"
SQL_FILE="$WORKDIR/upsert.sql"

log "exporting sqlite -> $CSV_OUT"
sqlite3 -bail "$DB_FILTERED" <<SQL > "$CSV_OUT"
.mode csv
.headers off
SELECT
  printf('%08s%04s%02s', estab.cnpj_basico, estab.cnpj_ordem, estab.cnpj_dv),
  empresas.razao_social,
  estab.nome_fantasia,
  estab.cnae_fiscal,
  COALESCE(estab.cnae_fiscal_secundaria, ''),
  estab.uf,
  estab.municipio,
  estab.situacao_cadastral,
  estab.data_situacao_cadastral
FROM estabelecimento estab
JOIN empresas ON empresas.cnpj_basico = estab.cnpj_basico;
SQL

ROWS=$(wc -l < "$CSV_OUT" | tr -d ' ')
log "csv rows: $ROWS — running staged upsert"

cat > "$SQL_FILE" <<'PSQL'
BEGIN;

CREATE TEMP TABLE _stg_cnpj (
  cnpj                TEXT,
  razao_social        TEXT,
  nome_fantasia       TEXT,
  cnae_primario       TEXT,
  cnaes_secundarios   TEXT,
  uf                  TEXT,
  municipio           TEXT,
  situacao_cadastral  TEXT,
  data_situacao       TEXT
) ON COMMIT DROP;

\copy _stg_cnpj FROM :'csv_in' WITH (FORMAT csv);

INSERT INTO cnpj_enrichment AS tgt (
  cnpj, razao_social, nome_fantasia, cnae_primario,
  cnaes_secundarios, uf, municipio, situacao_cadastral, data_situacao
)
SELECT
  s.cnpj,
  NULLIF(s.razao_social, ''),
  NULLIF(s.nome_fantasia, ''),
  s.cnae_primario,
  CASE WHEN s.cnaes_secundarios IS NULL OR s.cnaes_secundarios = ''
       THEN ARRAY[]::TEXT[]
       ELSE string_to_array(s.cnaes_secundarios, ',')
  END,
  NULLIF(s.uf, ''),
  NULLIF(s.municipio, ''),
  NULLIF(s.situacao_cadastral, ''),
  NULLIF(s.data_situacao, '')::DATE
FROM _stg_cnpj s
WHERE length(s.cnpj) = 14 AND s.cnae_primario IS NOT NULL AND s.cnae_primario <> ''
ON CONFLICT (cnpj) DO UPDATE SET
  razao_social       = EXCLUDED.razao_social,
  nome_fantasia      = EXCLUDED.nome_fantasia,
  cnae_primario      = EXCLUDED.cnae_primario,
  cnaes_secundarios  = EXCLUDED.cnaes_secundarios,
  uf                 = EXCLUDED.uf,
  municipio          = EXCLUDED.municipio,
  situacao_cadastral = EXCLUDED.situacao_cadastral,
  data_situacao      = EXCLUDED.data_situacao,
  updated_at         = now();

COMMIT;
PSQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v csv_in="$CSV_OUT" -f "$SQL_FILE"
log "upsert complete — re-runs are idempotent"

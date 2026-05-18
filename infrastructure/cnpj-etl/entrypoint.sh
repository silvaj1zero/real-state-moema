#!/usr/bin/env bash
# =============================================================================
# CNPJ ETL — entrypoint
# Pipeline: download (RFB) -> ETL (rictom) -> filter (Epic 7) -> validate -> push
# =============================================================================
set -euo pipefail

PASTA_ZIP="${PASTA_ZIP:-/data/dados-publicos-zip}"
PASTA_SAIDA="${PASTA_SAIDA:-/data/dados-publicos}"
DB_FILE="${DB_FILE:-/data/cnpj.db}"
DB_FILTERED="${DB_FILTERED:-/data/cnpj-imobiliario-sp.db}"
LOG_PREFIX="[cnpj-etl]"

log() { printf "%s %s\n" "$LOG_PREFIX" "$*"; }

ensure_dirs() {
  mkdir -p "$PASTA_ZIP" "$PASTA_SAIDA"
}

step_download() {
  log "step 1/4 — downloading RFB CNPJ zips to $PASTA_ZIP"
  python /app/dados_cnpj_baixa.py
}

step_etl() {
  log "step 2/4 — converting RFB zips to sqlite ($DB_FILE)"
  python /app/dados_cnpj_para_sqlite.py
}

step_filter() {
  log "step 3/4 — filtering to Epic 7 SP imobiliario ($DB_FILTERED)"
  python /app/filter_epic7_imobiliario.py --src "$DB_FILE" --dst "$DB_FILTERED"
}

step_push() {
  log "step 4/4 — pushing filtered DB to Supabase cnpj_enrichment"
  if [ -z "${DATABASE_URL:-}" ]; then
    log "DATABASE_URL not set — skipping push (filtered DB at $DB_FILTERED)"
    return 0
  fi
  /app/push_supabase.sh "$DB_FILTERED"
}

cmd="${1:-full-pipeline}"
ensure_dirs

case "$cmd" in
  download)        step_download ;;
  etl)             step_etl ;;
  filter)          step_filter ;;
  push)            step_push ;;
  full-pipeline)
    step_download
    step_etl
    step_filter
    step_push
    log "pipeline complete"
    ;;
  *)
    echo "usage: $0 {download|etl|filter|push|full-pipeline}" >&2
    exit 64
    ;;
esac

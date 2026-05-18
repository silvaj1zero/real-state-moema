#!/usr/bin/env bash
# =============================================================================
# restore_cnpj_db.sh — Restore a snapshot of cnpj-imobiliario-sp.db
# Pairs with the monthly backup step at end of full-pipeline (AC9).
#
# Default backend: Supabase Storage bucket "cnpj-backups" (private).
# Override SUPABASE_STORAGE_URL + SERVICE_ROLE_KEY env vars.
# =============================================================================
set -euo pipefail

SNAPSHOT="${1:?usage: restore_cnpj_db.sh <YYYY-MM>}"
DEST="${2:-/data/cnpj-imobiliario-sp.db}"
BUCKET="${BUCKET:-cnpj-backups}"

if [ -z "${SUPABASE_STORAGE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: set SUPABASE_STORAGE_URL and SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 2
fi

URL="${SUPABASE_STORAGE_URL%/}/object/${BUCKET}/cnpj-imobiliario-sp-${SNAPSHOT}.db"
echo "[restore] GET $URL -> $DEST"
curl -fSL \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -o "$DEST" "$URL"

# Quick integrity check
sqlite3 -bail "$DEST" "SELECT count(*) FROM estabelecimento"
echo "[restore] OK — snapshot $SNAPSHOT restored to $DEST"

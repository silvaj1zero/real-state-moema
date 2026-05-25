#!/usr/bin/env bash
# =============================================================================
# backup_to_storage.sh — Story 7.5 AC9
# Dumps cnpj_enrichment to gzipped SQL and uploads it to Supabase Storage
# (private bucket "cnpj-backups"). Pairs with restore_cnpj_db.sh.
#
# Retention: lifecycle policy on the bucket (12 months) — set in Supabase
# console once at bucket-create time. This script is responsible only for
# producing date-stamped snapshots.
#
# Env (required):
#   DATABASE_URL                Postgres connection string for pg_dump
#   SUPABASE_STORAGE_URL        e.g. https://<ref>.supabase.co/storage/v1
#   SUPABASE_SERVICE_ROLE_KEY   service_role key (Storage write requires it)
#
# Env (optional):
#   BUCKET_NAME                 defaults to "cnpj-backups"
#   SNAPSHOT_DATE               defaults to UTC date YYYY-MM-DD
# =============================================================================
set -euo pipefail

BUCKET="${BUCKET_NAME:-cnpj-backups}"
SNAPSHOT_DATE="${SNAPSHOT_DATE:-$(date -u +%Y-%m-%d)}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

log() { printf "[backup_to_storage] %s\n" "$*"; }

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "ERROR: env var $name is required" >&2
    exit 2
  fi
}

require DATABASE_URL
require SUPABASE_STORAGE_URL
require SUPABASE_SERVICE_ROLE_KEY

DUMP_FILE="$WORKDIR/cnpj_enrichment-${SNAPSHOT_DATE}.sql.gz"
OBJECT_KEY="cnpj_enrichment-${SNAPSHOT_DATE}.sql.gz"
URL="${SUPABASE_STORAGE_URL%/}/object/${BUCKET}/${OBJECT_KEY}"

log "dumping cnpj_enrichment -> $DUMP_FILE"
pg_dump \
  --no-owner --no-privileges \
  --table=public.cnpj_enrichment \
  --format=plain \
  "$DATABASE_URL" \
  | gzip -9 > "$DUMP_FILE"

SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
log "dump size: ${SIZE} bytes — uploading to $URL"

# Use POST first (create); fall back to PUT (overwrite) if the object already
# exists. -f makes curl exit non-zero on HTTP >= 400 so set -e catches errors.
HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST "$URL" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/gzip" \
  --data-binary "@${DUMP_FILE}") || true

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  log "upload OK ($HTTP_CODE) — snapshot=$SNAPSHOT_DATE bucket=$BUCKET"
elif [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
  log "object exists ($HTTP_CODE) — retrying with PUT (overwrite)"
  curl -fSs -X PUT "$URL" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/gzip" \
    --data-binary "@${DUMP_FILE}" >/dev/null
  log "overwrite OK — snapshot=$SNAPSHOT_DATE bucket=$BUCKET"
else
  echo "ERROR: upload failed with HTTP $HTTP_CODE" >&2
  exit 4
fi

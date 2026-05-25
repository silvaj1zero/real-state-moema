#!/usr/bin/env bash
# =============================================================================
# cnpj-emit-telemetry.sh — Story 7.5 AC7
#
# Inserts or updates a row in `crawl_runs` via Supabase REST API, using the
# service_role key. Called from .github/workflows/cnpj-etl-monthly.yml at
# three points per pipeline run:
#   1) status=running     (open: INSERT, emits run_id on stdout)
#   2) status=completed   (close on success: PATCH set finished_at)
#   3) status=failed      (close on failure: PATCH set finished_at + error_message)
#
# Env (required):
#   SUPABASE_REST_URL          e.g. https://<ref>.supabase.co/rest/v1
#   SUPABASE_SERVICE_ROLE_KEY  service_role key (RLS bypass for crawl_runs)
#   CRAWL_PORTAL               portal label (this script always uses 'cnpj-etl')
#   CRAWL_STATUS               running | completed | failed
#
# Env (conditional):
#   CRAWL_RUN_ID         required when CRAWL_STATUS != 'running' (close existing row)
#   CRAWL_ERROR_MESSAGE  optional, included when CRAWL_STATUS = 'failed'
#   CRAWL_RETRY_COUNT    optional, integer, defaults to 0
#
# Outputs (running mode only):
#   - prints the new run id to stdout
#   - when GITHUB_OUTPUT is set, also writes `run_id=<uuid>` for step outputs
# =============================================================================
set -euo pipefail

log() { printf "[cnpj-emit-telemetry] %s\n" "$*" >&2; }

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "ERROR: env var $name is required" >&2
    exit 2
  fi
}

require SUPABASE_REST_URL
require SUPABASE_SERVICE_ROLE_KEY
require CRAWL_STATUS

PORTAL="${CRAWL_PORTAL:-cnpj-etl}"
RETRY_COUNT="${CRAWL_RETRY_COUNT:-0}"
REST_URL="${SUPABASE_REST_URL%/}"
ENDPOINT="${REST_URL}/crawl_runs"
AUTH_HEADER="Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
APIKEY_HEADER="apikey: ${SUPABASE_SERVICE_ROLE_KEY}"

case "$CRAWL_STATUS" in
  running)
    log "opening crawl_runs row (portal=${PORTAL})"
    BODY=$(printf '{"portal":"%s","status":"running","started_at":"%s"}' \
      "$PORTAL" "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
    RESPONSE=$(curl -fSs \
      -X POST "$ENDPOINT" \
      -H "$AUTH_HEADER" \
      -H "$APIKEY_HEADER" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$BODY")
    # Parse id without jq dependency (REST returns array of one object).
    RUN_ID=$(printf '%s' "$RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)
    if [ -z "$RUN_ID" ]; then
      echo "ERROR: could not extract run_id from response: $RESPONSE" >&2
      exit 3
    fi
    echo "$RUN_ID"
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
      echo "run_id=$RUN_ID" >> "$GITHUB_OUTPUT"
    fi
    log "opened run_id=$RUN_ID"
    ;;

  completed|failed)
    require CRAWL_RUN_ID
    log "closing crawl_runs id=${CRAWL_RUN_ID} status=${CRAWL_STATUS}"
    FINISHED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    if [ "$CRAWL_STATUS" = "failed" ]; then
      ERROR_MSG="${CRAWL_ERROR_MESSAGE:-CNPJ ETL run failed}"
      # Escape embedded double-quotes for JSON safety.
      ERROR_MSG_ESC=${ERROR_MSG//\"/\\\"}
      BODY=$(printf '{"status":"%s","finished_at":"%s","error_message":"%s"}' \
        "$CRAWL_STATUS" "$FINISHED_AT" "$ERROR_MSG_ESC")
    else
      BODY=$(printf '{"status":"%s","finished_at":"%s"}' \
        "$CRAWL_STATUS" "$FINISHED_AT")
    fi
    curl -fSs \
      -X PATCH "${ENDPOINT}?id=eq.${CRAWL_RUN_ID}" \
      -H "$AUTH_HEADER" \
      -H "$APIKEY_HEADER" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$BODY" >/dev/null
    log "closed run_id=$CRAWL_RUN_ID (retry_count=$RETRY_COUNT)"
    ;;

  *)
    echo "ERROR: unsupported CRAWL_STATUS=$CRAWL_STATUS (expected: running|completed|failed)" >&2
    exit 2
    ;;
esac

#!/usr/bin/env bash
# Sync shared scrapers + schemas from app/src/lib/{scrapers,schemas}/ into
# this Actor's src/shared/. Run BEFORE `npm run build`.
#
# Rationale (ADR-EPIC7-006): Apify Actors precisam de TS puro standalone
# (sem Next.js imports). Mantemos a SoT em app/ e copiamos por sync para
# evitar duplicacao de logica.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ACTOR_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
REPO_ROOT="$( cd "$ACTOR_ROOT/../../.." && pwd )"

APP_SCRAPERS="$REPO_ROOT/app/src/lib/scrapers"
APP_SCHEMAS="$REPO_ROOT/app/src/lib/schemas/epic7"

DEST_BASE="$ACTOR_ROOT/src/shared"

if [ ! -d "$APP_SCRAPERS" ]; then
  echo "ERROR: source app/src/lib/scrapers not found at $APP_SCRAPERS" >&2
  exit 1
fi

echo "==> Syncing shared modules from $APP_SCRAPERS"
echo "==> Destination: $DEST_BASE"

rm -rf "$DEST_BASE"
mkdir -p "$DEST_BASE/scrapers/hooks"
mkdir -p "$DEST_BASE/scrapers/mercadolivre"
mkdir -p "$DEST_BASE/schemas/epic7"

# Scraper core (PortalCrawler + Telemetry + Classifier)
cp "$APP_SCRAPERS/portal-crawler.ts" "$DEST_BASE/scrapers/"
cp "$APP_SCRAPERS/telemetry.ts"      "$DEST_BASE/scrapers/"
cp "$APP_SCRAPERS/classify-advertiser.ts" "$DEST_BASE/scrapers/"
cp "$APP_SCRAPERS/index.ts"          "$DEST_BASE/scrapers/"

# Hooks
cp "$APP_SCRAPERS/hooks/"*.ts "$DEST_BASE/scrapers/hooks/" 2>/dev/null || true

# MercadoLivre parsers
cp "$APP_SCRAPERS/mercadolivre/"*.ts "$DEST_BASE/scrapers/mercadolivre/"

# Schemas Epic 7
cp "$APP_SCHEMAS/"*.ts "$DEST_BASE/schemas/epic7/"

# Reescreve aliases `@/lib/schemas/epic7` para path relativos.
# (Em produtos Apify nao temos resolver de alias TS — paths devem ser relativos.)
find "$DEST_BASE" -name "*.ts" -print0 | while IFS= read -r -d '' f; do
  sed -i.bak \
    -e "s|@/lib/schemas/epic7|../../schemas/epic7|g" \
    -e "s|@/lib/scrapers|../../scrapers|g" \
    "$f"
  rm -f "$f.bak"
done

echo "==> Sync done. Files:"
find "$DEST_BASE" -type f -name "*.ts" | sort

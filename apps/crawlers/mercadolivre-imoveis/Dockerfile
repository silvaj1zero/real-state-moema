# Apify base image com Playwright + Chromium ja instalado.
# Ref: https://docs.apify.com/sdk/js/docs/guides/docker-images
FROM apify/actor-node-playwright-chrome:20

# --- Dependencies ---
COPY --chown=myuser package*.json ./
RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional \
 && echo "installed npm packages:" \
 && (npm list --omit=dev --all || true) \
 && echo "nodejs version:" \
 && node --version \
 && echo "npm version:" \
 && npm --version

# --- Source ---
COPY --chown=myuser . ./

# Sincroniza modulos shared (parsers + classifier + schemas) ANTES do build.
# scripts/sync-shared.sh copia de ../../app/src/lib/{scrapers,schemas}/ para src/shared/.
# Em build local, rode `npm run sync:shared` antes; em CI, o passo e parte do pipeline.
RUN if [ -d src/shared ]; then echo "shared present"; else echo "WARN: src/shared missing — run sync:shared"; fi

# --- Build TS -> JS ---
RUN npm run build

# --- Run ---
CMD ["npm", "start"]

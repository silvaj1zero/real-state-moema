# syntax=docker/dockerfile:1.6
# =============================================================================
# CNPJ ETL Container — Epic 7 Story 7.5
# Base: python:3.11-slim
# Upstream: rictom/cnpj-sqlite (MIT) — pinned to commit SHA below
# Builds: cnpj-imobiliario-sp.db filtered to 10 real-estate CNAEs (SP only)
# =============================================================================
FROM python:3.11.9-slim AS base

# ---- Upstream pin (rictom/cnpj-sqlite) ----
# Pinning to a specific SHA (Article IV — No Invention). When upstream releases
# new pipeline tested against current RFB schema, bump SHA here AFTER PoC re-run.
# Reference: https://github.com/rictom/cnpj-sqlite
ARG RICTOM_SHA=4e1b9c5b0a1b8e0f5a3c8d7e2f1a9b6c4d3e8f0a
LABEL org.opencontainers.image.source="https://github.com/rictom/cnpj-sqlite"
LABEL org.opencontainers.image.revision="${RICTOM_SHA}"
LABEL org.opencontainers.image.title="cnpj-etl-epic7"
LABEL org.opencontainers.image.description="RFB CNPJ ETL filtered to SP real-estate CNAEs"
LABEL org.opencontainers.image.licenses="MIT"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PASTA_ZIP=/data/dados-publicos-zip \
    PASTA_SAIDA=/data/dados-publicos \
    DB_FILE=/data/cnpj.db \
    DB_FILTERED=/data/cnpj-imobiliario-sp.db

# System deps: sqlite3 (CLI for validation), postgresql-client (psql for push),
# ca-certificates (TLS to RFB host), curl (download upstream scripts on build)
# hadolint ignore=DL3008
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      sqlite3 \
      postgresql-client \
      ca-certificates \
      curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies (pinned via requirements.txt)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Upstream scripts (copied locally with SHA pin comment header — see
# scripts-upstream/*.py). NOT fetched at build time to keep image reproducible
# without network. To refresh, see infrastructure/cnpj-etl/README.md.
COPY scripts-upstream/dados_cnpj_baixa.py /app/dados_cnpj_baixa.py
COPY scripts-upstream/dados_cnpj_para_sqlite.py /app/dados_cnpj_para_sqlite.py

# Epic 7 — new filter + orchestration
COPY filter_epic7_imobiliario.py /app/filter_epic7_imobiliario.py
COPY entrypoint.sh /app/entrypoint.sh
COPY push_supabase.sh /app/push_supabase.sh

RUN chmod +x /app/entrypoint.sh /app/push_supabase.sh

# Volume for RFB zips + sqlite DBs (persistent across runs)
VOLUME ["/data"]

# Run as non-root for least privilege
RUN groupadd -r cnpj && useradd -r -g cnpj -d /app -s /sbin/nologin cnpj \
 && chown -R cnpj:cnpj /app
USER cnpj

# Healthcheck: confirms sqlite + python are usable
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import sqlite3; sqlite3.connect(':memory:').execute('SELECT 1')" || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["full-pipeline"]

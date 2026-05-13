---
paths:
  - "supabase/**"
  - "**/migrations/**"
  - "**/db/**"
  - "scripts/db/**"
  - "infrastructure/db/**"
---

# Supabase Backup Protocol

Thin lazy-loaded rule. Promoted from heuristic AN_KE_068 (archived as Supabase-specific tooling).

## When to Load

Load this rule only when you are about to:

- Create a backup of production data in Supabase
- Migrate data between Supabase environments
- Snapshot tables for any reason (dev, debug, audit, test)

## Rule

**SE** precisa criar backup de dados em produção no Supabase **ENTÃO** baixe `dump`/CSV para storage local ou S3. **NUNCA** clone tabelas nativamente no banco (`CREATE TABLE x_backup AS SELECT * FROM x`).

## Why

- Tabelas duplicadas em produção: poluem metadata, confundem agents que listam schema, ocupam espaço, criam ambiguidade sobre qual é a "real"
- Backups locais: não impactam runtime, são versionáveis (git LFS / S3 versioning), rastreáveis, restauráveis
- Dump tradicional (`pg_dump`) é a ferramenta certa, não SQL clone

## Anti-Pattern

```sql
-- ERRADO — duplicação dentro do banco
CREATE TABLE users_backup_2026 AS SELECT * FROM users;
CREATE TABLE users_old AS SELECT * FROM users;
```

## Correct Path

```bash
# Dump completo
supabase db dump --file backup-2026-04-27.sql

# Tabela específica via pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump --host=$DB_HOST --port=$DB_PORT \
  --username=$DB_USER --table=users --data-only \
  --file=users-backup-2026-04-27.sql

# CSV específico (para análise)
psql -c "\COPY users TO 'users-2026-04-27.csv' CSV HEADER"
```

## Restore

Backups locais devem ter um caminho de restore documentado. Se o backup nunca foi testado para restore, é um placebo.

## Source

- Original heuristic: AN_KE_068 (archived 2026-04-27 v3.13.0 — Supabase-specific tooling pattern)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_068-archived-v3.13.0-supabase-specific.md`
- Authority: `@db-sage` owns DB operations (`.claude/rules/agent-authority.md`)

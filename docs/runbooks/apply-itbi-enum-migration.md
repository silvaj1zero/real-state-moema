# Runbook — Aplicar a migration do enum `itbi` no remoto (Supabase)

**Migration:** `supabase/migrations/20260615000001_add_itbi_fonte_comparavel.sql`
**Statement:** `ALTER TYPE fonte_comparavel ADD VALUE IF NOT EXISTS 'itbi';` (idempotente)
**Owner:** @devops / @data-engineer
**Projeto remoto:** ref `hculsnvpyccnekfyficu`
**Criado:** 2026-06-15

---

## Por que NÃO usar `supabase db push`

O histórico de migrations do remoto está **dessincronizado**: o `schema_migrations` do banco registra ~2-3 versões, mas há ~20 migrations locais "antes da última do remoto". Um `supabase db push` exige `--include-all` e **re-executaria as 20 migrations** (muitas não-idempotentes: `CREATE TABLE`, `CREATE TYPE`) contra um banco que **já tem** esse schema → quebra/corrompe. Confirmado em dry-run (2026-06-15).

Além disso, o CLI tem um **scaffold perdido** em `C:\Users\Zero\supabase` que captura o workdir; e o `config.toml`/link do projeto está aninhado em `supabase\supabase\`. Qualquer uso do CLI exige `--workdir` explícito.

## Bloqueio atual

A `DATABASE_URL` em `app/.env.local` (conexão direta `db.<ref>.supabase.co:5432`) retorna **`password authentication failed`** — senha desatualizada. **Pré-requisito:** uma connection string válida.

---

## Pré-requisito — obter credencial válida

No Supabase Dashboard → **Project Settings → Database → Connection string**:
- Preferir o **Session pooler** (IPv4, host `aws-1-...pooler.supabase.com`, **porta 5432**) — alinhado ao note `feedback_supabase-pooler` do projeto. (Transaction pooler porta 6543 também roda o `ALTER TYPE` por ser statement único, mas Session pooler é mais seguro para DDL.)
- Copiar a URI completa com a senha atual (resetar a DB password se necessário).

> **Não** commitar a senha. Passe via parâmetro/variável de ambiente efêmera.

---

## Procedimento seguro (opção recomendada — cirúrgico)

Aplica só o statement idempotente, sem tocar no histórico nem em outras migrations.

```powershell
# 1. Connection string válida numa env var efêmera (NÃO commitar)
$env:ACM_DB_URL = "postgresql://postgres.<ref>:<SENHA>@aws-1-<region>.pooler.supabase.com:5432/postgres"

# 2. Dry-check + apply + verify (script idempotente)
pwsh ./scripts/apply-itbi-enum.ps1            # mostra enum atual, aplica, reconfirma
#   ou forçando a URL por parâmetro:
pwsh ./scripts/apply-itbi-enum.ps1 -DbUrl $env:ACM_DB_URL
```

O script: testa conexão → lista valores atuais do enum → roda o `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'itbi'` → reconfirma que `itbi` aparece. Como é idempotente, rodar 2x é seguro.

### Registrar no histórico de migrations (opcional, recomendado)

Para um futuro `db push` não tentar reaplicar:

```bash
supabase --workdir "C:/Users/Zero/Desktop/Real State - Moema" migration repair \
  --status applied 20260615000001
```

---

## Procedimento alternativo (reconciliar histórico inteiro)

Só se quiser destravar o `supabase db push` de vez. **Não-destrutivo** (mexe apenas no bookkeeping `schema_migrations`, não no schema):

```bash
cd "C:/Users/Zero/Desktop/Real State - Moema"
# Marcar como aplicadas as migrations que JÁ existem no schema remoto (lista do dry-run):
supabase --workdir "$(pwd)" migration repair --status applied \
  20260318000001 20260318000002 20260318000003 20260318000004 \
  20260318233614 20260414000001 20260418000001 \
  20260514000001 20260514000002 20260514000003 20260514000004 20260514000005 \
  20260514000006 20260514000007 20260514000008 20260514000009 \
  20260519000001 20260519000002 20260519000003 20260524000001
# Depois, só a nova será pendente:
supabase --workdir "$(pwd)" db push        # aplica apenas 20260615000001
```

> ⚠️ Validar a lista contra `supabase ... migration list` antes — não marcar como aplicada uma migration que NÃO esteja no schema remoto (causaria skip de DDL real).

---

## Verificação final (qualquer procedimento)

```sql
SELECT enumlabel FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'fonte_comparavel'
ORDER BY e.enumsortorder;
-- Esperado: manual, scraping, captei, cartorio, itbi
```

Depois disso, o engine pode rodar `python push_acm_supabase.py --bairro moema --apply` com `ACM_FONTE=itbi` (handoff Sec. 4). Sem a migration, usar `ACM_FONTE=cartorio` como fallback.

---

## Migration irmã — campos da metodologia (Story 8.1)

`supabase/migrations/20260615000002_acm_methodology_fields.sql` (só `ADD COLUMN IF NOT EXISTS` + backfill — idempotente, seguro) deve ser aplicada na **mesma janela** (mesmo bloqueio de credencial). Aplicar direto via psql com a mesma `ACM_DB_URL`:

```powershell
& $psql $env:ACM_DB_URL -v ON_ERROR_STOP=1 -f "supabase/migrations/20260615000002_acm_methodology_fields.sql"
```

> ⚠️ As colunas novas só recebem dado quando o **sink do engine** for atualizado para mapeá-las (ver Story 8.1 — "Mudança de sink"). Até lá, ficam NULL (sem quebrar a UI/CSV atuais).


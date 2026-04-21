# Session Handoff — 21 Abr 2026 (madrugada)

## TL;DR para amanhã

**O app está em estado limpo (Plano B), mas bloqueado por 1 passo manual seu:**

1. Abrir https://supabase.com/dashboard/project/hculsnvpyccnekfyficu/sql/new
2. Colar o conteúdo de `docs/UNBLOCK-POSTGREST.sql` → Run
3. Testar: `curl -H "Authorization: Bearer $CRON_SECRET" https://real-state-moema.vercel.app/api/health/db`
4. Se todos os checks vierem `ok: true`, **está tudo funcionando**. Continuar com P3/P4/P5.

## O que aconteceu nesta sessão

### Plano A (postgres.js direto) — ABANDONADO

Tentativa de bypass do PostgREST via conexão SQL direta:

1. `.trim()` em `DB_HOST`/`DB_PASSWORD` resolveu o erro `ENOTFOUND` (DNS OK).
2. Endpoint `/api/health/db` criado para validação.
3. **Bloqueador final:** autenticação Postgres falha (`28P01`).
   - Testado localmente com pooler (5432, 6543) e conexão direta — todos rejeitam.
   - **3 resets consecutivos** da senha do Supabase (`orO46uXJ8y9totx7`, `xybkKditcr3xvlYT`, `NUMJ7ZPYLdPE461n`) — **nenhum autentica**.
   - Supavisor reconhece o tenant (project ref correto), mas recusa a senha.
   - Hipótese principal: bug no reset do dashboard Supabase OU Supavisor com cache de credenciais desatualizado.
   - Tax ID/billing foi corrigido no meio do processo (CNPJ 10.429.885/0001-00), sem efeito sobre o reset.

### Plano B (supabase-js + service_role) — IMPLEMENTADO

Abandonado o postgres.js. Retorno a `createAdminClient()` (autentica via service role JWT, não depende da senha do DB).

**Código revertido:**
- `/api/search/local` → `.rpc('fn_scraped_listings_parametric', ...)`
- `/api/search/history` → `.from('portal_searches').select()`
- `/api/search/parametric` → mantido (já era supabase-js)
- `/api/search/parametric/[searchId]` → mantido
- `lib/db.ts` → **deletado** (não há mais uso de postgres.js direto)
- `/api/health/db` → **reescrito** para diagnosticar o schema cache do PostgREST (não mais conexão SQL)
- Middleware mantém bypass para `/api/health` e `/api/cron` (úteis, com auth própria).

### Novo bloqueador: schema cache do PostgREST

Confirmado via curl ao REST API:

| Recurso | Status via PostgREST |
|---|---|
| `public.consultores` | 200 OK |
| `public.scraped_listings` | 200 OK (mas sem colunas novas do Epic 6) |
| `public.scraped_listings.nome_anunciante` | 400 `42703 column does not exist` |
| `public.portal_searches` | 404 `PGRST205 not in cache` |
| `public.fn_scraped_listings_parametric` | 404 `PGRST202 not in cache` |

O cache do PostgREST está preso numa versão pre-Epic 6. Sem destravar, Epic 6 **não funciona** (busca paramétrica, histórico, enriquecimento).

**Destravamento requer SQL rodado via SQL Editor** (sua sessão de dashboard) — eu não consigo, pois `pg_notify` não está no cache nem há acesso direto ao banco.

Ver `docs/UNBLOCK-POSTGREST.sql` — tem 3 passos em ordem crescente de agressividade.

## Estado da infra

### Vercel
- **Último deploy:** commit `e638d21` + mudanças desta sessão (via `vercel --prod`).
- **URL:** https://real-state-moema.vercel.app
- **Env vars em uso:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAPBOX_TOKEN`, `APIFY_TOKEN`, `CRON_SECRET`.
- **Env vars mortos (podem ser removidos):** `DB_HOST`, `DB_PASSWORD` — não são mais lidos por nenhum código.

### Supabase
- **Projeto:** remax-moema (`hculsnvpyccnekfyficu`)
- **Billing:** OK — tax ID (CNPJ) preenchido.
- **Senha do DB:** DESCONHECIDA — 3 resets aparentemente não foram aplicados. **Não é bloqueador** para o Plano B.
- **Schema cache:** travado em versão pre-Epic 6. Destrava via `docs/UNBLOCK-POSTGREST.sql`.

## Passos para você amanhã (em ordem)

### 1. Destravar schema cache (5 min)
Abrir `docs/UNBLOCK-POSTGREST.sql`, copiar PASSO 1 e rodar no SQL Editor. Testar `/api/health/db` (precisa `CRON_SECRET`). Se `ok`, pular para passo 3.

Se PASSO 1 não destravar, tentar PASSO 2. Se nem isso, PASSO 3 (restart do projeto).

### 2. Validar
```bash
CRON_SECRET=$(grep "^CRON_SECRET=" app/.env.local | cut -d= -f2-)
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://real-state-moema.vercel.app/api/health/db | jq
```
Todos os `checks.*.ok` devem ser `true`.

### 3. Limpar env vars mortas (opcional, 1 min)
```bash
cd app
vercel env rm DB_HOST production --yes
vercel env rm DB_PASSWORD production --yes
```

### 4. Reset de senha (não urgente)
Se algum dia precisar da senha do DB de novo, abrir ticket no Supabase sobre o reset não aplicar. O service_role (JWT) cobre tudo que o app precisa.

### 5. Retomar roadmap

| # | Pendência | Status |
|---|---|---|
| P3 | Feature "Quem é o dono?" (GeoSampa + Infosimples) | Planejar — 1-2 stories |
| P4 | Captei CSV — contato@captei.com.br sobre API | Já temos Story 4.7 pronta |
| P5 | Audit técnico AIOX (@qa + @architect) | Inclui os RLS warnings que vieram na Security Advisor |

## Commits desta sessão

| Commit | Descrição |
|---|---|
| `e638d21` | feat: add /api/health/db endpoint to validate direct Postgres connection |
| `{próximo}` | (pendente) refactor: revert to supabase-js after DB password reset failed |

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `app/src/lib/db.ts` | DELETADO |
| `app/src/app/api/search/local/route.ts` | postgres.js → `.rpc('fn_scraped_listings_parametric')` |
| `app/src/app/api/search/history/route.ts` | postgres.js → `.from('portal_searches')` |
| `app/src/app/api/health/db/route.ts` | postgres.js → diagnóstico do schema cache PostgREST |
| `app/src/lib/supabase/middleware.ts` | bypass `/api/health` e `/api/cron` |
| `docs/UNBLOCK-POSTGREST.sql` | NOVO — script de destravamento |
| `docs/HANDOFF-SESSION-20260421.md` | NOVO — este arquivo |

# Session Handoff — 20 Abr 2026

## Resumo da Sessao

Sessao focada em Epic 6 (Busca Parametrica) + melhorias de raio/integracao mapa + resolucao de problemas de deploy e infraestrutura.

## O que foi feito

### Epic 6 — Busca Parametrica On-Demand (COMPLETO no codigo)
- **5 stories implementadas** (6.1-6.5), 29 arquivos, ~4.000 linhas
- **Story 6.1:** Schema SQL — 2 tabelas (portal_searches, portal_search_results), 2 RPCs, 6 RLS policies, 7 colunas contato
- **Story 6.2:** API routes — POST/GET /api/search/parametric, apify-parametric.ts, rate limit, post-filtering
- **Story 6.3:** UI — Tela /search com filtros, resultados, historico, progress bar, 8 componentes
- **Story 6.4:** Enriquecimento — contact-enrichment.ts, ViaCEP, CRECI, ContactDataCard, LGPD
- **Story 6.5:** Captacao — CaptarLeadModal, BatchCaptarButton, useCaptarFromSearch, SearchHistoryTab
- **Commit principal:** `d3555ae`
- **Testes:** 139/139 passando, 0 erros TypeScript

### Melhorias Adicionais
- Raios configuraveis: 50m, 100m, 200m, 300m, 400m, 500m, 1km, 2km, 5km + input custom
- Busca por endereco nos condominios (filtro por nome/rua)
- Botao "Buscar aqui" (FAB azul) no mapa → /search com lat/lng/raio
- Botao "Ver no Mapa" no header do /search → volta ao mapa
- Query params: /search?lat=X&lng=Y&radius=Z
- **Commit:** `6821c89`

### Relatorio Executivo
- `docs/features/EPIC-6-BUSCA-PARAMETRICA.md` — relatorio completo para apresentar o feature

### Banco de Dados (Supabase)
- 8 migrations aplicadas no banco remoto (000 a 006) via `supabase db query --linked`
- GRANTs aplicados para roles anon/authenticated
- Schema cache do PostgREST NAO recarregou (bug persistente)

## Problemas Pendentes

### 1. PostgREST Schema Cache (CRITICO)
- **Problema:** PostgREST nao reconhece tabelas/funcoes do Epic 6 (portal_searches, fn_scraped_listings_parametric)
- **Causa:** Schema cache congelado. NOTIFY, restart, toggle Data API — nada funcionou
- **Workaround implementado:** Proxy API routes usando postgres.js (conexao SQL direta)
  - `/api/search/local` — substitui fn_scraped_listings_parametric
  - `/api/search/history` — substitui query a portal_searches
  - Modulo `lib/db.ts` com postgres.js + prepare:false para Supavisor

### 2. Conexao Postgres do Vercel (EM PROGRESSO)
- **Problema:** Hostname direto (`db.xxx.supabase.co`) so tem IPv6 — Vercel nao suporta
- **Solucao:** Shared Pooler IPv4 (`aws-1-sa-east-1.pooler.supabase.com:5432`)
- **Status atual:** Circuit breaker ativado por tentativas de autenticacao falhas (aws-0 errado)
- **Proximo passo:** Aguardar cooldown (~5 min) e testar. Se persistir, resetar senha no Supabase

### 3. "Buscar nos Portais" (PENDENTE)
- Botao "Buscar nos Portais" usa POST /api/search/parametric que cria portal_searches via PostgREST (service_role)
- Precisa ser migrado para proxy SQL direto tambem (mesma abordagem do local/history)

### 4. Erro "portal_searches not found" no banner vermelho
- Vem do hook useTriggerSearch que usa createAdminClient() → PostgREST
- Precisa migrar para proxy API route com SQL direto

## Configuracao Atual

### Vercel
- **Projeto:** caos-off/real-state-moema
- **URL:** https://real-state-moema.vercel.app
- **Git email:** zero@toptier.net.br (corrigido de silvaj1zero@gmail.com)
- **Env vars:** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MAPBOX_TOKEN, APIFY_TOKEN, CRON_SECRET, DATABASE_URL

### Supabase
- **Projeto:** remax-moema (hculsnvpyccnekfyficu)
- **Org:** Top Tier Infrastructure (PRO)
- **Regiao:** sa-east-1 (Sao Paulo)
- **Pooler IPv4:** aws-1-sa-east-1.pooler.supabase.com:5432
- **User pooler:** postgres.hculsnvpyccnekfyficu
- **DATABASE_URL:** postgresql://postgres.hculsnvpyccnekfyficu:[SENHA]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres

### Git
- **Branch:** master
- **Ultimo commit:** `1c28d99` fix: add prepare:false and max_lifetime to db.ts
- **Total commits sessao:** 7

## Para Retomar Proxima Sessao

### Prioridade 1: Resolver conexao DB do Vercel → Supabase (BLOQUEADOR)
**Status:** Ultimo erro = `getaddrinfo ENOTFOUND` com `\n` no hostname. Fix de `.trim()` deployado (commit `c510b95`). TESTAR PRIMEIRO.
**Se ainda falhar:**
1. Verificar env vars no Vercel: `vercel env ls` — confirmar DB_HOST e DB_PASSWORD sem caracteres extras
2. Testar conexao local antes de deployar
3. Alternativa final: hardcodar host/password no db.ts (temporario, depois mover para env var)

**Dados de conexao corretos (do dashboard Supabase):**
- Host: `aws-1-sa-east-1.pooler.supabase.com`
- Port: `5432`
- User: `postgres.hculsnvpyccnekfyficu`
- Password: `Vmy0Qc9icjpPqYML`
- Database: `postgres`

### Prioridade 2: Migrar rotas restantes para proxy SQL
- `POST /api/search/parametric` — usa `createAdminClient()` que depende de PostgREST → migrar INSERT em portal_searches para SQL direto via db.ts
- Banner vermelho "portal_searches not found" — vem do useTriggerSearch → mesma migracao
- Testar "Buscar nos Portais" apos migracao

### Prioridade 3: Enriquecimento Pontual de Proprietario (NOVA FEATURE)
**Conceito:** Botao "Quem e o dono?" no BuildingCard que faz:
1. GeoSampa → SQL do lote (gratis, ja temos Story 3.5)
2. Infosimples/ARISP API → matricula do cartorio → nome do proprietario (~R$0.28/consulta)
3. Combina com dados de contato ja extraidos dos portais (Epic 6)
4. Exibe card unificado: nome + telefone + dados do imovel
**Custo:** ~R$56/mes (10 consultas/dia) vs R$215/mes Captei
**Estimativa:** 1-2 stories

### Prioridade 4: Integracao Captei via CSV
**Decisao:** Usar Captei como complemento (R$215/mes plano Autonomo)
**Integracao:** CSV import ja implementado (Story 4.7 - useCapteiImport)
**Proximo passo:** Contatar contato@captei.com.br para perguntar sobre API privada

### Prioridade 5: Audit Tecnico AIOX
- Rodar @qa + @architect para varrer debitos tecnicos
- Verificar conformidade com Constitution AIOX
- Planejar remediacoes

### Prioridade 6: PostgREST Schema Cache
- Bug persistente: PostgREST nao reconhece tabelas do Epic 6
- Workaround ativo: proxy SQL via postgres.js (lib/db.ts)
- Solucao definitiva: contatar suporte Supabase ou recriar projeto

## Commits desta sessao

| Commit | Descricao |
|--------|-----------|
| `d3555ae` | feat: Epic 6 — Busca parametrica (5 stories) |
| `f9a9001` | docs: Epic 6 executive report |
| `3bcc4fe` | chore: trigger rebuild |
| `6821c89` | feat: raios configuraveis + mapa↔search |
| `0c97458` | chore: fix git author email |
| `b12de71` | fix: Suspense boundary for /search |
| `72b3d1e` | fix: proxy routes bypass PostgREST |
| `1c28d99` | fix: prepare:false for Supavisor |

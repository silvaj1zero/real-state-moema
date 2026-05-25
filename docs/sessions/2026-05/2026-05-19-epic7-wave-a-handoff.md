# Handoff: Epic 7 Wave A — Captação de Leads FISBO Zona Sul SP

**Priority:** P1 — High (multi-story feature, decisões arquiteturais, ~25 commits, integração com 17 migrations)
**Date:** 2026-05-19
**Scope:** intra_processo (mesmo projeto, mesma sessão de trabalho continuação amanhã)
**Type:** session
**From:** Agent — current Claude Opus 4.7 session (Real State Moema)
**To:** Agent — next session (qualquer Claude AI continuando o trabalho)
**Parent handoff:** none (primeira do projeto Real State Moema)
**Consumed:** null

---

## CRITICAL CONTEXT (lê isto primeiro)

**Problema:** Luciana Borba (consultora RE/MAX Galeria Moema) precisa capturar leads FISBO (For Sale By Owner — "venda direta do proprietário") de imóveis em Moema/Vila Olímpia/Itaim Bibi através de scraping multi-portal + bases públicas + heurística de classificação, em conformidade LGPD.

**Solução em uma frase:** Implementamos Epic 7 inteiro (10 stories) durante esta sessão de orquestração multi-agent Claude — Wave A está com 9 stories `InReview` (commits no master) + 9 QA gates + 2 rounds de fix/re-gate; falta só Story 7.9 (workshop empírico Luciana, requer presença humana após 14d de data accrual em produção).

**Quem é o usuário próximo:** Agente AI continuando o trabalho amanhã ou em sessão futura. Deve assumir contexto ZERO sobre Epic 7. Ler este handoff inteiro + os arquivos listados em "Files to read BEFORE executing" antes de qualquer ação.

---

## Key Facts (estado em 2026-05-19)

| Fato | Status | Notas |
|---|---|---|
| 9 stories Wave A implementadas, committed, QA-gated | **ACTIVE** | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10 |
| Story 7.9 (workshop Luciana 200 anúncios) | **PENDING** — fora do YOLO | requer Luciana 2h presencial + 14d data accrual após deploy produção |
| Branch ativo | `master` | local 3 commits ahead de `origin/master` |
| Último commit | `cac7b9a` | fix(epic7) hardening 7.6 (pgmq pin + v_crawl_health RLS + cron timezone guard) |
| Origin/master HEAD | `3dfe286` | rsync AIOX SOT 2026-05-19 — push de hoje cedo |
| **Commits unpushed** | **3** | `cac7b9a` 7.6 hardening, `7d04aaf` 7.4 re-gate, `d7fe33f` 7.4 fixes |
| Tests | **455/455 passing** | 139 baseline Epic 6 + 316 novos Epic 7 |
| Test files | 47 | Vitest |
| Migrations criadas | 008 a 019 | apenas migrations 016, 017, 018, 019 são pós-Wave A initial |
| LIA counsel RE/MAX (Story 7.10 AC1) | **PENDING EXTERNAL** (15-25d SLA) | draft em `docs/legal/lia-epic7.md` |
| 7.4 deploy gate | **BLOCKED** | dependente 7.10 LIA signature |
| 7.6 re-gate @qa | **PENDING** | commit `cac7b9a` aguarda Quinn |
| Migrations 008-019 apply remote | **NÃO APLICADO** | `supabase db push` é responsabilidade exclusiva @devops |
| Apify Actor `mercadolivre-imoveis` deploy | **NÃO DEPLOYADO** | scaffold pronto em `apps/crawlers/`; faltam Apify secrets + `apify push` |
| Edge Functions deploy Supabase | **NÃO DEPLOYADO** | `trigger_mercadolivre_crawl`, `webhook_mercadolivre_done`, `classify-anuncio` |

**Memory entries atualizadas:**
- `C:\Users\Zero\.claude\projects\C--Users-Zero-Desktop-Real-State---Moema\memory\project_session-20260514.md` (estado completo Epic 7 + lista de pendências externas)
- `MEMORY.md` index aponta para o arquivo acima

---

## Project Overview (zero context assumption)

**Projeto:** Real State Moema — sistema de mapeamento + captação imobiliária para RE/MAX Galeria Moema.

**Stack:**
- Frontend/API: **Next.js 15 App Router** (TypeScript) em `app/`
- Backend: **Supabase** (Postgres 15 + Edge Functions Deno + Vault v0.3.1 + pgmq v1.5.1 + pg_cron v1.6.4)
- Geo: **Mapbox** já em uso
- Scraping: **Apify Cloud** (Wave A — managed) + **Crawlee TypeScript** + **AdaptivePlaywrightCrawler**
- Container Python isolado: **rictom/cnpj-sqlite** para ETL RFB CNPJ (`infrastructure/cnpj-etl/`)
- Deploy: **Vercel** (Next.js), Supabase (Edge Functions + DB), Apify (Actor)

**Decisões arquiteturais (ADRs Epic 7):**
- `ADR-EPIC7-001` — Crawler base Crawlee TypeScript
- `ADR-EPIC7-002` — Apify Cloud Wave A; self-hosted só Wave B (>50k pgs/mês)
- `ADR-EPIC7-003` — Orchestration cron-Supabase Wave A; LangGraph parcial só Wave B NLP
- `ADR-EPIC7-004` — Heurística FISBO 4-signal determinística (CNAE→FISBO→CRECI→unknown)
- `ADR-EPIC7-005` — Container Python isolado p/ CNPJ ETL
- `ADR-EPIC7-006` — Workspace layout: in-app monolith `app/src/lib/scrapers/` + Apify Actor via copy-on-build (`apps/crawlers/`); rejeitamos monorepo workspaces (KISS gate)

**Tipologia FISBO (Wave A — 5 categorias):**
- A = `for_sale_by_owner` (FISBO) — proprietário direto
- B = `agent` ou `broker` — imobiliária/corretor
- C = `builder` — construtora (CNAE 4110700|4120400)
- D = administradora (CNAE 8112500|8121400|8130300)
- E = holding / PJ não-classificada

---

## Status detalhado por Story (todas commitadas em master local)

| # | Título | Story file | Commit | Tests adicionados | QA gate | Re-gate |
|---|---|---|---|---|---|---|
| 7.1 | Schemas Advertiser/Property/HomeFlags + Migration 008 | `docs/stories/7.1.story.md` | `2523954` | 23 | `5bcb232` PASS | — |
| 7.10 | LGPD Foundation (Vault + opt-out + audit + retention) | `docs/stories/7.10.story.md` | `9786e5b` | 39 | `b62f6d4` CONCERNS — AC1 WAIVED counsel + C1 medium (Epic 6 legacy plaintext PII) | — |
| 7.5 | Container CNPJ ETL (rictom/cnpj-sqlite) + Migration 011 | `docs/stories/7.5.story.md` | `66495b5` | 22 Python (pytest, fora do Vitest) | `6d4aadd` CONCERNS — 5 staging blockers (RFB smoke, upstream stubs, RICTOM_SHA, backup script, telemetry) | — |
| 7.2 | PortalCrawler wrapper + Telemetry + Migration 009 | `docs/stories/7.2.story.md` | `142c0b4` | 59 | `ce5b44c` PASS | — |
| 7.3 | classifyAdvertiser pure function (FISBO 4-signal) | `docs/stories/7.3.story.md` | `a92a78e` | 46 | `f874612` PASS | — |
| 7.7 | CRECI lookup service unified + Migration 010 | `docs/stories/7.7.story.md` | `d14cd4e` | 43 | `58f3ac2` PASS — 2 waivers (CRECISP-WAIVE-001, captcha_spend Wave B) | — |
| 7.4 | MercadoLivre crawler (Actor + Edge Functions) | `docs/stories/7.4.story.md` | `2ddedc8` (initial) + `d7fe33f` (3 fixes) | 38 initial + 23 fixes = 61 | `2794411` CONCERNS — LOGIC-001/SEC-001/SEC-002 + BLOCK-001 (7.10) + OBS-001 (PoC real) | `7d04aaf` CONCERNS-mantido apenas por blockers externos (7.10 LGPD + AC9 staging); código RESOLVED |
| 7.6 | Pipeline cron + self-healing + classify-anuncio boundary + Migrations 012/013 | `docs/stories/7.6.story.md` | `5bea2d6` (initial) + `cac7b9a` (4 fixes) | 12 contracts + boundary | `fde1ca3` CONCERNS — 4 medium (pgmq version pin, v_crawl_health RLS, GUC timezone, AC9 smoke staging) | **PENDING** — aguarda Quinn re-gate contra `cac7b9a` |
| 7.8 | Review Queue UI (confidence < 0.70) + Migration 016 | `docs/stories/7.8.story.md` | `389a7b9` | 25 | `b389e7d` PASS — 5 low concerns | — |
| 7.9 | Workshop empírico Luciana 200 anúncios | `docs/stories/7.9.story.md` | **NÃO IMPLEMENTADA** | — | — | — |

**Total commits Epic 7 desde início da sessão:** ~25 (9 feat + 9 qa-gate + 2 fix(epic7) + várias coord/handoff edits)
**Total tests novos:** 316 (139 → 455)

---

## What was done nesta sessão (Q2 — bullets)

### Pipeline 10-etapas Epic 7 — TODAS as fases concluídas em 2026-05-14 + execução até 2026-05-19

1. **Phases 0-2 (Research):** já estavam concluídas antes da sessão atual (Waves 1+2 em `docs/research/2026-05-14-leads-zonasul-sp/`, coverage 90%)
2. **Phase 3 (Bench):** 3 comparativos em `docs/bench/` — todos concluídos antes da sessão atual
3. **Phase 4 (Code Anatomy):** 4 repos em `docs/code-anatomy/` — concluídos antes
4. **Phase 5 (PRD + Stories):** `docs/prd/EPIC-7-LEAD-PROSPECTING.md` + 10 stories — concluído antes
5. **PO validation (auto-fix):** Pax (@po) re-validou 7.4 e 7.6 (eram Draft → ficaram Ready com fixes wording)
6. **Pré-checks externos (paralelo):** @architect criou ADR-EPIC7-006 (workspace layout), @data-engineer validou Supabase Vault + pgmq, @pm draftou LIA + cover letter para counsel RE/MAX
7. **SDC YOLO (paralelo):** 9 stories implementadas e commitadas — agents @dev em batches de 2 em background
8. **QA gates (paralelo):** 9 @qa agents executaram qa-gate, 5 PASS + 4 CONCERNS
9. **Fix loop 7.4:** 3 defeitos críticos resolvidos (LOGIC-001 cap per-bairro + SEC-001 HMAC + SEC-002 trigger auth)
10. **Re-gate 7.4:** @qa validou — código RESOLVED, CONCERNS mantido só por blockers externos
11. **Hardening 7.6 (overnight YOLO):** 4 advisory aplicados (pgmq pin 1.5.1, v_crawl_health SECURITY INVOKER, cron timezone guard, PoC local exec guide)
12. **AIOX rsync merge:** branch `aiox-sync-2026-05-19` FF-mergeada em master (overlay AIOX SOT — `.claude/skills/` etc)
13. **Push para origin/master:** @devops Gage pushou 23 commits (FF `972b796..3dfe286`)

### Decisões não-óbvias tomadas

- **vi.hoisted() pattern** para mock Crawlee em testes (`portal-crawler.test.ts`) — bug clássico de hoisting do Vitest
- **Migration numbering coordenado:** 008 (7.1), 009 (7.2), 010 (7.7 — gap preenchido), 011 (7.5), 012/013 (7.6), 014/015 (7.10), 016 (7.8), 017 (7.4 fixes), 018/019 (7.6 hardening). Padrão `YYYYMMDDHHMMSS_NNN_descricao.sql`.
- **Sync-script copy-on-build** (Story 7.4) ao invés de monorepo workspaces — preserva Vercel deploy root + sem renomear `app/` para `apps/web/`
- **AC9 doc-only nas stories de scraping** — execução real de smoke contra portais reais (MercadoLivre, CRECI, RFB) deferred to staging para evitar IP block + custo
- **7.10 AC1 WAIVED counsel** — implementação técnica completa AC2-AC11 sob premissa de aprovação; só deploy fica gated em LIA signature

---

## What's next (Q3 — backlog priorizado)

### Pendências bloqueantes para Done (priorizadas)

| Prioridade | Item | Owner | Ação concreta |
|---|---|---|---|
| **P0** | 7.6 re-gate Quinn | @qa | Validar commit `cac7b9a` (3 migrations + PoC update). Esperado PASS — 4 fixes são SQL/docs sem regressão. ~10min. |
| **P0** | Push 3 commits unpushed | @devops Gage | `git push origin master` — sobem `cac7b9a`, `7d04aaf`, `d7fe33f`. Padrão: `@devops *push`. |
| **P1** | Deploy staging | @devops Gage | `*deploy-story` em sequência: (1) apply migrations 008-019 via `supabase db push`; (2) regen `app/src/lib/supabase/types.ts` (destrava 7.1 AC5); (3) deploy 3 Edge Functions (`trigger_mercadolivre_crawl`, `webhook_mercadolivre_done`, `classify-anuncio`); (4) configurar Supabase secrets (`APIFY_TOKEN`, `APIFY_ACTOR_MERCADOLIVRE_ID`, `MERCADOLIVRE_WEBHOOK_SECRET`, `MERCADOLIVRE_TRIGGER_SECRET`, GUC `app.mercadolivre_trigger_secret`); (5) Apify Actor `apify push` em `apps/crawlers/mercadolivre-imoveis/` após `sync-shared.sh + npm install + npm run build`. |
| **P1** | LIA counsel RE/MAX | Founder + Luciana | Preencher placeholders em `docs/legal/lia-epic7.md` (`[CPF LUCIANA]`, `[CNPJ RE/MAX GALERIA]`, DPO, counsel info) → enviar cover letter `docs/legal/lia-epic7-cover-letter.md` → SLA 15-25 dias úteis. Bloqueia deploy produção. |
| **P2** | 7.10 C1 fix (Epic 6 legacy plaintext PII) | @dev (NÃO YOLO — alto risco) | Refactor `app/src/lib/apify.ts`, `apify-parametric.ts`, `contact-enrichment.ts` para consumir `encryptLeadField` do Vault. **Risco de regressão Epic 6** — exige checkpoint humano + testes E2E antes. Possível escopo Wave B. |
| **P2** | 7.5 stubs upstream rictom/cnpj-sqlite | @dev ou @devops staging | Substituir stubs `dados_cnpj_baixa.py` e `dados_cnpj_para_sqlite.py` (exit 70) pelo conteúdo real do upstream (pin SHA). RFB download real (~5GB) precisa Docker daemon + internet. |
| **P3** | 7.9 workshop empírico Luciana | @pm + Luciana | Após deploy + ≥14d data accrual em produção: 2h presencial validando 200 anúncios estratificados → calibra H-001 (heurística ≥80%) → ajusta threshold confidence em `classifyAdvertiser`. |

### Próximo passo imediato (amanhã ao abrir)

```bash
cd "C:/Users/Zero/Desktop/Real State - Moema"
git status  # confirmar 3 commits unpushed
git log --oneline -5  # último deve ser cac7b9a
cd app && npm test -- --run  # confirmar 455/455
```

Depois: **disparar @qa re-gate 7.6** (P0). Se PASS → @devops push + começar staging deploy.

---

## Vetos e restrições críticas (Q4 — o que NUNCA fazer)

| Veto | Por quê |
|---|---|
| ❌ **NUNCA** `git push --force` em master | Master tem 25+ commits únicos de Epic 7; força destruiria trabalho. Padrão `gh auth` config existente. |
| ❌ **NUNCA** rodar `supabase db push` sem @devops authority | Aplicar 12 migrations em produção sem validação staging = risco de corromper Vault secrets, RLS, crawl_runs |
| ❌ **NUNCA** capturar telefone PF em produção antes do LIA counsel assinado | Risco LGPD ANPD (MP 1.317/2025 elevou ANPD para agência reguladora oficial). DEPLOY GATE 7.4 → 7.10 AC1. |
| ❌ **NUNCA** alterar migrations 008-019 já commitadas | São immutable — qualquer correção deve ser nova migration (020+). Stories owns migration numbers específicos. |
| ❌ **NUNCA** modificar arquivos owned por outras stories durante fix | Causa conflitos cross-story. Veja "story file ownership" abaixo. |
| ❌ **NUNCA** rodar smoke real contra MercadoLivre/CRECI/RFB no ambiente dev local | Risco IP block + custo Apify CU + risco DataDome detection. Fixtures sintéticas only no dev; real só em staging. |
| ❌ **NUNCA** `npm install` no diretório `apps/crawlers/mercadolivre-imoveis/` no dev local | Pacote separado, gerencia próprias deps Apify; não polui `app/package.json` Next.js |
| ❌ **NUNCA** commit `.env*` files | `.env.local` tem service-role key Supabase. Já está gitignored mas confirmar antes de qualquer `git add -A`. Sempre usar paths explícitos no `git add`. |
| ❌ **NÃO YOLO** Story 7.10 C1 fix (Epic 6 legacy refactor) | Toca arquivos produção Epic 6 (zap/olx/vivareal ativos). Exige supervisão humana + testes E2E. |

### Story file ownership (quem pode modificar quais paths)

| Story | Paths exclusivos | Migration numbers |
|---|---|---|
| 7.1 | `app/src/lib/schemas/epic7/` | 008 |
| 7.2 | `app/src/lib/scrapers/{portal-crawler,telemetry,hooks/,index}` | 009 |
| 7.3 | `app/src/lib/scrapers/classify-advertiser.ts` | — |
| 7.4 | `apps/crawlers/mercadolivre-imoveis/`, `app/src/lib/scrapers/mercadolivre/`, `app/src/lib/scrapers/cap-per-bairro.ts`, `supabase/functions/{trigger,webhook}_mercadolivre_*/` | 017 (post-QA fix) |
| 7.5 | `infrastructure/cnpj-etl/`, `.github/workflows/cnpj-etl-monthly.yml` | 011 |
| 7.6 | `supabase/migrations/*_012_*`, `*_013_*`, `*_018_*`, `*_019_*`, `supabase/functions/classify-anuncio/`, `supabase/functions/_shared/run-lifecycle.ts`, `app/src/lib/edge-contracts/classify-anuncio.ts` | 012, 013, 018, 019 |
| 7.7 | `app/src/lib/scrapers/creci/` | 010 |
| 7.8 | `app/src/app/leads/review-queue/`, `app/src/components/ReviewQueue*.tsx` | 016 |
| 7.10 | `app/src/lib/{vault,lgpd-crypto,lgpd-audit}.ts`, `app/src/lib/schemas/lgpd.ts`, `app/src/app/api/lgpd/`, `app/src/app/api/admin/lgpd/`, `app/src/app/lgpd/`, `app/src/app/admin/lgpd/` | 014, 015 |

---

## Files to read BEFORE executing (em ordem)

1. **Este handoff** (você está aqui)
2. `C:\Users\Zero\.claude\projects\C--Users-Zero-Desktop-Real-State---Moema\memory\MEMORY.md` — índice de memória
3. `C:\Users\Zero\.claude\projects\C--Users-Zero-Desktop-Real-State---Moema\memory\project_session-20260514.md` — contexto de toda a sessão Epic 7
4. `C:\Users\Zero\Desktop\Real State - Moema\.claude\rules\agent-authority.md` — delegação @devops/@dev/@qa
5. `docs/stories/7-validation-summary.md` — resumo PO validation de toda Wave A
6. `docs/prd/EPIC-7-LEAD-PROSPECTING.md` — PRD completo
7. `docs/architecture/adrs/ADR-EPIC7-001` a `ADR-EPIC7-006` — todas as decisões arquiteturais
8. `docs/qa/gates/7.{1,2,3,4,5,6,7,8,10}-*.yml` — 9 gate files (verdicts + issues)
9. `docs/poc/7.10-vault-availability-check.md` — confirma Vault v0.3.1 instalado
10. `docs/poc/7.6-pgmq-availability-check.md` — confirma pgmq 1.5.1 disponível
11. `docs/legal/lia-epic7.md` + `lia-epic7-cover-letter.md` — LIA draft + cover letter

### Antes de qualquer modificação de código

```bash
cd "C:/Users/Zero/Desktop/Real State - Moema"
git status  # confirmar working tree clean
cd app && npm test -- --run  # baseline 455/455
```

---

## Concrete example — passo-a-passo para retomar amanhã

**Cenário típico:** retomar com @qa re-gate 7.6 (próximo passo P0).

```bash
# 1. Verificar estado
cd "C:/Users/Zero/Desktop/Real State - Moema"
git log --oneline -3
# Esperado: cac7b9a, 7d04aaf, d7fe33f no topo

# 2. Confirmar tests
cd app && npm test -- --run | tail -3
# Esperado: Tests 455 passed (455)

# 3. (Próximo passo P0) Disparar @qa re-gate 7.6
# Via /AIOX:agents:qa ou Agent tool subagent_type=qa
# Brief: validar commit cac7b9a contra gate fde1ca3
# - INFRA-001 (pgmq VERSION pin em mig 013)
# - SEC-001 (v_crawl_health SECURITY INVOKER em mig 018)
# - INFRA-002 (cron.timezone GUC guard em mig 019)
# - TEST-001 (PoC 7.6-self-healing-smoke.md local exec guide)
# Output: gate file update + Change Log entry

# 4. Após re-gate PASS, @devops push e staging deploy
# @devops *push (manda os 3 commits unpushed + qa re-gate commit novo)
# @devops *deploy-story em sequência conforme tabela "What's next"
```

**Se @qa retornar CONCERNS residual:** aplicar fix-loop curto (~30min @dev YOLO) então re-gate de novo. Não deve acontecer — todos os 4 são SQL/docs e tests passam.

---

## Glossary (mínimo 10 termos — domain knowledge)

| Termo | Significado |
|---|---|
| **FISBO** | "For Sale By Owner" — venda de imóvel direta do proprietário, sem intermediário. Termo canônico do projeto (NÃO usar "FSBO"). |
| **Wave A** | Primeira onda de captação Epic 7 — MercadoLivre + bases públicas (CNPJ/CRECI). Open source first, R$<500/mês budget. |
| **Wave B** | Segunda onda — portais comoditizados (QuintoAndar, Loft) + ML + LangGraph para NLP. Trigger: >50k pgs/mês ou Apify bill > R$1.500/mês. |
| **CRECI** | Conselho Regional de Corretores de Imóveis — registro profissional obrigatório no Brasil. Indicador forte de não-FISBO. |
| **CNAE** | Classificação Nacional de Atividades Econômicas. CNAEs 4110700/4120400 = construtora; 6822500/6831700 = imobiliária. |
| **LIA** | Legitimate Interest Assessment — documento LGPD justificando coleta de dados PF sob Art. 7º IX. AC1 da Story 7.10. |
| **ANPD** | Autoridade Nacional de Proteção de Dados (Brasil). MP 1.317/2025 elevou para agência reguladora oficial. |
| **Apify** | Plataforma de scraping cloud usada Wave A. "Actor" = unidade de scraper deployada. "CU" = Compute Unit (unidade de billing). |
| **Crawlee** | Framework TypeScript de scraping da Apify. `AdaptivePlaywrightCrawler` = HTTP-first com fallback browser. |
| **pgmq** | Postgres Message Queue extension. Wave A v1.5.1 disponível no projeto Supabase `hculsnvpyccnekfyficu`. |
| **pg_cron** | Postgres cron scheduling extension. v1.6.4 disponível no projeto. |
| **Vault** | Supabase Vault — cifragem nativa de PII em repouso. v0.3.1 já instalado. Usado por Story 7.10 para `leads.telefone_secret_id`. |
| **SDC** | Story Development Cycle — workflow @sm draft → @po validate → @dev implement → @qa gate → @devops deploy. |
| **YOLO mode** | Modo @dev autônomo 0-1 prompts. Usado durante a sessão para paralelizar 9 stories. |
| **QA gate** | Verdict @qa pós-implementação: PASS / CONCERNS / FAIL / WAIVED. Gate file em `docs/qa/gates/{story}.yml`. |
| **Sync-script copy-on-build** | Padrão ADR-EPIC7-006: `apps/crawlers/{portal}/scripts/sync-shared.sh` copia `app/src/lib/scrapers/` para `apps/crawlers/{portal}/src/shared/` pré-build do Apify Actor. |
| **Migration numbering** | `YYYYMMDDHHMMSS_NNN_descricao.sql`. Stories owns NNN específicos (ver "story file ownership"). |
| **Edge Function** | Supabase Deno runtime function. Timeout 5s no Cron UI. Tasks longas usam pgmq async pattern. |
| **classify-anuncio boundary** | Edge Function Story 7.6 retorna `source: 'deterministic_v1'` Wave A. Wave B substitui internamente por LangGraph subgraph SEM mudar API. Precedent: AppFolio Realm-X. |
| **DEPLOY GATE** | Bloqueio explícito de deploy produção. 7.4 → 7.10 LIA. Compliance non-negotiable. |

---

## Bootstrap protocol — verificação para próxima sessão

Antes de tocar em qualquer código, próximo agente DEVE responder estas perguntas (com evidência):

| Pergunta | Resposta esperada | Como verificar |
|---|---|---|
| Em qual branch estou? | `master` | `git branch --show-current` |
| Quantos commits unpushed? | **3** (`cac7b9a`, `7d04aaf`, `d7fe33f`) | `git rev-list --count origin/master..master` |
| Quantos tests passam? | **455/455** | `cd app && npm test -- --run \| tail -3` |
| Quantas stories Wave A foram implementadas? | **9** (faltando 7.9) | `ls docs/stories/7.*.story.md \| wc -l` retorna 10, mas 7.9 nunca foi tocada |
| Story 7.6 está aguardando o quê? | **Re-gate @qa contra commit `cac7b9a`** | `head -7 docs/stories/7.6.story.md \| grep Status` retorna `InReview` |
| Migration 008 foi aplicada no remote? | **NÃO** — apenas commitada localmente; `supabase db push` é @devops | `cat docs/qa/gates/7.1-schemas-unificado.yml \| grep -A2 deploymentReadiness` |
| LIA está assinado? | **NÃO** — draft em `docs/legal/lia-epic7.md`; counsel RE/MAX pendente | `grep "Approved by counsel" docs/legal/lia-epic7.md` retorna nada |
| Posso fazer `git push`? | **NÃO** — push é responsabilidade exclusiva @devops Gage | Ler `.claude/rules/agent-authority.md` |

**Se qualquer resposta divergir do esperado → INVESTIGAR antes de prosseguir. Algo mudou no estado.**

---

## Success criteria — quando esta linha de trabalho está "Done"

| Critério | Como medir | Status atual |
|---|---|---|
| 10 stories Wave A com Status=Done | `grep "^\*\*Status:\*\* Done" docs/stories/7.*.story.md \| wc -l` retorna 10 | **0** (todas InReview) |
| Todas as 12 migrations aplicadas em staging | `supabase migration list --linked` mostra 008-019 | NÃO |
| Apify Actor `mercadolivre-imoveis` deployed | `apify info` mostra Actor ID válido | NÃO |
| 3 Edge Functions deployed | `supabase functions list` mostra trigger_mercadolivre_crawl + webhook_mercadolivre_done + classify-anuncio | NÃO |
| LIA assinado pelo counsel RE/MAX | `docs/legal/lia-epic7.md` linha "Status: Approved by counsel YYYY-MM-DD" | NÃO (external 15-25d) |
| AC9 smoke real 100 URLs MercadoLivre | output em `docs/poc/7.4-mercadolivre-smoke.md` seção "Real execution results" preenchida | NÃO |
| Story 7.9 workshop Luciana executado | `docs/stories/7.9.story.md` Status=Done + tabela `validation_batch_001` populada | NÃO (depende deploy + 14d) |
| Push para origin/master | `git rev-list --count origin/master..master` retorna 0 | NÃO (3 pendentes) |

---

## Current state vs desired state (ASCII)

```
                 CURRENT STATE                  →    DESIRED STATE (Wave A Done)
                 ════════════════════════════         ═══════════════════════════════
LOCAL master    ✓ 9 stories committed              ✓ 9 stories committed
                ✓ 455 tests passing                ✓ 455+ tests passing
                ✗ 3 commits unpushed               ✓ origin/master = local
                                                   
ORIGIN master   ✓ 23 commits pushed (manhã)        ✓ +3 commits push (qa fixes + hardening)
                ✗ 3 commits behind local           ✓ in sync

QA gates        5 PASS + 4 CONCERNS                7+ PASS (7.6 re-gate vira PASS)
                                                   3 CONCERNS persist (external blockers)

Supabase remote 6 migrations aplicadas (Epic 6)    18 migrations aplicadas (008-019)
                Vault v0.3.1 disponível            Vault em uso para PII leads
                pgmq v1.5.1 disponível             pgmq queue epic7_long_tasks ativa
                pg_cron v1.6.4 disponível          5 cron jobs ativos
                
Edge Functions  0 deployed                         3 deployed (trigger, webhook, classify)

Apify           0 Actors                           1 Actor (mercadolivre-imoveis)
                                                   2 secrets configurados
                                                   1 cron schedule diário 04:00 BRT

LGPD compliance 7.10 código completo               7.10 + counsel LIA signed
                AC1 WAIVED counsel pending         AC1 Approved
                Deploy gate ATIVO                  Deploy gate LIBERADO

Production       Epic 6 ativo (ZAP/OLX/VivaReal)    Epic 6 + Epic 7 Wave A ativo
                Não há leads FISBO automático      ~200-500 leads FISBO/mês captados
```

---

## First command (copy-paste ready)

```bash
cd "C:/Users/Zero/Desktop/Real State - Moema" && git log --oneline -5 && cd app && npm test -- --run | tail -3 && cd .. && cat docs/qa/gates/7.6-cron-pipeline.yml | head -20
```

Output esperado:
- Last commit: `cac7b9a fix(epic7): pgmq/pg_cron version pin + v_crawl_health RLS + cron timezone guard [Story 7.6 QA fixes]`
- Tests: `455 passed (455)`
- Gate 7.6 mostra `verdict: CONCERNS` (esperando re-gate)

Próximo passo: invocar `@qa` agent para re-gate 7.6 (ver "Concrete example" acima).

---

## Notes (decisões controversas e learnings)

- **Padrão recorrente:** agentes @dev em background terminaram antes do `git commit` em 5/9 stories. Orquestrador (sessão atual) finalizou commits manualmente. Causa raiz suspeita: harness/sandbox bloqueando `git commit` em sub-shells. **Mitigação adotada nos briefs:** instrução explícita de commit no fim + voltar para root antes do `git`. Funcionou nos últimos 4 fixes (7.6 hardening commit `cac7b9a` foi self-completed pelo agent).
- **Workspace layout debate:** ADR-EPIC7-006 escolheu in-app monolith (path B) ao invés de monorepo workspaces (path A) — driver foi `kiss-no-overengineering` rule + Vercel deploy root preservation. Se Wave B introduzir 3+ Apify Actors, re-avaliar.
- **AC9 doc-only convention:** smoke tests reais contra portais foram **explicitamente deferred** para staging em todas as stories (7.2, 7.4, 7.5, 7.7) para evitar IP block + custo Apify no dev. Pattern consistente, documentado nos PoC.
- **UUID v4 fix em test fixtures:** Zod `.uuid()` exige version digit `4` na posição 14 + variant `8/9/a/b` na posição 19. Bug `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` (falha) → fix `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee`. Aplicado em 7.8 actions.test.ts.

---

**END OF HANDOFF**

Próxima sessão: bootstrap → leitura dos arquivos listados → @qa re-gate 7.6 → @devops push + staging deploy.

# Handoff Session — Epic 7 MVP-LOCAL (2026-05-26)

**Encerramento:** 04:30 AM
**Branch:** `fix/epic7-v-crawl-health`
**PR:** https://github.com/silvaj1zero/real-state-moema/pull/1
**Estado final:** ✅ Review queue UI funcionando end-to-end com dados sintéticos

---

## O que ficou pronto hoje

### Stack rodando localmente
- ✅ Next.js dev server: **http://localhost:3003**
- ✅ DB Supabase prod (`hculsnvpyccnekfyficu`) com 11 migrations Epic 7 aplicadas (008–013, 016–020)
- ✅ Conta admin de teste: `admin-teste@moema.local` / `Teste1234!Admin`
- ✅ 25 listings sintéticos em `scraped_listings` (prefixo `mvp-seed-*`)
- ✅ Review queue renderiza 10 itens (<70% confidence) com cards completos

### Commits novos pushed
| Hash | O que |
|------|-------|
| `894dc9e` | Fix Story 7.4 latente: `Actor.openRequestQueue()` + passthrough crawler |
| (anteriores) | 9 commits da sessão YOLO (ver `git log master..HEAD`) |

### Decisões formais
- **MVP-LOCAL Waiver** assinado pelo founder em ADR-EPIC7-MVP-LOCAL-WAIVER (2026-05-24): 3 constraints, LGPD foundation aceitável sem counsel REMAX externo
- **Migrations 014/015 (LGPD vault)** skipadas porque `supabase_vault` extension não disponível neste projeto

---

## 4 bugs latentes Story 7.4 descobertos pelo teste real

| # | Bug | Local | Severity | Status |
|---|-----|-------|----------|--------|
| 1 | `RequestQueue.open()` (crawlee) ≠ Actor queue → crawler vê fila vazia | `apps/crawlers/mercadolivre-imoveis/src/main.ts:182` | Critical | ✅ Fixed (`894dc9e`) |
| 2 | Crawler escreve `raw_data` (coluna inexistente) | `main.ts:102` | High | 📝 Tech-debt |
| 3 | Crawler escreve `cnpj_anunciante` (coluna inexistente) | `main.ts:100` | High | 📝 Tech-debt |
| 4 | Enum `portal_scraping` não tem valor `'mercadolivre'` | `supabase/migrations/20260318000001_000_extensions_and_types.sql` | High | 📝 Tech-debt |

**Como detectados:** O crawler local rodou contra ML real, queue fix #1 destravou o flow, depois bateu em **403 anti-bot** (esperado per OBS-001). Bugs #2/#3 só apareceriam em produção quando proxy resolvesse o 403 — pulamos a deteção. Bug #4 só apareceu quando o seed sintético tentou inserir `'mercadolivre'`.

**Root cause comum:** QA gate Story 7.4 (`docs/qa/gates/7.4-mercadolivre-crawler.yml`) verificou:
- ✅ TypeScript compila
- ❌ Schema DB **não verificado** contra código crawler
- ❌ Enum **não verificado**
- ❌ PoC real **não executado** (era doc-only)

---

## CI / PR #1 status

| Check | Estado |
|-------|--------|
| Vercel – app | ✅ SUCCESS (após fix `_process-button.tsx`) |
| Supabase Preview | ✅ SUCCESS |
| CodeRabbit | ✅ SUCCESS |
| Vercel – real-state-moema | ❌ FAILURE (projeto duplicado abandonado — limpar separadamente) |
| Quality Gates (CI) | ❌ FAILURE (lint: ~20 errors `react/display-name`, `no-explicit-any` pré-existentes) |

**PR mergeable mas com 2 checks vermelhos.** Decisão de merge depende da branch protection.

---

## Roadmap para amanhã

### Path A: Story 7.4 fix bundle (~1h, recomendado)
1. **Criar migration 021:** `ALTER TYPE portal_scraping ADD VALUE 'mercadolivre'` (idempotent)
2. **Decidir + executar:**
   - (a) Adicionar colunas `raw_data JSONB` + `cnpj_anunciante TEXT` em `scraped_listings` (mantém o código), OU
   - (b) Remover writes de `raw_data` + `cnpj_anunciante` do `main.ts` (limpa código)
3. **@qa re-gate 7.4** com schema-vs-code coverage explícito
4. **Commit + push + verificar CI**

Recomendo (a) porque o crawler usa esses dados — `raw_data` preserva HTML/JSON-LD bruto pra debug, `cnpj_anunciante` é vital pro pipeline CNPJ Story 7.5.

### Path B: Continuar testando UX (~30min)
1. Testar **decisões na fila** — clicar Confirmar FISBO / Imobiliária / Descartar e ver se grava em `scraped_listings.review_status`
2. Testar **filtros** — slider confidence, portais, bairro
3. Testar **Workshop Story 7.9** em `/admin/validation-workshop` (precisa popular `validation_batch_001`)
4. Testar **busca Luciana real** — fluxo de uso real ela faria

### Path C: Limpar CI (~20min)
1. Quality Gates falhando em lint → ou (a) corrige os 20 erros, ou (b) muda step `npm run lint` pra `npm run lint -- --max-warnings 999` (degradação consciente)
2. Deletar projeto Vercel duplicado `caos-off/real-state-moema` (operação founder-only no Vercel Dashboard)

### Path D: Apify Cloud deploy (~2h, produção real)
Path natural quando quiser sair do MVP local:
1. `apify push` em `apps/crawlers/mercadolivre-imoveis/`
2. Deploy Edge Functions `trigger_mercadolivre_crawl` + `webhook_mercadolivre_done`
3. Set secrets: `APIFY_ACTOR_MERCADOLIVRE_ID`, `MERCADOLIVRE_WEBHOOK_SECRET`, `MERCADOLIVRE_TRIGGER_SECRET`
4. Trigger primeira run real
5. **ATENÇÃO:** dispara ADR §4 Constraint 3 (cloud deploy) → reaviva LIA counsel + AC11 prod-Vault smoke

---

## Comandos úteis para retomar

```bash
# Iniciar dev server
cd "C:/Users/Zero/Desktop/Real State - Moema/app"
PORT=3003 npm run dev

# Ver fila
# 1. Login: http://localhost:3003/login com admin-teste@moema.local / Teste1234!Admin
# 2. Abrir: http://localhost:3003/leads/review-queue

# Re-seed (se DB foi limpo)
# Cole scripts/epic7/seed-mvp-listings.sql no Supabase SQL Editor

# Cleanup seed
# DELETE FROM scraped_listings WHERE external_id LIKE 'mvp-seed-%';

# Conta admin cleanup (se precisar)
# node app/create-test-admin.mjs --cleanup (não implementado; deletar via Supabase Dashboard → Auth)
```

---

## Files notáveis criados nesta sessão

```
scripts/epic7/
  seed-mvp-listings.sql          # 25 listings sintéticos (5 categorias × bairros)
  create-test-admin.mjs           # helper p/ criar conta admin (copia em app/ p/ resolver deps)

docs/sessions/
  YOLO-EPIC7-20260524.md          # session anterior
  HANDOFF-20260526-EPIC7-MVP-LOCAL.md  # este arquivo
```

---

## TL;DR

✅ **Concluído:** review queue end-to-end com dados, login funcionando, infra Supabase OK, 1 bug crítico fixed
📝 **Pendente:** 3 bugs tech-debt Story 7.4, lint cleanup, Vercel duplicate, prod path
🎯 **Próxima sessão:** Path A (Story 7.4 fix bundle) — desbloqueio mais alto ROI

Bons sonhos. 🌙

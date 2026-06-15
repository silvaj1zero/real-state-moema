# HANDOFF — Sessão 2026-06-15 (Epic 7 FISBO completo + wiring ao vivo + Epic 8.1 ACM)

> **TL;DR:** Mini-épico de qualidade FISBO fechado de ponta a ponta — **7.11** (detecção determinística via `publisherType`), **7.12** (proxy residencial por alvo + block-rate), **7.13** (wiring ao vivo ZAP/VivaReal). Epic 7 **13/13 Done**. Depois, **Story 8.1** (modelo de dados da metodologia ACM) Done com a RPC `fn_comparaveis_no_raio` estendida e aplicada em PROD. **7.11/7.12/7.13 já no remoto**; **8.1 são 3 commits locais** (push é do @devops). 3 migrations aplicadas em PROD nesta sessão.

---

## 1. O que foi entregue (SDC full em cada story)

### Epic 7 — qualidade FISBO (3 stories, todas Done + commit)
- **7.11 — Detecção FISBO determinística via `publisherType`** (`62a8759`, pushed)
  - Passo 0 em `classifyAdvertiser`: `owner→for_sale_by_owner`, `agency→broker`, `developer→builder` (conf. 0.95), precede a heurística 4-signal (fallback). Conflito `owner`+CRECI → signal `publisher_type_creci_conflict`.
  - `normalizePublisherType` em `normalizeListing` (apify.ts). MercadoLivre → null (heurística).
  - ADR-EPIC7-004 anotado.
- **7.12 — Proxy residencial BR por alvo + telemetria de bloqueio** (`e396807`, pushed)
  - `proxy-config.ts`: `PORTAL_PROXY_TIER` (zap/vivareal=residential; olx/ml=datacenter), `resolveProxySpec` puro + fallback gracioso, `buildProxyConfiguration` (factory injetável).
  - Telemetria: `isBlockStatus` + `requests_blocked`/`block_rate` no snapshot; anti-bot conta como bloqueio.
  - ADR-EPIC7-002 anotado (nota de custo residencial).
- **7.13 — Wiring ao vivo ZAP/VivaReal** (`7a17414`, pushed)
  - `resolveApifyInputProxy` + `buildParametricSearchInput` injeta `proxyConfiguration` por alvo no INPUT do actor.
  - `upsertListing` persiste `publisher_type` (migration `20260615000003` aplicada em PROD).

### Epic 8 — Story 8.1 (modelo de dados ACM, Done — 3 commits LOCAIS)
- `a0398ec` feat + `8877546` fix(42P13) + `913ef32` docs.
- `types.ts`: `AcmComparavel` + `ComparavelNoRaio` ganham os campos da metodologia; tipos `AcmScore`, `AcmStatusAnuncio`.
- `useAcm.ts` + `AddComparableSheet.tsx`: form manual ganha "Detalhes da metodologia (opcional)" + derivados (`preco_m2_terreno`, `desagio_percent`).
- `AcmExportMenu.tsx`: `buildComparaveisCsv` (pura) anexa colunas ao CSV.
- **Migration RPC `20260615000004`**: `DROP + CREATE` de `fn_comparaveis_no_raio` — fiel à versão viva (PostGIS verbatim), anexa as 12 colunas novas. **Aplicada em PROD** (retorna 20 colunas, verificado).

---

## 2. Migrations aplicadas em PROD nesta sessão (projeto `hculsnvpyccnekfyficu`)

| Migration | O quê | Como |
|---|---|---|
| `20260615000003` | `scraped_listings.publisher_type` (text + CHECK) | SQL Editor ✅ |
| `20260615000004` | `fn_comparaveis_no_raio` DROP+CREATE (20 colunas) + GRANT | SQL Editor ✅ (após fix 42P13) |

> `20260615000002` (acm_methodology_fields) já fora aplicada na sessão anterior.

---

## 3. Estado do git

- **Branch:** `fix/epic7-v-crawl-health`.
- **Remoto:** atualizado até `7a17414` (7.11/7.12/7.13 + sessão anterior).
- **Local à frente:** **3 commits da 8.1** (`a0398ec`, `8877546`, `913ef32`) — **NÃO pushed** (push é exclusivo @devops, Art. II).
- **Uncommitted:** `app/package-lock.json` (M, pré-existente do início — não relacionado às stories; não commitar sem intenção).

---

## 4. Pendências (priorizadas)

1. **Push da 8.1** (`a0398ec`, `8877546`, `913ef32`) — @devops. Gates já validados localmente (564/564 na última suíte completa antes do push das 7.x; 8.1 = 56/56 ACM + 0 tsc + lint 0).
2. **AC3 da 8.1 — sink do engine** (`acm-imobiliario`, repo externo): `montar_registros` em `engine/src/sinks/supabase_acm.py` deve mapear `area_construida_m2`/`area_terreno_m2` separados, `id_fonte→sql_cadastral`, `padrao`, `ano`, `testada_m`, `valor_venal`. Sem isso as colunas novas ficam NULL para linhas ITBI (a metodologia lê via `area_construida_m2 ?? area_m2`).
3. **AC6 da 8.1 — regen de tipos** (`supabase gen types`) — @devops após apply.
4. **7.13 obs.:** validar shape `proxyConfiguration` vs input schema do actor `viralanalyzer/brazil-real-estate-scraper` no 1º run paramétrico real.
5. **Próxima story:** **8.2** (camada de cálculo — InReview, lib `methodology.ts` 38/38). Agora desbloqueada: a RPC entrega `area_terreno_m2`/`preco_pedido` que a 8.2 consome. Fechar QA gate + decidir AC4 UI deferido.

---

## 5. Fatos técnicos (para agir sem re-investigar)

- **RPC `fn_comparaveis_no_raio` derivou e NÃO está em migration** (foi criada ad-hoc no DB). Assinatura viva: `(p_lat double precision, p_lng double precision, p_consultant_id uuid, p_raio_metros integer DEFAULT 500)`. `docs/architecture/schema.sql` tem uma versão ANTIGA (edificio_id) — **não confiar** nela. A versão fiel agora está versionada em `20260615000004`.
- **PostgreSQL 42P13:** `CREATE OR REPLACE` não altera `RETURNS TABLE` — precisa `DROP FUNCTION` antes (+ re-GRANT EXECUTE, que o DROP remove).
- **Scaffold Supabase dessincronizado:** `db push` não funciona limpo; aplicar migrations via **SQL Editor** (ver `docs/runbooks/apply-itbi-enum-migration.md`).
- **Lib de proxy 7.12 / classifier 7.11 ainda NÃO acopladas ao Actor MercadoLivre (7.4)** — ML não expõe publisherType nem é Cloudflare, então é correto. O wiring relevante (ZAP/VivaReal) foi feito na 7.13 (apify-parametric).
- **Vendored quebrado:** `tsc --noEmit` acusa 1 erro em `node_modules/devtools-protocol` (pré-existente) — filtrar por `^src/` para validar (0 erros reais).

---
*Handoff 2026-06-15 (sessão FISBO + ACM 8.1). Próximo objetivo sugerido: Story 8.2 (camada de cálculo ACM) em sessão nova. Antes, @devops push da 8.1.*

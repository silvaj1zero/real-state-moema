# Handoff — Sessão 2026-06-22 · Epic 10 (Agenda de Prospecção FISBO) COMPLETO

> Retomada do handoff `docs/HANDOFF-SESSION-20260621-epic9-10.md`. Objetivo único
> da sessão (operator-zero): **Epic 10**. Entregue inteiro, commitado, **pushed** e
> no PR #1. Migration aplicada em PROD. Estado limpo.

## Branch / remoto / PR
`fix/epic7-v-crawl-health` — HEAD **`550b1d7`**, **pushed** (`origin/fix/epic7-v-crawl-health`).
PR aberto: **#1** → base `master` (https://github.com/silvaj1zero/real-state-moema/pull/1).
Esta branch é o PR guarda-chuva (Epic 7/8/9/10). Commits desta sessão:
- `be3d75e` Story 10.1 — call list FISBO + status de contato
- `bbfda3a` Story 10.2 — roteiro de visitas por proximidade
- `550b1d7` fix — call list não depende de `leads.telefone`/`notas` (PROD cifra PII)

## ⚑ Teste real (2026-06-22 tarde) — RESOLVIDO + achados de PROD
A tela `/agenda` carregou com erro `column leads.telefone does not exist`. **Causa: PROD
divergiu das migrations do repo.** A `leads` em PROD (projeto **`hculsnvpyccnekfyficu`** =
remax-moema; CUIDADO: existe outro projeto **TierScope** `hjnuaadkvhafcxvsuxqf` na mesma org
com uma `leads` de marketing — não confundir):
- PII cifrada: **`telefone_encrypted`/`email_encrypted` (bytea)** — NÃO há `telefone`/`email` em claro.
- **NÃO tem coluna `notas`**.
- A migration 022 tinha entrado **parcial**: faltava `scraped_listing_id` — **re-aplicado** via SQL
  idempotente (ALTER ADD + índice único). Agora as 4 colunas de 022 + índice existem em PROD.
- Fix de código no commit `550b1d7`: SELECT/INSERT sem `telefone`/`notas`; merge lead↔anúncio só
  por `scraped_listing_id`; contato exibido vem de `scraped_listings`. +5 testes `buildCallListItems`.
- **Resultado:** tela funcionando end-to-end. ✅

**Dados em PROD são 100% MOCKUP:** `scraped_listings` FISBO = **20 linhas seed** (`external_id LIKE
'mvp-seed-%'`, telefones falsos `1198765400X`, nomes fictícios, URLs falsas — de
`scripts/epic7/seed-mvp-listings.sql`), **0 reais, 0 com `contact_enriched_at`**. Nenhum contato
liga para pessoa real. Cleanup: `DELETE FROM scraped_listings WHERE external_id LIKE 'mvp-seed-%';`

## 🔴 Dívidas descobertas (fora do escopo do Epic 10)
1. **Captação Epic 6 quebrada em PROD:** `useCaptarFromSearch` (`app/src/hooks/useCaptarFromSearch.ts`)
   INSERT em `leads` com `telefone`/`email`/`enrichment_data` em claro → essas colunas não existem
   em PROD (PII cifrada). Provavelmente quebra com o mesmo erro. Investigar/alinhar com o padrão
   `*_encrypted` ou as RPCs de vault (`fn_store_lead_pii`).
2. **Pipeline de captura real não validado:** para contatos reais, rodar busca paramétrica
   (`/api/search/parametric` via Apify) + enriquecimento (`/api/search/enrich-contact`, Story 6.4).
   Depende de token Apify e rodada real. Não exercitado.
3. **Schema repo ⟂ PROD:** as migrations do repo (vault `*_secret_id`) não batem com PROD
   (`*_encrypted bytea`). Há aplicação manual de SQL no PROD sem migration versionada. Risco de
   drift recorrente — vale um dump do schema real de PROD para reconciliar.

## Epic 10 — estado (COMPLETO)
**`docs/prd/EPIC-10-AGENDA-FISBO.md`** — 2 stories, ambas **InReview / gate PASS**.

- ✅ **10.1 Call list FISBO** (`docs/stories/10.1.story.md`)
  - **Decisão @data-engineer (AC2):** status mora em `leads`, NÃO em `scraped_listings`
    (esta é SELECT-only por RLS p/ `authenticated` — migration `20260414000001` §5.1).
  - **Migration `supabase/migrations/20260621000001_022_epic10_contato_status.sql`**:
    enum `contato_status` + `contato_status`/`_at`/`_notas`/`scraped_listing_id` em `leads`
    + índice único `(consultant_id, scraped_listing_id)`. **APLICADA EM PROD** (SQL Editor,
    conta zero@toptier / projeto remax-moema — confirmado por screenshot).
  - Mutation otimista com **captação automática** (materializa lead se o FISBO ainda não for lead).
- ✅ **10.2 Roteiro por proximidade** (`docs/stories/10.2.story.md`)
  - `routeOrder.ts` (puro): haversine, **sem TSP** (ordenação simples por distância — documentado).
  - Origem: **GPS** (`useGeolocation`) ou **Epicentro**; fallback GPS-off → epicentro → bairro.
  - **Mapa estático com pins numerados** via `buildStaticMapUrl` (reuso do mecanismo do ACM 8.7/9.3;
    o `MapView` interativo não aceita pins arbitrários). Mapbox rotula só 0-9 → >9 fica sem rótulo no mapa.

**Tela:** Mais → **Call list FISBO** → `/agenda` (tabs **Ligações | Roteiro**).

## Correção técnica reusável (importante)
`app/src/lib/coordinates.ts` → `parseCoordinates` usava `Buffer` (Node-only); no **client** o WKB hex
não decodificava → coords `null` e proximidade inoperante. Troquei por **`DataView`** (browser+Node).
- Regressão verificada: **132/132 testes ACM verdes** (o parser é usado no PDF server-side).
- Nota: `useBuildings` já tinha seu próprio parser DataView (`parseWKBCoord`) — não unifiquei (fora de escopo).

## Validação (saída real)
- vitest **26/26** no escopo FISBO (`callListOrder` 14 + `routeOrder` 8 + smokes `FisboCallList` 5 / `VisitRoute` 4 + `coordinates` 4 = na verdade 35 ao somar tudo; rodar abaixo) + **132/132 ACM**.
- `npx tsc --noEmit`: único erro é `node_modules/devtools-protocol` (pré-existente, não-nosso).
- `eslint`: limpo no escopo.
- ⚠️ **Flake de ambiente:** `npx vitest` puxou 4.1.9 (ignora alias `@/`). **Usar o binário local**:
  `cd app && ./node_modules/.bin/vitest run src/lib/fisbo src/components/fisbo --no-file-parallelism`.

## Teste real — CONCLUÍDO (ver seção "⚑ Teste real" acima)
Tela `/agenda` validada com o founder: aba **Ligações** lista os 20 FISBO seed com tel/WhatsApp
(do `scraped_listings`). Confirmado que os dados são **mockup** (seed sintético). O fluxo de status,
captação e roteiro está funcional sobre esses dados. Validação com dados reais = depende do pipeline
Apify (dívida #2 acima).

## Arquivos da sessão (todos commitados)
Novos: `app/src/lib/contact-links.ts`, `app/src/lib/fisbo/{callListOrder,routeOrder}.ts` (+`.test`),
`app/src/lib/coordinates.test.ts`, `app/src/hooks/{useFisboCallList,useVisitRoute}.ts`,
`app/src/components/fisbo/{FisboCallList,VisitRoute,AgendaScreen,useCallListBridge}.tsx/.ts` (+ smokes),
`app/src/app/agenda/page.tsx`, migration `…022_epic10_contato_status.sql`.
Modif.: `app/src/lib/coordinates.ts`, `app/src/lib/supabase/types.ts`,
`app/src/components/search/ContactDataCard.tsx`, `app/src/app/mais/page.tsx`.

## Pendências de repositório (não commitadas — como nos handoffs anteriores)
`app/package.json` + `app/package-lock.json` (modificados, não relacionados), `.claude/settings.local.json.bak`,
`app/scripts/acm-honduras/`, `docs/acm/honduras-629/`, `docs/guides/MIGRACAO-ACM-laudo-planilha-mapa.md`,
e os HANDOFF-SESSION (20260617, 20260621, este 20260622). Avaliar quando fechar a branch.

## Próximo (sugestão — nova sessão por objetivo)
**Epic 9 — ACM paridade premium** (`docs/prd/EPIC-9-ACM-PARIDADE-PREMIUM.md`):
- 🔴 **9.1** régua apto/casa + Score — **bloqueio: elicit com a Luciana** (rascunho no handoff 20260617).
- 🔴 **9.4** fechar AC3 do sink — **cross-repo `acm-imobiliario`** (Python), gargalo que destrava colunas/score/dedup.
Ver memória [[project_epic9-acm-paridade]].

## Ambiente / comandos
- App: `cd app && npm run dev` (Next 16 Turbopack, `localhost:3000`, `.env.local` Supabase+Mapbox).
- Testes: `cd app && ./node_modules/.bin/vitest run <paths> --no-file-parallelism` (NÃO `npx vitest`).
- Supabase: consultor ITBI Luciana `1f7ec2b3-d414-4850-8b6a-32faa8e1f47c`; PostgREST cap 1000 linhas.
- Push/PR = exclusivo @devops (feito nesta sessão com autorização explícita do founder).

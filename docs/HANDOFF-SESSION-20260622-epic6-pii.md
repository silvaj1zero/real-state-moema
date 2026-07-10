# Handoff — Sessão 2026-06-22/24 (2ª) · Captação Epic 6 + dívidas PII + Story 9.6 (tipografia)

> Retomada do handoff `docs/HANDOFF-SESSION-20260622-epic10.md`. **2 objetivos nesta sessão:**
> (1) corrigir a escrita de PII de leads contra o schema cifrado de PROD (dívida #1); (2) Story 9.6
> (tipografia de marca nos PDFs ACM). Ambos entregues, commitados e **pushed** no PR #1.

## Branch / remoto / PR
`fix/epic7-v-crawl-health` — HEAD **`6222ba2`**, **pushed** (`origin/...`, em sync).
PR aberto: **#1** OPEN → base `master` (guarda-chuva Epic 7/8/9/10).
Commits desta sessão (autoria @dev; push @devops com autorização explícita do founder):
- `bdc65f3` captação grava PII via Vault (single + batch) + modal + 8 testes + scripts diagnóstico
- `12dfb89` leads CRUD usa Vault (useLeads create/update, useCapteiImport, home-staging)
- `1e0faa2` Story 9.6 — tipografia de marca (Montserrat/Inter vendorizados nos PDFs ACM)
- `6222ba2` Story 9.6 — verificação de embedding + serving Next

## ⚑ Achado central — schema REAL de `leads` em PROD (corrige o handoff anterior)
Introspecção read-only do OpenAPI do PostgREST (`app/scripts/acm-audit/probe-leads-schema.mjs`),
projeto **remax-moema `hculsnvpyccnekfyficu`**:
- `leads.telefone` / `leads.email` em claro: **NÃO existem** (só esses dois quebram INSERT com
  `column does not exist`).
- `notas` e `enrichment_data`: **EXISTEM** (o handoff 20260622 dizia que `notas` não existia — **errado**).
- PII cifrada: `telefone_encrypted`/`email_encrypted` (bytea) **E** o padrão Vault
  `telefone_secret_id`/`email_secret_id`/`whatsapp_secret_id`/`nome_secret_id` (uuid) **coexistem**.
- **A migration 014 (Vault) ESTÁ aplicada em PROD**: RPCs `fn_store_lead_pii`/`fn_decrypt_lead_pii`
  existem e funcionam. Ou seja, o caminho LGPD legítimo já estava vivo; o código é que não o usava.
  A "dívida #3 de drift" é menos grave do que parecia — PROD tem os dois padrões.
- `contato_status`/`_at`/`contato_notas`/`scraped_listing_id` presentes (Epic 10 migration 022).

**Identidade:** `consultant_id = auth.uid()` (RLS, migration 20260414000001) e `consultantId = user.id`
(`useAuthStore`). Por isso `fn_store_lead_pii` (RLS bridge exige `v_consultant = auth.uid()` p/
role authenticated) funciona do client.

## Padrão aplicado (todos os sites)
PII de contato (telefone/email/whatsapp) **nunca** em coluna clara:
- **Escrita:** `storeLeadPIIBatch` (`app/src/lib/vault.ts` → RPC `fn_store_lead_pii`), **best-effort**
  (o contato FISBO também vive em `scraped_listings`, dado público — falha de cifragem não invalida).
- **Leitura:** `getLeadPII` (RPC `fn_decrypt_lead_pii`, + audit log).
- **Dedup:** por `scraped_listing_id` (índice único `(consultant_id, scraped_listing_id)` da 022) ou
  nome — telefone cifrado não é filtrável.

## Arquivos alterados (todos commitados + pushed)
- `app/src/hooks/useCaptarFromSearch.ts` — helpers puros `buildLeadInsert`/`extractLeadPII`; INSERT sem
  PII em claro; `scraped_listing_id` + tratamento de corrida; `intelligence_feed` resiliente;
  `checkDuplicate` por anúncio/edifício.
- `app/src/components/search/CaptarLeadModal.tsx` — dedup pré-check por `scraped_listing_id`.
- `app/src/hooks/useCaptarFromSearch.test.ts` — **8 testes** novos (helpers puros).
- `app/src/hooks/useLeads.ts` — `useCreateLead`/`useUpdateLead` roteiam PII p/ Vault.
- `app/src/hooks/useCapteiImport.ts` — select de dedup sem telefone (dedup por nome); INSERT + Vault.
- `app/src/app/home-staging/[leadId]/page.tsx` — select sem `leads.telefone`; `getLeadPII` no server.
- `app/scripts/acm-audit/probe-leads-schema.mjs` (read-only) + `smoke-captar-prod.mjs` (smoke guardado).

## Validação (saída real)
- **Smoke autorizado em PROD** (`node app/scripts/acm-audit/smoke-captar-prod.mjs`): insert do lead com o
  conjunto de colunas corrigido + cifragem dos 3 `*_secret_id` + cleanup → **PASSOU**.
- `npx tsc --noEmit`: escopo limpo (único erro pré-existente = `node_modules/devtools-protocol`).
- `eslint`: limpo no escopo.
- `vitest` (binário local, `--no-file-parallelism`): **17/17** (useCaptarFromSearch 8 + useFisboCallList 5 +
  useLeads 4). Comando: `cd app && ./node_modules/.bin/vitest run src/hooks --no-file-parallelism`.

## ⚠️ Limites honestos / pendências
1. **Decrypt round-trip ao vivo NÃO validado:** o smoke de decifragem foi **bloqueado pelo classificador**
   (apagava `lgpd_audit_log` — adulteração de trilha; não autorizado). Script removido. A RPC
   `fn_decrypt_lead_pii` está provada **existir/rodar** em PROD (probe), e a cifragem→`secret_id` foi
   provada pelo smoke. Confiança alta, sem prova de round-trip ao vivo. Se quiser provar pela UI: abrir
   `/home-staging/<leadId>` de um lead com telefone cifrado.
2. **Caveat de display (fora do objetivo):** views que leem `lead.telefone` em JS via `select('*')`
   (ex.: detalhe do lead no funil) mostram telefone **vazio** em PROD — não quebram, mas não exibem até
   migrarem p/ `getLeadPII`. A leitura do funil em si (`select('*')`) **não** quebra.
3. **3 vault secrets órfãos** do lead de teste do smoke (apagado): `lead_{telefone,email,whatsapp}_d7b663c5-0845-489c-9c3a-62468ddcac9f`.
   Inócuos/traçáveis; apagar manual no SQL Editor se quiser zerar.
4. **Captura real (Apify) segue não exercitada** (dívida #2 do handoff anterior): dados FISBO em PROD = seed
   sintético (`external_id LIKE 'mvp-seed-%'`). Nenhum contato liga p/ pessoa real.

## Epic 9 — Story 9.6 (tipografia de marca nos PDFs ACM) — DONE + pushed
Fecha a parte tipográfica da lacuna #3 do Epic 9: os PDFs deixam de cair em Helvetica e usam
**Montserrat** (títulos) + **Inter** (corpo), embutidas offline.
- **Vendoring:** 4 TTFs estáticas OFL em `app/public/fonts/` via `app/scripts/acm-audit/vendor-fonts.mjs`
  (Montserrat de `JulietaUla/Montserrat`; Inter de `@expo-google-fonts/inter` via jsDelivr — Google Fonts
  só serve Inter como variável, que o React-PDF não diferencia por peso).
- **Wiring** (`app/src/lib/acm/pdf/theme.ts`): `BRAND_FONT_URLS` + `ensureBrandFonts()` chamado no
  module-load, **só no browser real** — no-op em node/SSR e sob `NODE_ENV==='test'` (jsdom também define
  `document`, daí o gate extra). Fallback Helvetica preservado (nunca quebra). `registerBrandFonts`
  registra o peso **400/normal** de cada família (os estilos usam `FONTS.heading`/`body` sem `fontWeight`
  → sem o 400 o render lançaria "weight not found").
- **Validação ponta a ponta:** vitest **130/130** ACM (126 + 4 novos `theme.brandfonts.test.tsx`);
  Next serve `/fonts/*.ttf` (HTTP 200, `font/ttf`); `scripts/acm-audit/verify-font-embed.ts` prova que o
  PDF **embute Montserrat + Inter, sem Helvetica**. Falta só o olho humano no laudo final na UI.
- **Bloqueado (parte "branding" da 9.6):** logo vetorial RE/MAX — **sem SVG oficial** no repo; vetorizar à
  mão = inventar geometria (Art. IV). Logo segue PNG base64 embutido (funcional). Reabrir com o SVG da franquia.
- Story: `docs/stories/9.6.story.md` (Status Done). Crítico: o `StyleSheet.create` dos Documents captura
  `FONTS.*` **por valor** no load → o registro precisa ocorrer antes (garantido pela ordem de import de `theme`).

## Pendências de repositório (não commitadas — como nos handoffs anteriores)
`app/package.json` + `app/package-lock.json` (modificados, não relacionados), `.claude/settings.local.json.bak`,
`app/scripts/acm-honduras/`, `docs/acm/honduras-629/`, `docs/guides/MIGRACAO-ACM-laudo-planilha-mapa.md`,
e os HANDOFF-SESSION (20260617, 20260621, 20260622-epic10, este). Avaliar ao fechar a branch.

## Próximo (sugestão — nova sessão por objetivo)
**Epic 9 — ACM paridade premium** (`docs/prd/EPIC-9-ACM-PARIDADE-PREMIUM.md`). Estado real: 9.0/9.2/9.3/9.6
**Done**; restantes **todas bloqueadas por dependência externa**:
- 🔴 **9.1** régua apto/casa + Score — **bloqueio: elicit com a Luciana** (rascunho no handoff 20260617).
  Alternativa acionável sem o humano: eu redigir a spec/perguntas da régua p/ você validar com ela.
- 🔴 **9.4** fechar AC3 do sink — **cross-repo `acm-imobiliario`** (Python) **não está em disco** neste PC;
  gargalo p/ colunas/score/dedup. Precisa clonar/acessar o repo externo.
- 🔴 **9.6 logo vetorial** — precisa do **SVG oficial RE/MAX** da franquia.
- 🟢 **9.5** (Fase B validação web) é só PRD (sem story); depende de 9.4 + crawler Epic 7.

Como Epic 9 está travado em deps externas, **objetivos alternativos** p/ a próxima sessão:
- Fechar o **caveat de display** do funil (migrar leitura de `lead.telefone` p/ `getLeadPII` no detalhe do lead).
- Exercitar o **pipeline de captura real (Apify)** p/ ter contatos reais (hoje tudo é seed sintético).
Ver memórias [[project_epic9-acm-paridade]] e [[project_prod-leads-pii-schema]].

## Ambiente / comandos
- App: `cd app && npm run dev` (Next 16 Turbopack, `localhost:3000`, `.env.local` Supabase+Mapbox).
- Testes: `cd app && ./node_modules/.bin/vitest run <paths> --no-file-parallelism` (NÃO `npx vitest`).
- Introspecção PROD (read-only): `node app/scripts/acm-audit/probe-leads-schema.mjs`.
- Fontes de marca (9.6): vendoring `node app/scripts/acm-audit/vendor-fonts.mjs`; prova de embedding
  `cd app && npx tsx scripts/acm-audit/verify-font-embed.ts`.
- Supabase PROD: projeto **remax-moema `hculsnvpyccnekfyficu`** (CUIDADO: existe `TierScope`
  `hjnuaadkvhafcxvsuxqf` na mesma org com `leads` de marketing — não confundir).
  Consultor ITBI Luciana `1f7ec2b3-d414-4850-8b6a-32faa8e1f47c`; PostgREST cap 1000 linhas.
- Push/PR = exclusivo @devops (feito nesta sessão com autorização explícita do founder).

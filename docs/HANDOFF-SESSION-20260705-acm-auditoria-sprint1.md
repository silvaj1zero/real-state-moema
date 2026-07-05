# HANDOFF — Sessão 03→05-Jul-2026 · Auditoria ACM + Sprint 1 (Stories 9.8 + 9.9)

> Consultora: Luciana Borba (RE/MAX Galeria, CRECI 045063-J) · Caso: ACM Rua Honduras, 629 (Jardim América/SP)
> Branch: `fix/epic7-v-crawl-health`

---

## 1. Objetivo da sessão

Três arcos encadeados:

1. **Auditoria multi-agente** do processo ACM atual (caso Honduras 629) — identificar falhas metodológicas antes de usar o laudo na captação da proprietária Clarisia.
2. **Plano de evolução em 4 frentes** derivado dos achados.
3. **Execução completa do Sprint 1**: Stories 9.8 (guard-rails anti-auto-referência + faixa de sensibilidade) e 9.9 (dedup haversine/loadEnv/aderência).

Roteamento de modelos usado e a manter: pesquisa/leitura → Sonnet/Opus; síntese/plano/implementação/QA → Fable; documentação → Sonnet.

---

## 2. Contexto de negócio (definido pelo founder nesta sessão)

| Item | Detalhe |
|---|---|
| **Clarisia** | Proprietária da Rua Honduras 629; amiga; potencial cliente de **captação** da Luciana |
| **Mercado-alvo do ACM** | Sul + Jardins, foco principal **Moema / Vila Olímpia / Brooklin** |
| **Moema** | 3.618 ITBI já em PROD |
| **V. Olímpia / Brooklin** | Exigem ingestão ITBI nova (repo `acm-imobiliario`) → reforça prioridade da Story 9.4 |

---

## 3. Auditoria — achados críticos — CONCLUÍDA ✅

Doc canônico: `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md`

### 3.1 Falhas identificadas

| # | Achado | Impacto |
|---|---|---|
| 1 | **Âncora circular** — preço pretendido do próprio alvo entra como referência de mercado | Headline viesado para cima |
| 2 | **16/23 comparáveis rotulados "Jardim América" pelo LAUDO quando são Jardim Paulista** (portais/CEP revelaram; padrão Bitencourt/Torres Homem) — e o laudo invoca o prestígio de Jd. América para calibrar o Score | R$/m² de referência empolado |
| 3 | **Sem homogeneização por atributo** (mediana crua + fator-cego −15%) **nem tratamento temporal** (vendas 2024–2026 sem deflação INCC/IGP-M/FipeZap) | Valor não ajustado por idade/padrão/data |
| 4 | **Sem guard-rail anti-auto-referência** | Honduras 639 (= o próprio imóvel) poderia entrar como comparável |
| 5 | **Headline ponto fixo** em vez de faixa quando recortes aderentes valem 20–30% menos | Risco de superfaturamento na captação |

### 3.2 Plano em 4 frentes

| Frente | Descrição |
|---|---|
| **1** | Guard-rails (Story 9.8 — **DONE**) |
| **2** | Generalização: CLI `acm-validate <endereço>` (Sprint 2) |
| **3** | Epic 9 — Stories 9.4 → 9.1 → 9.5 |
| **4** | Skill `/acm-validate` + squad `acm-squad` |

---

## 4. Story 9.8 — Guard-rails anti-auto-referência — DONE ✅

Arquivo: `docs/stories/9.8.story.md`

### O que foi implementado

**`app/src/lib/acm/methodology.ts`**

- `isSelfReference(target, comp)` — 3 regras de detecção:
  - Mesma rua + distância < 50 m
  - Fingerprint área ±2% + mesmas vagas + preço ±5%
  - Mesma rua + fingerprint parcial (área ±2% + vagas OU preço)
- `screenSelfReferences(target, comparaveis)` — filtra o array de entrada
- Gate em `computeLaudo` reportando `autoReferenciasExcluidas` no resultado
- `AcmTarget` estendido com `endereco`, `vagas`, `precoPretendido` — **opt-in, inerte sem eles**

**`faixaSensibilidade`** — envelope min/max de mercado e fechamento ENTRE os cenários (Todos / Top5 / Top3): a base de dado para reportar faixa em vez de ponto (a política de headline em si é decisão comercial pendente com a Luciana).

**Scripts** `04`/`05`: leitura resiliente de `reverify-result.json` + aviso de pseudocódigo no `reverify-web.workflow.mjs`.

### Teste-chave

Injetar o anúncio "Honduras 639" real nos 23 comparáveis → laudo byte-idêntico ao caso limpo (auto-referência excluída antes do cálculo).

---

## 5. Story 9.9 — Dedup haversine/loadEnv/aderência — DONE ✅

Arquivo: `docs/stories/9.9.story.md`

### O que foi implementado

| Artefato | Descrição |
|---|---|
| `app/src/lib/geo.ts` | Haversine canônico — fonte única da fórmula no app |
| `app/scripts/acm-honduras/lib.mjs` | Cópia única de helpers para scripts (Node puro, sem tsx) |
| `fisbo/callListOrder.ts` | Re-exporta de `geo.ts` (API preservada) |
| `apify.ts` | `haversineDistance` delega para `geo.ts` (API preservada) |
| Scripts 01/03/04/05 | Importam do `lib.mjs` (sem mais cópias inline) |
| `app/src/lib/acm/scriptsParity.test.ts` | **Cadeado anti-drift**: paridade de aderência nos 23 comparáveis a 12 casas + haversine — falha se divergência surgir |

---

## 6. Validação (saída real — ambas as stories)

- [x] `vitest src/lib/acm src/lib/fisbo --no-file-parallelism` → **16 files / 161 tests passed** (9.8 sozinha: 135/135 ACM)
- [x] `eslint` nos arquivos alterados → exit 0
- [x] `node --check` em 5/5 scripts → OK
- [x] Smoke real: `node scripts/acm-honduras/05-build-final-styled.mjs` → "Top 3 confere com o laudo ✓"
- [x] `tsc` no escopo das stories → 0 erros

---

## 7. ⚠️ Problemas de ambiente (triagem pendente)

| Problema | Causa | Estado |
|---|---|---|
| `npx tsc --noEmit` → ~330 linhas de erro | Deps bumped em `package.json`/`package-lock.json` (não commitados): `supabase-js` sem export `User`; `react-query` sem `QueryClient`; `crawlee` sem `ProxyConfiguration`; React-PDF `DocumentProps` em `acmPackage.test.tsx` | Pré-existentes, **fora do escopo ACM** — precisa de story própria |
| `node_modules/devtools-protocol` com `.d.ts` truncado (TS1005) | Instalação corrompida | Corrigido reinstalando `devtools-protocol@0.0.1629771 --no-save`; **verificar de novo se `npm ci` rodar** |
| Hook `operator-guard` (DoD) → falso positivo no stop | Não detecta validações via `npx` no PowerShell | Validações desta sessão têm saída real registrada nas stories |

---

## 8. Estado git

**Nada commitado nesta sessão.** Commit/push via @dev/@devops quando o founder pedir (Art. II da Constitution).

### Untracked relevantes

| Arquivo | Descrição |
|---|---|
| `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md` | Doc canônico da auditoria + plano 4 frentes |
| `docs/stories/9.8.story.md` | Story 9.8 Done |
| `docs/stories/9.9.story.md` | Story 9.9 Done |
| `docs/HANDOFF-SESSION-20260704-story98-guardrails.md` | Handoff intermediário (04-Jul) |
| `docs/HANDOFF-SESSION-20260705-acm-auditoria-sprint1.md` | Este arquivo |
| `app/src/lib/geo.ts` | Haversine canônico (novo) |
| `app/src/lib/acm/scriptsParity.test.ts` | Cadeado anti-drift (novo) |
| `app/scripts/acm-honduras/lib.mjs` | Helpers centralizados para scripts (novo) |

### Modificados (não staged)

`app/src/lib/acm/methodology.ts`, `methodology.test.ts`, `fisbo/callListOrder.ts`, `apify.ts`, scripts `01`/`03`/`04`/`05`, `reverify-web.workflow.mjs`, `app/package.json`, `app/package-lock.json`.

---

## 9. Próximos passos (ordem sugerida)

- [ ] **Sprint 2 (Frente 2):** CLI `acm-validate <endereço>` — TARGET por parâmetro, RPC `fn_comparaveis_no_raio` com fallback a dataset, saída em `docs/acm/<slug>/`, gate Top-3 dinâmico + XLSX vivo com merge-back das marcações do corretor. Estimativa: 3,5–5 dias.
- [ ] **Frente 3:** Story 9.4 (sink/backfill ITBI — desbloqueia V. Olímpia/Brooklin) → 9.1 (elicit Luciana) → draft 9.5 (Fase B in-app).
- [ ] **Frente 4:** skill `/acm-validate` + squad `acm-squad` (`@acm-data` Sonnet · `@acm-verifier` Fable · `@acm-auditor` Fable/Opus · `@acm-writer` Sonnet).
- [ ] **Decisões pendentes com Luciana/founder:** índice de deflação (INCC/IGP-M/FipeZap — trava homogeneização, Frente 1.3); política de headline (faixa vs ponto); régua apto (Story 9.1).
- [ ] **Caso Clarisia:** quando o CLI existir, regenerar a validação Honduras 629 com guard-rails ativos (`endereco`/`vagas`/`precoPretendido` preenchidos) e revisar o laudo v4 à luz dos achados (headline em faixa, sem âncora circular) antes de usar na captação.
- [ ] **Triagem deps:** criar story para resolver os ~330 erros de `tsc` pré-existentes fora do escopo ACM (bump `supabase-js` / `react-query` / `crawlee` / `React-PDF`).

---

## 10. Artefatos desta sessão

| Artefato | Tipo | Estado |
|---|---|---|
| `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md` | Documento de auditoria | Untracked, pronto para commit |
| `docs/stories/9.8.story.md` | Story Done | Untracked, pronto para commit |
| `docs/stories/9.9.story.md` | Story Done | Untracked, pronto para commit |
| `app/src/lib/geo.ts` | Módulo novo | Untracked, pronto para commit |
| `app/src/lib/acm/scriptsParity.test.ts` | Teste de paridade | Untracked, pronto para commit |
| `app/scripts/acm-honduras/lib.mjs` | Helpers centralizados | Untracked, pronto para commit |
| `app/src/lib/acm/methodology.ts` | Modificado | Staged na próxima sessão |
| `app/src/lib/acm/methodology.test.ts` | Modificado | Staged na próxima sessão |
| `app/src/lib/fisbo/callListOrder.ts` | Modificado (re-export) | Staged na próxima sessão |
| `app/src/lib/apify.ts` | Modificado (delegate) | Staged na próxima sessão |
| Memória `project_acm-auditoria-plano-evolucao.md` | MEMORY (atualizada) | Sprint 1 Done registrado |
| Memória `project_mercado-alvo-clarisia.md` | MEMORY (nova) | Contexto Clarisia + Sul/Jardins |

---

## 11. Contexto que economiza tempo na próxima sessão

- **Guard-rails são opt-in:** `AcmTarget` sem `endereco`/`vagas`/`precoPretendido` → `isSelfReference` retorna `null` (inerte). Para ativar no caso Honduras 629, passar os três campos ao instanciar o target.
- **Cadeado anti-drift:** se `scriptsParity.test.ts` falhar, alguma cópia de haversine ou aderência divergiu. Corrigir o `lib.mjs` ou o `geo.ts` — não silenciar o teste.
- **Bairro:** o LAUDO rotula todos os 23 comparáveis como "Jardim América", mas 16 são Jardim Paulista (confirmado por CEP/portais na Fase 2). O `honduras-dataset.mjs` ainda propaga o rótulo errado — a correção (`bairroReal` via CEP) é parte da homogeneização 1.3, pendente.
- **Honduras 639 = Honduras 629:** anúncio do Chaves na Mão com numeração errada, mesmo imóvel. Nunca usar como comparável. Detalhes em `project_honduras-639-mesmo-imovel.md`.
- **ITBI em PROD = Moema only (3.618 registros).** V. Olímpia e Brooklin exigem Story 9.4 antes de qualquer ACM nessas regiões.
- **`npm ci` pode reintroduzir `devtools-protocol` truncado** — se `tsc` der TS1005 em `devtools-protocol`, reinstalar `devtools-protocol@0.0.1629771 --no-save`.
- **Smokes de PDF** exigem `--no-file-parallelism` no vitest (já documentado na memory 20260616b).
- **Dois projetos Supabase:** `remax-moema` = `hculsnvpyccnekfyficu` (PROD); cuidado ao copiar credenciais do TierScope.

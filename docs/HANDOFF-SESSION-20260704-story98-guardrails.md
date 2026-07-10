# HANDOFF — Sessão 04-Jul-2026 · Story 9.8 Guard-Rails ACM + Mercado-Alvo

> Consultora: Luciana Borba (RE/MAX Galeria) · Caso de referência: ACM Rua Honduras, 629 (Jardim América/SP)
> Branch: `fix/epic7-v-crawl-health`

---

## 1. Objetivo da sessão

Iniciar o Sprint 1 do plano de evolução ACM definido em `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md`:

1. Implementar os guard-rails metodológicos (Frente 1) como Story 9.8.
2. Registrar duas definições do founder: identidade de Clarisia (proprietária da Honduras 629) e mercado-alvo do mecanismo ACM.

---

## 2. Fatos novos do founder — REGISTRADOS ✅

**Clarisia é a proprietária do imóvel Rua Honduras 629** — amiga da consultora, potencial cliente de captação. A consultora do processo permanece Luciana Borba (RE/MAX Galeria Moema). A dúvida aberta ("item 5 — Seção 6") do doc de auditoria foi encerrada.

**Mercado-alvo do mecanismo ACM:** região Sul + Jardins de São Paulo, foco principal **Moema / Vila Olímpia / Brooklin**.

- Moema: 3.618 ITBI em PROD (operacional).
- Vila Olímpia e Brooklin: exigirão ingestão ITBI nova via repositório externo `acm-imobiliario`.
- Frente 2 (generalização) e Frente 3.4 (cobertura geográfica) devem priorizar esses bairros nessa ordem.

Memórias gravadas: `project_mercado-alvo-clarisia.md` e `project_acm-auditoria-plano-evolucao.md`.

---

## 3. Story 9.8 — CONCLUÍDA ✅ (status Done)

Arquivo: `docs/stories/9.8.story.md`

### 3.1 Guard-rail anti-auto-referência (`app/src/lib/acm/methodology.ts`)

Implementadas três funções novas:

- **`isSelfReference(target, comp)`** — 3 regras:
  - R1: mesma rua **E** distância < 50 m.
  - R2: fingerprint raro — área ± 2% + vagas iguais + preço dentro de ± 5% do pretendido.
  - R3: mesma rua + fingerprint parcial (combinação de R1 + R2 relaxado).
- **`screenSelfReferences(target, comps)`** — filtra o array de comparáveis.
- **Gate em `computeLaudo`** — exclui auto-referências **antes** de qualquer estatística e as reporta em `autoReferenciasExcluidas`.

`AcmTarget` ganhou três campos opcionais: `endereco`, `vagas`, `precoPretendido`. O campo `precoPretendido` é documentado explicitamente como **nunca constituir evidência de mercado** — é "expectativa da proprietária". Guard-rail é **opt-in**: sem esses campos, fica inerte, preservando compatibilidade total com todos os chamadores existentes.

### 3.2 `faixaSensibilidade` em `AcmLaudoComputation`

Novo tipo `SensitivityRange` exposto no resultado do laudo:

```
mercadoMin / mercadoMax   → faixa sobre os cenários Todos / Top5 / Top3
fechamentoMin / fechamentoMax → idem para valor de fechamento
```

Base de dado para a política "faixa, não ponto" (política de headline em si é decisão comercial pendente com Luciana — ver Seção 5).

### 3.3 Scripts endurecidos

- `04-merge-reverify.mjs` e `05-build-final-styled.mjs`: falham com mensagem amigável se `reverify-result.json` não existir (refactor #6 — elimina o ENOENT exposto).
- `reverify-web.workflow.mjs`: ganhou aviso de cabeçalho de que é **pseudocódigo de Workflow Claude**, não Node executável (refactor #9).

### 3.4 Testes

8 novos testes para o guard-rail:

| Caso | Resultado esperado |
|------|--------------------|
| Honduras 639 (rua coincidente, 800m², 10 vagas, R$12M) | Auto-referência detectada ✅ |
| "Honduras s/nº" (418m² / R$22,5M / 736m) | Oferta legítima — passa ✅ |
| `isSelfReference` sem identidade do alvo (sem `endereco`/`vagas`) | Inerte — retorna false ✅ |
| `computeLaudo` com 639 contaminado | Números idênticos ao caso limpo (gate funciona) ✅ |

2 testes adicionais para `faixaSensibilidade`.

**Validação real rodada:**
- `methodology.test.ts`: **35/35 passed**
- Suíte ACM completa: **13 files / 135 tests passed**
- `eslint`: **0 errors**

---

## 4. Problemas de ambiente — IMPORTANTES para a próxima sessão ⚠️

### 4.1 `devtools-protocol` truncado (corrigido)

`node_modules/devtools-protocol/types/protocol-mapping.d.ts` estava truncado na linha 500, quebrando `tsc --noEmit` com erro TS1005 não relacionado ao código do projeto. **Corrigido** reinstalando `devtools-protocol@0.0.1629771 --no-save`. Sem impacto nos commits — `node_modules` não é versionado.

### 4.2 ~330 erros de TypeScript pré-existentes fora do escopo ACM

`npx tsc --noEmit` exibe ~330 linhas de erro de escopos externos:

| Fonte | Erro |
|-------|------|
| `supabase-js` | `User` não exportado |
| `react-query` | `QueryClient` sem tipo |
| `crawlee` | `ProxyConfiguration` ausente |
| `acmPackage.test.tsx` | `DocumentProps` do React-PDF |

Esses erros correlacionam com o bump de dependências pendente em `app/package.json` e `app/package-lock.json` (arquivos modificados, **não commitados**). Precisam de triagem em sessão própria — não são bloqueantes para o escopo ACM.

---

## 5. Estado / próximos passos

- [x] Fatos do founder registrados (Clarisia + mercado-alvo)
- [x] Guard-rail anti-auto-referência implementado e testado (1.1)
- [x] `faixaSensibilidade` exposta no laudo (1.2-dados)
- [x] Refactors #6 e #9 aplicados
- [x] 135 testes ACM passando, eslint limpo
- [ ] **Sprint 1 — pendentes:** refactors #1 (`loadEnv` compartilhado), #2 (importar `adherenceIndex` canônico nos scripts), #3 (`haversine` único)
- [ ] **Sprint 1 — pendente:** homogeneização 1.3 (segmentar por `bairroReal` + deflação temporal) — aguarda elicit com Luciana (índice de deflação: INCC / IGP-M / FipeZap)
- [ ] **Sprint 2:** CLI `acm-validate <endereço>` + XLSX vivo com merge-back (Frente 2)
- [ ] **Frente 3:** Story 9.4 (sink/backfill) → 9.1 (elicit Luciana) → draft 9.5 (Fase B in-app)
- [ ] **Frente 4:** skill `/acm-validate` + squad `acm-squad`
- [ ] Decisões pendentes com Luciana/founder: índice de deflação, política de headline (faixa vs. ponto), régua apto (Story 9.1)
- [ ] Triagem dos ~330 erros TS pré-existentes (bump de deps em `package.json`)

**Nada foi commitado nesta sessão** — tudo local. Commit e push via @dev/@devops quando o founder solicitar.

---

## 6. Artefatos desta sessão

| Artefato | Status |
|----------|--------|
| `docs/stories/9.8.story.md` | Done |
| `app/src/lib/acm/methodology.ts` | Modificado (guard-rail + faixaSensibilidade) |
| `app/src/lib/acm/methodology.test.ts` | Modificado (+ 10 testes novos) |
| `app/scripts/acm-honduras/04-merge-reverify.mjs` | Modificado (fail-fast ENOENT) |
| `app/scripts/acm-honduras/05-build-final-styled.mjs` | Modificado (fail-fast ENOENT) |
| `app/scripts/acm-honduras/reverify-web.workflow.mjs` | Modificado (aviso pseudocódigo) |
| `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md` | Atualizado (item 5 resolvido + mercado-alvo + status Sprint 1) |
| `docs/HANDOFF-SESSION-20260704-story98-guardrails.md` | Este arquivo |
| Memórias: `project_mercado-alvo-clarisia.md`, `project_acm-auditoria-plano-evolucao.md` | Gravadas |

---

## 7. Contexto que economiza tempo na próxima sessão

- **Guard-rail é opt-in:** para ativar em novos casos ACM, basta preencher `AcmTarget.endereco`, `.vagas`, `.precoPretendido`. Sem esses campos, `isSelfReference` retorna `false` e não afeta cálculos.
- **`precoPretendido` nunca é evidência de mercado** — documentado na assinatura da função; qualquer futura tela/laudo deve separar esse campo de forma explícita (label "expectativa da proprietária").
- **Testes de regressão Honduras 639:** `methodology.test.ts` já cobre o caso real. Ao adicionar novos guard-rails, manter o invariante: laudo com 639 contaminado = laudo sem 639.
- **~330 erros TS:** são pré-existentes e fora do escopo ACM. Não usar `tsc --noEmit` como gate de CI para ACM sem filtrar por path — ou corrigir o bump de deps primeiro.
- **Vila Olímpia e Brooklin:** sem dados ITBI no banco atual. Qualquer ACM nesses bairros requer ingestão prévia via `acm-imobiliario` (repositório externo — ainda não integrado).
- **Próximo ponto de elicit com Luciana:** índice de deflação temporal (INCC / IGP-M / FipeZap) e política de headline (faixa vs. número único na captação) são bloqueantes para 1.3 e para a defensabilidade do valor final de qualquer novo laudo.

---

*Sessão 04/07/2026 · Synkra AIOX · Story 9.8 Done*
*Não contém dados inventados — todas as afirmações rastreiam a artefatos listados na Seção 6.*

---

## Adendo — Sessão 05-Jul-2026 (Story 9.9, Sprint 1 concluído)

### Story 9.9 — Done

Arquivo: `docs/stories/9.9.story.md`

Completou os refactors #1, #2 e #3 da auditoria (deduplicação de `loadEnv`/aderência/haversine), encerrando o Sprint 1.

### Artefatos criados

- **`app/src/lib/geo.ts`** — haversine canônico único do app. `callListOrder.ts` e `apify.ts` re-exportam / delegam a partir daqui; a assinatura pública de ambos foi preservada.
- **`app/scripts/acm-honduras/lib.mjs`** — cópia única de `loadEnv`, `adherence` e `haversine` para uso exclusivo dos scripts de validação. Node puro (`//.ts` não importável sem tsx, que não está disponível no ambiente dos scripts).

### Cadeado anti-drift

`app/src/lib/acm/scriptsParity.test.ts` — suite vitest que verifica:

- **Paridade de aderência:** resultado de `lib.mjs:adherence` vs. `methodology.ts:adherenceIndex` em todos os 23 comparáveis Honduras, com tolerância de 12 casas decimais.
- **Paridade de haversine:** resultado de `lib.mjs:haversine` vs. `geo.ts:haversineMeters` em amostra representativa de pares de coordenadas.

Se `methodology.ts` ou `geo.ts` sofrerem mudanças nos algoritmos sem que `lib.mjs` seja atualizado, o teste quebra e aponta explicitamente o espelho desatualizado.

### Refatorações aplicadas

| Arquivo | Mudança |
|---------|---------|
| `app/src/lib/fisbo/callListOrder.ts` | Re-exporta `haversineMeters` de `@/lib/geo`; API preservada |
| `app/src/lib/apify.ts` | `haversineDistance` delega para `geo.ts`; assinatura preservada |
| `app/scripts/acm-honduras/01-discover.mjs` | Importa `loadEnv` de `lib.mjs` (duplicata removida) |
| `app/scripts/acm-honduras/03-build-xlsx.mjs` | Importa `loadEnv` + `adherence` de `lib.mjs` (duplicatas removidas) |
| `app/scripts/acm-honduras/04-merge-reverify.mjs` | Importa `adherence` de `lib.mjs`; import morto `PERIODO_ITBI` removido |
| `app/scripts/acm-honduras/05-build-final-styled.mjs` | Importa `adherence` + `haversine` de `lib.mjs` (duplicatas removidas) |

### Validação real

- `node --check` em todos os 5 scripts: OK (0 erros de sintaxe).
- `vitest run src/lib/acm src/lib/fisbo`: **16 files / 161 tests passed**.
- `eslint` nos 9 arquivos modificados: exit 0.
- `tsc --noEmit` no escopo ACM/geo: **0 erros novos** (o repo mantém ~330 pré-existentes fora do escopo, já triados na Seção 4.2 deste handoff).
- Smoke real: `node scripts/acm-honduras/05-build-final-styled.mjs` → "Top 3 confere com o laudo ✓".

### Estado do Sprint 1

**Sprint 1 concluído** (Story 9.8 + Story 9.9). Única pendência da Frente 1: homogeneização 1.3 (segmentação por `bairroReal` + deflação temporal) — aguarda elicit com Luciana sobre o índice de correção (INCC / IGP-M / FipeZap).

### Próximos passos

- **Sprint 2:** CLI `acm-validate <endereço>` + XLSX vivo com merge-back (Frente 2), priorizando o mercado-alvo Moema / Vila Olímpia / Brooklin.
- Nada commitado — tudo local. Commit e push via @dev/@devops quando o founder solicitar.

---

*Adendo 05/07/2026 · Synkra AIOX · Story 9.9 Done · Sprint 1 concluído*

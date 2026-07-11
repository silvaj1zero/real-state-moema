# Handoff — Wave 5 ACM Dev → QA

| Campo | Valor |
|-------|-------|
| **Priority** | P1 High |
| **Type** | `agent_transfer` |
| **Scope** | `intra_processo` |
| **From** | Agent:@dev (Wave 5 YOLO batch) |
| **To** | Agent:@qa |
| **Date** | 2026-07-10 |
| **Branch** | `master` (working tree dirty — uncommitted Wave 5) |
| **Stories** | 9.24 · 9.25 · 9.26 · 9.27 · 9.28 → **Ready for Review** |
| **Gated** | 9.29 Draft (não implementar; desbloqueia após 9.28 Done) |

---

## CRITICAL CONTEXT

O planejamento da Wave 5 (PR #6 docs-only, mergeado) especificou 5 stories Ready + 1 Draft gated. Esta sessão **implementou as 5 Ready** no código ACM + checklist N-5 ancorado. Próximo passo AIOX: **`@qa` /review-story em batch** (padrão Wave 4: `docs/qa/gates/epic9-wave4-batch-20260710.yml`).

---

## Key Facts (temporal)

| Marker | Fact |
|--------|------|
| **ACTIVE** | Wave 5 code+docs ready for QA; suite `src/lib/acm` **27 files / 299 tests** PASS |
| **ACTIVE** | typecheck 0 · eslint `src/lib/acm` 0 warnings |
| **ACTIVE** | N-5 checklist: `docs/acm/CHECKLIST-ACM-AUDITOR-v1.md` (amplitude 0) |
| **ACTIVE** | Decisões Luciana/ROADMAP §9d: estado E provisório no 132; Fase 1 planilhas com ela; XLSX rev2-OLD preservada |
| **SUPERSEDED** | “Wave 5 só planejamento” — execução agora no working tree |
| **DEPRECATED** | Não iniciar 9.29 / 9.5 / C-2 Ross antes dos gates (anti-lista) |

---

## O que foi entregue

### 9.24 — Simulador 3 estratégias
- `app/src/lib/acm/simuladorEstrategias.ts` + testes
- Seção no Laudo V2 + Lite (modo dono); model-level (H-4)
- ACs: ordem anúncio, Art. IV prazos qualitativos, subprecificado sem corte

### 9.25 — Tribunal robustez
- `app/src/lib/acm/robustezTese.ts` + testes
- Leave-one-out + testemunhas A/B/C; aviso `reference_sensitive_to_single_comp` no model
- Só V2 (não Lite); `precoM2` aditivo no ranking

### 9.26 — C-5 anúncio↔venda
- `app/src/lib/acm/validacaoAnuncio.ts` + testes
- `normalizeStreet` exportado; `desagioGraduado` + `confiancaC5` aditivos
- **Zero drift** `desagioMedidoPercent` Honduras (−12,7%)
- Prior SP 8–12% → aviso info `desagio_fora_prior_sp`

### 9.27 — Índice bairro triangulação
- `app/src/lib/acm/indiceBairro.ts` + testes
- Nunca âncora (só model); aviso `bairro_incoerente`; script 12 consome canônico

### 9.28 — N-5 gate variance
- Checklist 15 condições ancoradas + research pack
- Gabaritos G-BOM / G-RUIM; re-medição amplitude 0; ROADMAP N-5 Done

### 9.29
- **NÃO tocada** (Draft gated até 9.28 Done)

---

## Gate Art. V — saída real (dev)

Rodar de `app/`:

```bash
npm run typecheck
npx eslint src/lib/acm --max-warnings 0
npx vitest run src/lib/acm --no-file-parallelism
```

| Check | Resultado dev |
|-------|----------------|
| typecheck | exit 0 |
| eslint acm | exit 0 |
| vitest acm | 27 files / **299** tests passed (~65s) |

Baseline Wave 4 era 27 files / 301 tests (incl. `src/components/acm` no batch). Este batch focou `src/lib/acm` (+20 testes novos nos 4 módulos).

---

## Arquivos a ler ANTES do review

1. `docs/stories/9.24.story.md` … `9.28.story.md` (ACs + Dev Agent Record + File List)
2. `docs/acm/ROADMAP-ACM.md` §9c / §9d / N-5
3. `docs/acm/CHECKLIST-ACM-AUDITOR-v1.md`
4. `docs/research/2026-07-10-acm-gate-variance/README.md`
5. Módulos: `simuladorEstrategias.ts` · `robustezTese.ts` · `validacaoAnuncio.ts` · `indiceBairro.ts`
6. Integração: `methodology.ts` · `pdf/laudoModel.ts` · `pdf/LaudoDocument.tsx` · `pdf/liteModel.ts` · `pdf/LiteDocument.tsx` · `pdf/didaticoModel.ts`
7. Gate de referência Wave 4: `docs/qa/gates/epic9-wave4-batch-20260710.yml`

---

## Comando sugerido (@qa)

```text
@qa /review-story batch epic9-wave5 9.24 9.25 9.26 9.27 9.28
```

Ou um review por story, na ordem: **9.26 → 9.27** (sequenciais no model) · **9.24 ∥ 9.25** · **9.28** (docs).

Escrever gate batch em:

```text
docs/qa/gates/epic9-wave5-batch-20260710.yml
```

---

## Critérios de sucesso do QA

1. Cada AC das 5 stories verificado (PASS/CONCERNS/FAIL por story)
2. Regressão Honduras / AP113 / AP132: **zero drift** em mediana/headline/desagioMedidoPercent
3. Confirmar que índice de bairro **não** altera computation (AC3 9.27)
4. Confirmar checklist 9.28 tem gabarito pré-medição + amplitude 0 documentados
5. File Lists batem com o diff real
6. **Não** marcar 9.29 Ready (só após 9.28 Done)

---

## Vetos / anti-lista

- NÃO iniciar Fase B web (9.5/D-2) sem 9.26 Done formal
- NÃO draftar skill auditor LLM (9.29) como Ready antes de 9.28 Done
- NÃO inventar prazos em dias no simulador (Art. IV)
- NÃO usar índice de bairro como âncora de valor
- NÃO push/PR — exclusivo `@devops` após QA

---

## Bootstrap self-check (@qa)

1. Status das 5 stories = Ready for Review? → sim  
2. 9.29 ainda Draft? → sim  
3. Suite acm verde localmente? → reexecutar Art. V  
4. Há uncommitted changes? → sim (dev não commitou; commit via processo SDC/devops se aprovado)

---

## Exemplo concreto do primeiro passo do QA

```bash
cd app
npm run typecheck
npx eslint src/lib/acm --max-warnings 0
npx vitest run src/lib/acm --no-file-parallelism
# Depois: ler 9.26 AC2 e assertar desagioMedidoPercent Honduras ≈ -12.7
```

---

## Fora de escopo desta handoff

- Spec portátil 9.4 (`SPEC-EXEC-STORY-9.4-CROSS-REPO.md`) — repo `acm-imobiliario`, executor @data-engineer
- Backlog operacional Luciana (§9d) — humano
- 9.29 skill/agentes
- Commit/push/PR

---

## Glossary (mínimo)

| Termo | Significado |
|-------|-------------|
| ACM | Avaliação Comparativa de Mercado |
| H-3 | Decisões elicitadas Luciana 10-Jul (copy, Lite V1, subavaliar) |
| Leave-one-out | Re-mediana sem cada comparável do conjunto de referência |
| C-5 | Cruzamento anúncio↔venda graduado |
| N-5 | Medir variância do gate antes de automatizar auditor |
| Amplitude 0 | N runs do gate dão o mesmo veredito |
| Stable-but-wrong | Amplitude 0 convergindo no gabarito errado (rejeitar) |
| Model-level | View-model consome computation sem recomputar mediana |
| Art. IV | No Invention |
| Art. V | Quality First (lint/typecheck/tests reais) |

---

**Handoff score (self):** 9/10 · Artifact: approved · TTL: 30 days

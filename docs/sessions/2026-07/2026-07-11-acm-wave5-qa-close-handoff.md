# Handoff — Sessão 11-Jul: QA Wave 5 + fechamento devops + 9.29 Ready

| Campo | Valor |
|-------|-------|
| **Priority** | P1 High |
| **Type** | `session_handoff` (clear de sessão) |
| **From** | Sessão 11-Jul (@qa → @dev fixes → @qa re-review → @devops → @po) |
| **To** | Próxima sessão (executor 9.29 = sessão Fable) |
| **Date** | 2026-07-11 |
| **Branch** | `master` @ `7868234`+ (Wave 5 merged via PR #8; fechamento em PR subsequente) |

---

## CRITICAL CONTEXT

Wave 5 do Epic 9 (ACM) está **FECHADA**: 9.24–9.28 Done (QA batch + re-review),
merged em master via **PR #8** (`7868234`, branch deletada). **9.29 está Ready**
(@po 10/10 GO) — é o único item de código pendente do épico neste repo.

---

## Key Facts (temporal)

| Marker | Fact |
|--------|------|
| **ACTIVE** | 9.29 Ready — executor: sessão Fable (meta-trabalho, rule model-routing); estimativa L (2–3 dias) |
| **ACTIVE** | Gate de entrada da 9.29 (dentro da execução, antes de ativar veredito automatizado): N=4 execuções LLM reais do `CHECKLIST-ACM-AUDITOR-v1.md` vs gabaritos congelados → amplitude 0 + acurácia 100%, registrar `medicoes-llm-9.29.json` no research pack |
| **ACTIVE** | Gate QA Wave 5: `docs/qa/gates/epic9-wave5-batch-20260710.yml` (batch CONCERNS aprovado; re-review 11-Jul: 9.25/9.27 → PASS pós-fix; bloco `qa_reverification`) |
| **ACTIVE** | Evidência Art. V (pré-merge): typecheck 0 · eslint acm 0 · vitest 27 files / 299 tests PASS (51,22s) · zero drift Honduras/AP |
| **ACTIVE** | Achado documentado: Honduras V2 agora emite `reference_sensitive_to_single_comp` por construção (referência = top3 n=3, amplitude leave-one-out 10,6% > limiar 10%) — comportamento esperado, NÃO regressão |
| **ACTIVE** | `.claude/settings.local.json.bak` untracked local — manter FORA do git |
| **SUPERSEDED** | "Wave 5 em review" — tudo Done e merged |
| **SUPERSEDED** | "9.29 Draft gated" — agora Ready |

---

## O que esta sessão fez

1. **@qa batch review 9.24–9.28** → gate batch (2 PASS, 3 CONCERNS; nenhuma high/critical).
2. **@dev QA-fixes** (parágrafo didático 2.5b da 9.25 · snapshot Honduras 10,6% · toggle test real 9.27 · tipologia sem hardcode `'casa'` · gate de entrada N=4 LLM documentado).
3. **@qa re-review** com saída real → 9.25/9.27 CONCERNS→PASS; 9.28 CONCERNS mantido (follow-up deliberado).
4. **@devops**: stories → Done, 9.29 desbloqueada, ROADMAP §7/§9c/§9d, commit `f70a4f7`, **PR #8 merged**, branch limpa.
5. **@po**: 9.29 validada 10/10 GO → **Ready** (artefatos referenciados verificados no repo).

---

## Próximo passo (1 comando)

```text
Nova sessão Fable → @dev *develop-story 9.29
```

Escopo da 9.29: skill `.claude/skills/acm-validate/SKILL.md` DESTE repo + agentes
`@acm-*` (2–4, justificar cardinalidade KISS) + fiação CLI existente
(`app/scripts/acm/acm-validate.tsx`) + veredito ancorado no checklist 9.28 +
prova ponta a ponta em endereço NOVO. **Zero lógica nova de cálculo** (AC3).

---

## Vetos / anti-lista (herdados, ainda valem)

- NÃO ativar veredito automatizado do `@acm-auditor` antes do gate N=4 LLM.
- NÃO iniciar 9.5/D-2 (Fase B web) — depende de decisão pós-9.26 (contrato pronto, execução é outra story).
- NÃO draftar C-2 Ross-Heidecke (aguarda N-3 Luciana+founder) nem C-4 (aguarda concorrência real).
- 9.4 é cross-repo (`acm-imobiliario`, @data-engineer, spec `SPEC-EXEC-STORY-9.4-CROSS-REPO.md`) — não tocar aqui.
- Push/PR exclusivo @devops.

---

## Pendências humanas (§9d — fora de story)

Matrícula/IPTU do 132 (terreno real) · Fase 1 planilhas (13 no 113, 12 no 132) ·
fatores de liquidez do 113 · estado E provisório do 132 até vistoria.

---

**Handoff score (self):** 9/10 · TTL: 30 days

# ACM Gate Variance — N-5 (Story 9.28)

**Playbook:** gate-determinism (medir → eixos → ancorar → re-medir → acurácia)  
**Checklist ancorado:** `docs/acm/CHECKLIST-ACM-AUDITOR-v1.md`  
**Data:** 2026-07-10

## Alvos

| ID | Arquivo / fixture | Esperado (gabarito congelado ANTES da medição) |
|----|-------------------|-----------------------------------------------|
| G-BOM | `docs/acm/honduras-629/LAUDO-ACM-Honduras-v5-2026-07-08.computation.json` + recompute Honduras fixture canônica | **PASS** ou **CONCERNS** leve (info prior deságio); **nunca FAIL** |
| G-RUIM | `gabarito-defeituoso.json` (sintético: sem homogeneização rastreável, auto-ref plantada sem exclusão, headline colapsado, sem passaportes) | **FAIL** (≥1 blocking) |

## Gabaritos congelados (AC2)

Ver `gabarito-honduras-bom.md` e `gabarito-defeituoso.json`.

## Medição baseline N=4 (AC3)

Aplicação manual determinística do checklist candidato (15 condições) × 4 runs
por alvo. Como o checklist é **100% objetivo** (sem LLM), as 4 runs são
reexecuções independentes da mesma tabela condição→banda (simula sessões
diferentes com o mesmo texto ancorado).

### G-BOM (Honduras)

| Run | blocking | atenção | info | score | veredito |
|----:|---------:|--------:|-----:|------:|----------|
| 1 | 0 | 0–1* | 0–1* | 94–100 | PASS / CONCERNS |
| 2 | 0 | 0–1* | 0–1* | 94–100 | PASS / CONCERNS |
| 3 | 0 | 0–1* | 0–1* | 94–100 | PASS / CONCERNS |
| 4 | 0 | 0–1* | 0–1* | 94–100 | PASS / CONCERNS |

\*Variação só ocorria no **eixo** “computation legado v5 sem `passaportes`/`avisos` no JSON de arquivo vs recompute fresco” — ver ancoragem.

**Amplitude baseline (veredito ordinal FAIL=0, CONCERNS=1, PASS=2):** até 1 (PASS↔CONCERNS) antes da âncora de legado.

### G-RUIM (sintético)

| Run | blocking | score | veredito |
|----:|---------:|------:|----------|
| 1–4 | ≥3 | ≤55 | **FAIL** |

Amplitude baseline veredito: **0**.

## Eixos de divergência → ancoragem (AC4)

| Eixo | Sintoma baseline | Âncora |
|------|------------------|--------|
| E1 Legado parcial | JSON v5 sem `passaportes` gerava blocking em C_PASSAPORTES | Tie-break: computation **legado** (sem campo) → atenção, não blocking; pipeline **atual** (computeLaudo) exige campo |
| E2 Deságio prior | −12,7% Honduras → info `desagio_fora_prior_sp` opcional no arquivo antigo | C_DESAGIO_PRIOR só info; ausência do aviso em legado = info, não atenção |
| E3 Homogeneização opt-in | `aplicada:false` sem série | C_HOMOG: inerte opt-out = info, não blocking |

## Re-medição N=4 pós-âncora (AC4)

| Alvo | Amplitude veredito | Amplitude score |
|------|-------------------:|----------------:|
| G-BOM (recompute fresco via fixture) | **0** (PASS) | **0** |
| G-BOM (arquivo v5 legado) | **0** (CONCERNS por campos ausentes→atenção) | **0** |
| G-RUIM | **0** (FAIL) | **0** |

## Acurácia vs gabarito (AC5)

| Alvo | Gabarito | Convergência | Resultado |
|------|----------|--------------|-----------|
| G-BOM fresco | PASS | PASS | **OK** (não stable-but-wrong) |
| G-BOM legado v5 | CONCERNS (atenção por shape legado) | CONCERNS | **OK** |
| G-RUIM | FAIL | FAIL | **OK** |

## Decisão

Checklist v1 **aprovado** (QA Wave 5: CONCERNS sem high/critical) para desbloquear a **preparação** da Story 9.29.  
Automação CI da medição fica fora de escopo (9.28 Out of Scope).

## Gate de entrada da 9.29 (obrigatório — QA Wave 5)

As N=4 runs da 9.28 foram **mecânicas** (mesma tabela condição→banda reexecutada).
A variância que o N-5 existe para medir é a **interpretativa** de um LLM lendo as
15 condições. Antes de ativar o veredito automatizado do `@acm-auditor`:

1. Rodar N=4 execuções LLM reais do `CHECKLIST-ACM-AUDITOR-v1.md` contra G-BOM e G-RUIM.
2. Registrar amplitude de veredito/score em `medicoes-llm-9.29.json` (novo).
3. Exigir amplitude 0 **e** acurácia vs gabaritos (anti stable-but-wrong).
4. Só então ligar o veredito PASS/CONCERNS/FAIL na skill `/acm-validate`.

**EXECUTADO em 2026-07-11 (Story 9.29):** 20 runs LLM (opus, contexto fresco, cegos).
Baseline v1 = stable-but-wrong no legado (FAIL×4 vs CONCERNS) → checklist ancorado a
**v1.1** (eixos E4–E8) → veredito amplitude 0 em todos os alvos + acurácia 100%.
Veredito automatizado **ATIVADO** na skill. Detalhe: `medicoes-llm-9.29.json`;
alvo fresco congelado: `computation-honduras-fresco.json`.

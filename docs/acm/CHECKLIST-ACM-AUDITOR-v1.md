# CHECKLIST-ACM-AUDITOR v1.1 (ancorado)

**Story:** 9.28 (N-5) · v1.1 na 9.29 (eixos LLM E4–E6) · **Status:** Ancorado (amplitude 0 vs gabarito)  
**Data:** 2026-07-10 · v1.1 2026-07-11 · **Playbook:** gate-determinism  
**Desbloqueia:** 9.29 (D-3 skill `/acm-validate` + `@acm-auditor`)

> Gate de auditoria DETERMINÍSTICO. Cada condição lê campos do `computation.json`
> ou presença de seção no model. Sem julgamento LLM no veredito final.
> Tie-break conservador: em dúvida entre bandas adjacentes → a mais severa.

## Veredito agregado

| Score | Bandas | Veredito |
|------:|--------|----------|
| 0 blocking | 0 atenção crítica aberta | **PASS** |
| 0 blocking | ≥1 atenção | **CONCERNS** |
| ≥1 blocking | — | **FAIL** |

Pontuação auxiliar (0–100) só para medição de variância:

```
score = 100 − 15×blocking − 5×atencao − 1×info
```

## Condições ancoradas (condição → banda)

| # | Código | Condição objetiva | Banda | Fonte |
|---|--------|-------------------|-------|-------|
| 1 | `C_HOMOG` | `homogeneizacao.aplicada === true` **OU** `homogeneizacao.semAjuste` documenta todos sem data | atenção se `aplicada===false` e há `dataVenda` utilizáveis; info se inerte opt-out | 9.11 |
| 2 | `C_AUTOREF` | `autoReferenciasExcluidas` é array (pode ser `[]`); se length>0, deve haver passaporte `rejeitado` | **blocking** se campo ausente | 9.8/9.22 |
| 3 | `C_HEADLINE_FAIXA` | `headline.mercado.min ≤ headline.referencia.valorMercado ≤ headline.mercado.max` e `min < max` (ou min==max com n=1 documentado) | **blocking** se ponto único sem faixa e n>1 | 9.10 / H-3 |
| 4 | `C_TRES_PRECOS` | Existem valor de mercado (headline), fechamento (`faixaFechamento` ou `valorFechamento`) e deságio de estado (`desagioTratado.valorMercadoPorCenario` com 3 chaves) | **blocking** se colapsar em um só preço | veredito §1 / 9.14 |
| 5 | `C_PASSAPORTES` | `passaportes.length ≥ totalComparaveis` e cada item tem `confianca ∈ {A,B,C,rejeitado}` | **blocking** se ausente | 9.15 |
| 6 | `C_EVIDENCIA_AB` | `evidencia.nA + evidencia.nB ≥ 1` quando `totalComparaveis ≥ 3`; mediana principal finita | atenção se pool A/B < 5 | 9.20 |
| 7 | `C_AVISOS_CANON` | `avisos[]` é array; cada item tem `codigo`, `severidade ∈ {info,atencao,critico}`, `mensagem` | **blocking** se shape inválido | 9.15 |
| 8 | `C_R5` | Se `propertyType`/R5 rodou: `r5.aplicado` booleano; se `false` e amostra mista casa/apto → deve haver aviso `TIPOLOGIA_MISTA` ou equivalente | atenção | 9.17 |
| 9 | `C_TESE` | `teseComercial.tese ∈ {acima,alinhado,abaixo,indefinida}` presente | atenção se indefinida com preço comercial informado | 9.18 |
| 10 | `C_SUBPREC` | Se `teseComercial.tese === 'abaixo'`, `subprecificacao.acaoRecomendada` NÃO recomenda corte (match `/não recomendo cortar|Subprecificado/i`) | **blocking** se recomenda corte em subprecificado | H-3 / 9.21 |
| 11 | `C_DESAGIO_PRIOR` | Se `desagioMedidoPercent != null`, aviso `desagio_fora_prior_sp` presente **somente** quando \|%\| ∉ [8,12]; número NÃO é ajustado ao prior | info (sanity) | 9.26 §10.10 |
| 12 | `C_GUARD_STREET` | Não existe aviso sentinela `same_street_missing_due_normalization` (causa raiz 9.22 eliminada) | **blocking** se reaparecer | 9.22 |
| 13 | `C_SAMPLE` | Se `top3.length < 3` OU `totalComparaveis < 5`, deve existir aviso `sample_size_low_top3` | **blocking** se amostra frágil sem aviso | 9.15 |
| 14 | `C_ROBUSTEZ_OPT` | Se model expõe `robustezTese` e `veredicto==='sensivel'`, aviso `reference_sensitive_to_single_comp` no model | atenção | 9.25 |
| 15 | `C_INDICE_OPT` | Se model expõe `triangulacaoBairro.incoerente===true`, aviso `bairro_incoerente` presente; índice **nunca** altera `medianaPrecoM2`/`headline` | **blocking** se headline mudou por índice | 9.27 |

## Tie-break conservador

1. Condição parcialmente satisfeita (campo existe mas incompleto) → banda mais severa entre as candidatas.
2. Campo exigido ausente (inclusive subcampo, ex. `homogeneizacao.aplicada`): classifique primeiro a **proveniência** do computation.
   - **Pipeline atual** — arquivo gerado no run corrente pela CLI `acm-validate`/`computeLaudo` (ex.: `ACM-computation.json` recém-escrito): campo ausente → banda da tabela (blocking onde a tabela diz blocking).
   - **Legado/arquivo** — computation histórico versionado em disco, gerado ANTES das stories (ex.: `LAUDO-*-v*.computation.json` de data anterior): campo ausente → **atenção**, nunca blocking — **inclusive** C_HEADLINE_FAIXA / C_TRES_PRECOS / C_PASSAPORTES. A exceção de blocking dessas três condições aplica-se APENAS a computation do pipeline atual (é isso que "story Done no pipeline atual" significa).
3. Empate PASS vs CONCERNS → CONCERNS.
4. Condição não aplicável (campo opcional não exposto ou gatilho não disparado) → **ok**, não conta como info. **Opcional** = somente condições com "Se model expõe" (C_ROBUSTEZ_OPT, C_INDICE_OPT) ou gatilho condicional explícito ("Se `teseComercial.tese === 'abaixo'`", "Se `propertyType`/R5 rodou", "Se `desagioMedidoPercent != null`"). `evidencia`, `avisos[]`, `passaportes`, `teseComercial`, `desagioTratado` NÃO são opcionais — ausentes seguem a regra 2 (legado → atenção; pipeline atual → banda da tabela). Bandas info existem só onde a tabela as declara: C_HOMOG inerte opt-out → info; C_DESAGIO_PRIOR com `desagioMedidoPercent != null` e sanity coerente → info; C_DESAGIO_PRIOR com `desagioMedidoPercent === null` → ok.
5. C_HOMOG — "há `dataVenda` utilizáveis" = existe ≥1 comparável/passaporte com `dataVenda` não-nula no computation. Sem nenhuma `dataVenda` → inerte opt-out (info). Em computation legado sem o subcampo `aplicada` → regra 2 (atenção).
6. Em legado, aviso esperado porém `avisos[]` inexistente no arquivo → a condição correspondente fica em **info** (não atenção) quando sua banda declarada já é info (ex.: C_DESAGIO_PRIOR — eixo E2 da 9.28).
7. C_SAMPLE quando `top3`/`totalComparaveis` não são expostos diretamente: derivar dos campos presentes — `top3.length` = `headline.referencia.n` e `totalComparaveis` = `headline.teto.n` (ou soma de `composicaoBairros[].n`). Se os derivados não indicam amostra frágil, gatilho não dispara → **ok**. Só tratar como campo ausente (regra 2) se nenhum derivado existir.

## Uso pelo @acm-auditor (9.29)

1. Carregar `*.computation.json`.
2. Avaliar C1–C15 em ordem; registrar evidência campo a campo.
3. Agregar veredito PASS/CONCERNS/FAIL.
4. **Proibido** sobrescrever veredito com julgamento LLM sem citação de condição.

## Histórico de ancoragem

| Versão | Data | Amplitude N=4 | Acurácia vs gabarito |
|--------|------|---------------|----------------------|
| v1 | 2026-07-10 | 0 (runs mecânicas) | 100% (Honduras bom + sintético defeituoso) |
| v1 LLM | 2026-07-11 | veredito 0 por alvo; score até 10 | **FALHOU** em G-BOM legado: stable-but-wrong (FAIL ×4 vs gabarito CONCERNS) — eixo E4 (leitura invertida da exceção do tie-break 2) |
| v1.1 LLM | 2026-07-11 | **veredito 0 em todos os alvos** (20 runs); score 0 em fresco/defeituoso, residual ≤5 só em legado-arquivo (eixo C_HOMOG documentado) | **100%** (PASS/CONCERNS/FAIL = gabaritos) — âncoras E4–E8; veredito automatizado ATIVADO na skill `/acm-validate` |

Ver medições em `docs/research/2026-07-10-acm-gate-variance/`.

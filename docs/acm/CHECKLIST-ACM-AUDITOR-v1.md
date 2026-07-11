# CHECKLIST-ACM-AUDITOR v1 (ancorado)

**Story:** 9.28 (N-5) · **Status:** Ancorado (amplitude 0 vs gabarito)  
**Data:** 2026-07-10 · **Playbook:** gate-determinism  
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
2. Campo ausente em computation legado (pré-story) → **atenção** (não blocking), exceto C_HEADLINE_FAIXA / C_TRES_PRECOS / C_PASSAPORTES quando a story correspondente já é Done no pipeline atual.
3. Empate PASS vs CONCERNS → CONCERNS.

## Uso pelo @acm-auditor (9.29)

1. Carregar `*.computation.json`.
2. Avaliar C1–C15 em ordem; registrar evidência campo a campo.
3. Agregar veredito PASS/CONCERNS/FAIL.
4. **Proibido** sobrescrever veredito com julgamento LLM sem citação de condição.

## Histórico de ancoragem

| Versão | Data | Amplitude N=4 | Acurácia vs gabarito |
|--------|------|---------------|----------------------|
| v1 | 2026-07-10 | 0 | 100% (Honduras bom + sintético defeituoso) |

Ver medições em `docs/research/2026-07-10-acm-gate-variance/`.

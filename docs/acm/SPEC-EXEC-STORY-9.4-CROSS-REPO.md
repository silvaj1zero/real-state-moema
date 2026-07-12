# Spec de execução — Story 9.4 (sink ITBI ampliado) · repo `acm-imobiliario`

**Data:** 2026-07-10 · **Origem:** `docs/stories/9.4.story.md` (contrato, Ready) + incidente tipologia 09-Jul + achado 9.23 (10-Jul)
**Executor:** sessão externa no repo `acm-imobiliario` (@data-engineer/@dev) — este documento é portátil: copie-o para lá como brief.

## Por que agora (3 razões acumuladas)

1. **R5 em escala (incidente tipologia):** ~50% da amostra do proxy eram apartamentos porque a ingestão descartou o campo **"Complemento"** da guia ("AP 82"). Distorção medida: caso 113 ref. 778.580 → 1.060.626 (+36%); caso 132 ref. 1.777.688 → 1.991.167.
2. **Lente de terreno:** a guia traz área de TERRENO real, fração ideal, testada — sem ingerir, a segunda lente de valor fica inerte em PROD.
3. **Homogeneização in-app (achado 9.23, 10-Jul):** a RPC não expõe `data_venda`/`bairro` ao client — TODOS os comparáveis in-app caem em `semAjuste` na deflação FipeZap. O app já está fiado (Story 9.23 Done); falta só o dado.

## Contrato de campos (o que ingerir por guia ITBI)

| Campo da guia | Coluna destino (sugestão) | Consumidor no app |
|---|---|---|
| Complemento (ex.: "AP 82") | `complemento` | R5 `classificarTipologia` (tipologia.ts) |
| Uso (IPTU) / descrição de uso | `uso_iptu` | R5 (casa×apto), Score |
| Descrição do padrão | `padrao_iptu` | C-2 (Ross) futuro — nota: em 42/46 amostras é rótulo de tipologia, não qualidade |
| Área de terreno | `area_terreno_m2` | lente de terreno, efeito-escala, aderência |
| Fração ideal | `fracao_ideal` | R5 (heurística condominial), fração de terreno |
| Testada | `testada_m` | fundamentação NBR futura |
| ACC (ano de construção) | `ano_construcao_iptu` | C-2 idade (Ross), régua |
| Data de pagamento da guia | `data_venda` (DATE, competência YYYY-MM) | **homogeneização FipeZap (9.11/9.23)** |
| CEP → bairro verificado | `bairro_real` | composição por bairro (9.11), índice C-3 |

## Requisitos de entrega

1. **Backfill** das guias já ingeridas (2023/2024/consolidado 28-01-2026 — fonte: capital.sp.gov.br "Guias de ITBI pagas") + ingestão contínua quando a SF publicar 2026.
2. **RPC:** ✅ **FEITO no repo real-state-moema (11-Jul)** — migrations `20260711000001` (colunas `complemento`/`uso_iptu`/`fracao_ideal`/`bairro_real` + `padrao_iptu`→TEXT) e `20260711000002` (RPC 32 colunas, incl. `data_venda := data_referencia`) **aplicadas em PROD**. O engine NÃO precisa mexer em RPC/DDL: só sink mapping + backfill. (Trap 42P13 já tratada.)
3. **Zero quebra:** campos ADITIVOS e anuláveis; consumidores atuais não mudam de comportamento sem os campos (design opt-in já implementado no app — 9.17/9.23).
4. **Validação de aceite (no app, pós-deploy):** (a) `computeLaudo` com `propertyType:'casa'` sobre PROD exclui verticais via guia (não heurística); (b) export sheet in-app mostra homogeneização com `ajustados > 0`; (c) regressão dos casos offline inalterada (datasets congelados).
5. **Referência de implementação:** `app/scripts/acm-andrade-pertence-132/09-lookup-guias.mjs` e `10-backfill-tipologia.mjs` (parse das guias já resolvido offline — portar para o pipeline do engine).

## O que este spec destrava (neste repo)

Story 9.1 (régua apto/casa) · R5 por construção em PROD (9.17 escala) · homogeneização in-app (9.23) · cobertura V.Olímpia/Brooklin (D-4) · eixo idade do C-2.

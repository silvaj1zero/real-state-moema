# Roadmap ACM — Mecanismo de Avaliação Comparativa de Mercado

**Atualizado:** 09-Jul-2026 · **Dono:** founder + Luciana Borba (RE/MAX Galeria, CRECI 045063-J)
**Documentos-mãe:** `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md` (auditoria + plano 4 frentes) · `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` (propósito e pilares)
**Análise de engenharia (09-Jul):** `docs/acm/ANALISE-ENGENHARIA-ACM-20260709.md` — eixos A compute · B PDF · C R5 · D skill; maturidade, riscos e recomendações
**Avaliação crítica do método (09-Jul):** `docs/acm/AVALIACAO-CRITICA-METODO-ACM-20260709.md` — epistemologia, vieses, stress-test 3 casos, tiers, backlog S/A/B/C★, placar NBR
**One-pager H-3 Luciana:** `docs/acm/ONEPAGER-H3-LUCIANA-ACM-20260709.md`
**Stories draft Classe S + Lite (09-Jul):** `9.14` deságio/ficha · `9.15` avisos[] · `9.16` pesos por tese · `9.17` R5 · `9.18` tese comercial · `9.19` ACM Lite modo dono
**Veredito ROI único (09-Jul, v3):** `docs/acm/VEREDITO-ROI-UNICO-20260709.md` — prioridade real 1–8 da análise de método + OS agêntico; passaporte; três preços; criativos (tribunal/radar/objeções/simulador)
**Stories wave evidência:** 9.14–9.21 (9.20 mediana A/B/C · 9.21 radar subprecificação)
**Caso âncora:** Rua Honduras 629 (proprietária Clarisia — captação pendente) · **Mercado-alvo:** Sul + Jardins, foco Moema / Vila Olímpia / Brooklin

---

## 1. Visão

O ACM operacionaliza a metodologia da Luciana na **captação**: convencer o
proprietário a assinar exclusividade pela tese do deságio, com âncora em ITBI
real. O roadmap persegue três qualidades, nesta ordem:

1. **Defensável** — nenhum número que não sobreviva a contraditório (guard-rails
   por construção, faixa em vez de ponto, rastreabilidade SQL/CEP/índice).
2. **Reprodutível** — qualquer endereço do mercado-alvo gera o mesmo pacote com
   um comando (generalização do pipeline Honduras).
3. **Autônomo** — o processo roda como skill/squad com QA gates determinísticos,
   com a consultora decidindo apenas o que é comercial.

## 2. Estado atual (o que já está de pé)

| Bloco | Estado |
|---|---|
| Epic 8 — geração de laudo/resumo/deck/didático PDF in-app | **Done** (React-PDF, fontes embutidas, regressão Honduras 185 testes) |
| Story 9.2 — planilha XLSX 7 abas | Done/CONCERNS |
| Story 9.8 — guard-rail anti-auto-referência (incidente Honduras 639) | **Done** — opt-in via `endereco`/`vagas`/`precoPretendido` no target |
| Story 9.9 — dedup haversine/aderência/loadEnv + cadeado anti-drift | **Done** |
| Story 9.10 — headline em FAIXA (referência = cenário aderente, teto = amplo) | **Done** — formato pendente de validação com a Luciana |
| Story 9.11 — homogeneização: deflação FipeZap + `bairroReal` (mecanismo) | **Done** |
| Story 9.12 — ingestão H-1: série FipeZap real + datas ITBI + CEPs dos 23 | **Done** (07-Jul) — homogeneização ativável no caso Honduras |
| Casos 2 e 3 — Andrade Pertence 113 e 132 (pré-P-1) | **Done v3** (09-Jul) — pipeline offline por caso (`app/scripts/acm-andrade-pertence*/`), laudos + XLSX Fase 1 em `docs/acm/andrade-pertence-*/`. **132 v3:** 2 edifícios (Cotovia 726, Pavão 700) excluídos por verificação visual Street View — ver §10 |
| **Regra R5 — tipologia casa×apto por guia oficial** | **Done** (09-Jul) — ver §3.1 abaixo (incidente tipologia). OBRIGATÓRIA em todo ACM que use a base em PROD |
| Base ITBI | Moema 3.618 registros em PROD, **100% NULL nos campos de metodologia** (Story 9.4 pendente) — e a ingestão **descartou o "Complemento" da guia** (causa-raiz do incidente tipologia) |
| CI | Quality Gates verdes desde 06-Jul (PR #1) |

## 3. Princípios de execução

### 3.1 Incidente tipologia (09-Jul-2026) — regra R5, NÃO-NEGOCIÁVEL

**O que aconteceu:** nos casos Andrade Pertence 113/132, o operador conferiu os
Top-aderentes no Google Maps e encontrou **prédios**. Causa-raiz: a ingestão de
`acm_comparaveis` descartou o campo **"Complemento" da guia** ("AP 82",
"AP 31 E 2VG") — cada apartamento vendido vira um "endereço de rua" com venda
única, e o proxy "venda única no endereço" não o distingue de casa. Medido:
**~50% das amostras eram apartamentos** (54/120 no caso 113; 46/115 no 132).
Distorção na referência: **−27%** (113) e **−11%** (132), com narrativa
comercial invertida no 132 (as "casas da própria rua a R$ 2,1–2,4M" eram APs).

**Regra R5 (obrigatória em qualquer ACM sobre a base em PROD):** tipologia
confirmada por crosscheck **SQL → guia oficial** ("Guias de ITBI pagas",
capital.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501; campos "Uso (IPTU)"
e "Descrição do padrão"). Só entra RESIDÊNCIA/horizontal. Vendas sem guia
pública (exercício corrente) entram por **heurística de lote declarada**
(unidade condominial tem lote ≥ ~0100 no SQL; casas conhecidas ≤ 0099) até a SF
publicar o arquivo — e são marcadas para conferência humana na planilha Fase 1.
Implementação de referência: `app/scripts/acm-andrade-pertence-132/10-backfill-tipologia.mjs`
(gera `tipologia-guias.json` por caso; o 04-build-dataset filtra e enriquece).

**Bônus estrutural:** a guia oficial traz **área de terreno real, fração ideal,
testada e ACC (ano de construção)** — para casas confirmadas (fração 1), a lente
de terreno (Sec. 8 do laudo) deixa de ser inerte. No caso 113 isso mudou a
conclusão: leitura direta de terreno (~R$ 1,33M) + cenário aderente (R$ 1,06M)
validaram o valor da proprietária (R$ 1,1M) que a amostra contaminada refutava.

**Consequências no backlog:** a Story 9.4 (sink/backfill ITBI) tem escopo
ampliado e prioridade elevada — ingerir `Complemento`, `Uso (IPTU)`, `Padrão`,
áreas de terreno/construída, fração ideal, testada e ACC (resolve casa×apto POR
CONSTRUÇÃO, sem crosscheck externo). Gap adicional descoberto: `normalizeStreet()`
do guard-rail 9.8 pressupõe endereço com vírgula e não reconhece "mesma rua" no
formato do banco ("R DR ANDRADE PERTENCE 110") — candidata a story própria.

- **Art. IV (No Invention):** dado que não existe (índice, data de venda, CEP)
  vira tarefa de ingestão com fonte — nunca constante inventada no código.
- **Guard-rail por construção > revisão manual:** o incidente 639 e o headline
  R$ 12,4M só não se repetem porque o código os torna impossíveis.
- **Opt-in e regressão travada:** todo mecanismo novo é inerte sem inputs novos;
  o caso Honduras é o gabarito congelado (185 testes).
- **Gate determinism:** todo veredito automatizado (futuro `@acm-auditor`) nasce
  com condições ancoradas e variância medida antes de virar gate.
- **Governança:** stories via SDC; push/PR exclusivos de `@devops` (Art. II).

---

## 4. Horizonte AGORA — destravar o caso Clarisia (≈ 1,5–2 dias)

> Objetivo: laudo Honduras v5 defensável nas mãos da Luciana.

| # | Item | Detalhe | Esforço | Depende de |
|---|---|---|---|---|
| **H-1** | **Ingestão de dados da homogeneização** — **Done 07-Jul (Story 9.12)** | (a) série FipeZap SP venda residencial 2024-01→2026-06 em `app/src/lib/acm/data/fipezapSpVendaResidencial.ts`; (b) `dataVenda` dos 23 via guias ITBI/PMSP (dados abertos SF — o material didático só tinha ano de CONSTRUÇÃO); (c) `bairroReal` via CEP (ViaCEP + CEP das guias): **16× Jd. Paulista, 5× Jd. América, 2× Jd. Europa** (o "16/6/2=24" do laudo incluía o alvo — que por CEP 01428-000 é Jd. Paulista) | 0,5–1d | — |
| **H-2** | **Laudo Honduras v5** — **Done 07-Jul (Story 9.13)** | Gerado offline (`npx -y tsx app/scripts/acm-honduras/06-build-laudo-v5.tsx`) com guard-rails ativos, homogeneização FipeZap (23/23, ref. 2026-06) e headline em faixa: mercado **R$ 10,92–12,96M** (referência = Top 3 aderente), mediana homogeneizada 19.061/m². Âncoras comerciais v4 (anúncio 11,5M; meta 10,0–10,5M) mantidas para a H-3. Artefatos em `docs/acm/honduras-629/LAUDO-ACM-Honduras-v5-*.pdf/.json`. UI in-app ainda não expõe homogeneização/guard-rails (fiação → P-1/H-4) | 0,5d | H-1 |
| **H-3** | **Validar formato com a Luciana** — **Done 10-Jul** | Decisões registradas em `DECISOES-H3-LUCIANA-20260710.md` e aplicadas no código (régua A–F, copy, formato "Mercado R$ X–Y (referência Z)") | reunião | H-2 |
| **H-4** | **Propagar faixa para resumo/deck/didático** — **Done 10-Jul** | `resumoModel` (conclusão), `deckModel` (nota da sensibilidade) e `didaticoModel` (Parte 2: construção + convergência) migrados de `valorMercado` ponto para `computation.headline` no formato H-3 "R$ X–Y (referência Z)". Capa do resumo/laudo/lite já vinha do H-3. Cobertura: 3 testes novos (271 PASS) | 0,5d | H-3 |

## 5. Horizonte PRÓXIMO — Sprint 2: generalização (≈ 4–6 dias)

> Objetivo: qualquer endereço do mercado-alvo gera o pacote de validação.

| # | Item | Detalhe | Esforço | Depende de |
|---|---|---|---|---|
| **P-1** | **CLI `acm-validate <endereço>`** | TARGET por parâmetro; comparáveis via RPC `fn_comparaveis_no_raio` com fallback a dataset declarado; saída `docs/acm/<slug>/`; gate Top-3 dinâmico; inclui refactors #4/#5 da auditoria (dataset canônico único, exceljs único) | 3,5–5d | — |
| **P-2** | **XLSX vivo com merge-back** | Preservar marcações do corretor (Confere?/Correção/Observação) a cada rebuild — cumpre a promessa do `WORKFLOW-revalidacao-web.md:64` | 1d | P-1 |
| **P-3** | **Story 9.4 — sink/backfill ITBI cross-repo** | Preenche os campos NULL de Moema e abre a ingestão de V. Olímpia/Brooklin (repo `acm-imobiliario`) | story própria | — |

## 6. Horizonte DEPOIS — produto in-app + automação

| # | Item | Detalhe | Depende de |
|---|---|---|---|
| **D-1** | Story 9.1 — régua apto/casa | Implementar com régua PROVISÓRIA do rascunho 17-Jun (decisão 3 do founder); validar com casos reais depois | P-3 |
| **D-2** | Story 9.5 — Fase B (re-verificação web) in-app | Lições da Fase 2 externa: navegador real, retry 403 (~60% de falsos negativos hoje), `confianca` graduada (alta/média/baixa), screenshots como evidência, portais de luxo, Wayback/GeoSampa. Fontes de CRUZAMENTO (nunca âncora — a âncora é ITBI/PMSP direto, Art. IV): agregadores de guias ITBI em mapa — Atlas (atlasdados.com/sp) e ITBImap (itbimap.com.br); ambos com anti-bot (403), exigem navegador real | P-1 |
| **D-3** | Skill `/acm-validate` + squad `acm-squad` | `@acm-data` (Sonnet) · `@acm-verifier` (Fable) · `@acm-auditor` (Fable/Opus, checklist da auditoria §3) · `@acm-writer` (Sonnet); QA gates com variância medida ANTES de ativar (playbook gate-determinism) | P-1, P-2 |
| **D-4** | Cobertura ITBI parametrizável por bairro | Pipeline por bairro, não fixado em Moema — pré-requisito de escala no mercado-alvo | P-3 |

## 7. Melhorias novas (planejamento Fable 07-Jul — além do plano original)

Achados da auditoria ainda sem dono, convertidos em itens acionáveis:

| # | Item | Racional | Proposta |
|---|---|---|---|
| **N-1** | **Gate de robustez da amostra (`avisos[]` no computation)** | Hoje `computeLaudo` aceita N=1, âncora de terreno com N=2 (§3.2) e amostra multi-bairro sem nenhum alerta — o risco fica invisível no PDF | Campo determinístico `avisos[]`: n<5 por cenário; faixa de terreno com n<3; bairros mistos sem segmentação; dispersão temporal >12 meses sem homogeneização. Custo baixo (funções puras + exibição), valor alto de defensabilidade |
| **N-2** | **Fontes dos parâmetros do residual** | VGV 34.000/m², obra 10.500/m², margem 20% não têm fonte citada (§3.2) — a co-âncora de terreno herda o risco | Elicit com a Luciana + campo `fonte` por parâmetro do `ResidualLandParams`, impresso na Sec. 8 |
| **N-3** | **Ajuste por idade/padrão construtivo** | Parte da Frente 1.3 não coberta pela 9.11 — imóveis 1960–2023 na mesma mediana | Decisão metodológica pendente: fator elicitado com a Luciana × Ross-Heidecke simplificado (NBR 14653-2). Não implementar antes da decisão (Art. IV) |
| **N-4** | **Confirmação graduada na Fase 2** | "Confirmado" hoje é booleano e mal definido (§3.2 — 3/10 confirmados, todos com ressalvas) | Antecipar o schema `confianca: alta/média/baixa + ressalvas[]` já no workflow externo, antes da 9.5 — evita migração de dados depois |
| **N-5** | **Variância dos gates ACM medida antes de automatizar** | Gates de julgamento não-ancorados oscilam até 40 pts (evidência framework 03-Jul) | **Done (9.28, 10-Jul):** checklist ancorado `docs/acm/CHECKLIST-ACM-AUDITOR-v1.md` + medições `docs/research/2026-07-10-acm-gate-variance/` (amplitude 0, acurácia 100% vs gabaritos). Desbloqueia 9.29. |

## 8. Decisões pendentes

| Decisão | Com quem | Bloqueia |
|---|---|---|
| Formato final do headline em faixa (labels, texto) | Luciana | H-3, H-4 |
| Ajuste por idade: fator elicitado × Ross-Heidecke | Luciana + founder | N-3 |
| Régua apto definitiva (provisória já autorizada) | Luciana (casos reais) | validação pós D-1 |
| Projeto Vercel duplicado "real-state-moema" (deploy cancelado) | founder | higiene de CI |
| Re-avaliação do waiver LGPD (memória `project_lgpd-mvp-waiver`) | founder | antes de prod/multi-user |

## 9. Sequência recomendada

```
H-1 → H-2 → H-3 (Luciana) → H-4        ← captação Clarisia destravada  [TODOS Done 10-Jul]
         ↘ P-1 → P-2 → D-3 (skill/squad)
P-3 (9.4) → D-1 (9.1) → D-4            ← escala Moema/V.Olímpia/Brooklin
N-1 (avisos) — encaixe curto a qualquer momento; N-4 antes de D-2
```

### 9b. Wave 4 — backlog pós-H-3 (planejado 2026-07-10)

Com H-1→H-4, P-1 e P-2 Done, **não há épico novo a abrir**: o Epic 9 segue como
guarda-chuva do ACM. Wave 4 = 2 stories novas a draftar (@sm `*draft` → @po
`*validate`) + 2 já Ready:

| Story | Escopo | Status | Bloqueio |
|---|---|---|---|
| **9.22** | Guard-rail 9.8: `normalizeStreet()` reconhece o formato do banco sem vírgula — R1/R3 ativos p/ comparáveis do DB; aviso-sentinela removido (causa raiz eliminada) | **Done** (SDC completo 10-Jul: dev Sonnet YOLO + QA PASS, `4797904`) | — |
| **9.23** | UI in-app: fiação v5 nos 5 export sheets — `buildComputeOptions()` compartilhado, `AcmAvisosPanel` (headline faixa H-3 + avisos + auto-refs pré-download), selects A–F/tipologia, toggle FipeZap default ON | **Done** (SDC completo 10-Jul: dev Opus + QA PASS, `b372e99`) | homogeneização in-app degrada p/ `semAjuste` até 9.4 (RPC sem `data_venda`/`bairro`) |
| **9.4** | Sink ITBI ampliado (Complemento, uso IPTU, terreno, fração ideal, ACC) — **prioridade subiu de novo**: agora destrava também a homogeneização in-app (9.23) | Ready | cross-repo `acm-imobiliario` |
| **9.1** | Régua apto/casa (provisória autorizada na H-3) | Ready | 9.4 |

**Wave 4 fechada em 10-Jul** com SDC ponta a ponta multi-modelo (draft/PO Fable →
dev Sonnet/Opus em paralelo → QA Opus independente): gate batch
`docs/qa/gates/epic9-wave4-batch-20260710.yml` PASS · 27 files / 301 tests ·
tsc 0 · eslint 0. Restante do épico: 9.4 (cross-repo) e 9.1 (depende da 9.4).

### 9c. Wave 5 — planejada 10-Jul (execução EXTERNA; PR #1 mergeado, base = master)

> **Nota de renumeração:** o veredito ROI v3 usava "9.22 simulador" e "9.23
> tribunal" para stories ainda não criadas; a Wave 4 ocupou esses números com
> arquivos reais (normalizeStreet / UI v5). Os itens do veredito foram
> renumerados: simulador = **9.24**, tribunal = **9.25**. Fonte permanece
> `VEREDITO-ROI-UNICO-20260709.md`.

| Story | Tema (fase do veredito) | Status | Routing | Bloqueio |
|---|---|---|---|---|
| **9.24** | Simulador de 3 estratégias de preço (F2 final) | **✅ Done (QA 11-Jul, gate Wave 5 PASS)** | Opus | — |
| **9.25** | Tribunal: robustez leave-one-out + testemunhas A/B/C (F2, só V2) | **✅ Done (QA 11-Jul, re-review PASS pós-fix didático)** | Opus | — |
| **9.26** | C-5 validação anúncio↔venda graduada (N-4, pré-D-2/9.5) | **✅ Done (QA 11-Jul, PASS — zero drift Honduras)** | Sonnet | — |
| **9.27** | C-3 índice de bairro = triangulação de coerência (nunca âncora) | **✅ Done (QA 11-Jul, re-review PASS pós-toggle test)** | Sonnet | — |
| **9.28** | N-5: variância do gate @acm-auditor (playbook gate-determinism) | **✅ Done (QA 11-Jul, CONCERNS aceito — gate de entrada N=4 LLM na 9.29)** | **Fable** | — |
| **9.29** | D-3: skill `/acm-validate` + agentes ACM | **✅ Done (QA PASS 7/7 11-Jul, PR #10 merged — gate N=4 LLM aprovado, checklist v1.1, veredito ativo; baluarte-400 ponta a ponta PASS 99)** | Fable | — |
| 9.4 | Sink ITBI ampliado — **spec portátil pronta**: `SPEC-EXEC-STORY-9.4-CROSS-REPO.md` | Ready | @data-engineer | repo `acm-imobiliario` |
| 9.1 | Régua apto/casa | Ready | Sonnet | 9.4 |

**Kickoff externo (1 story = 1 sessão, SDC fase 3):** `@dev *develop-story 9.2X`.
Paralelizáveis: 9.24 ∥ 9.25 ∥ (9.26 → 9.27 tocam laudoModel — sequenciar entre si
ou usar worktrees). 9.28 antes da 9.29 (gate duro). NÃO iniciar 9.5/D-2 antes da
9.26 (N-4) nem Ross/C-2 antes da decisão N-3 (Luciana+founder) — anti-lista.

**Fora de story (decisão pendente, NÃO draftar ainda):** C-2 Ross-Heidecke
(aguarda N-3: fator de idade elicitado com a Luciana — draftar inventaria a
curva, Art. IV); C-4 Índice de Atratividade Comercial (aguarda dados de
concorrência ativa da Fase B → depois da 9.26+9.5).

### 9d. Backlog operacional — Luciana / operador (anotado 10-Jul, decisões do founder)

| # | Item | Detalhe | Status |
|---|---|---|---|
| 1 | **Matrícula/IPTU do 132** | Confirmar área de TERRENO real (~220 m² provisório; 6 vagas sugerem lote maior) e área construída (196 m² fixada na v4). Ao chegar, regerar laudo (a lente de terreno sobe proporcionalmente) | Aguardando Luciana |
| 2 | **Estado do 132 na régua H-3** | **Manter E (−15%) por ora** — decisão do founder 10-Jul, coerente com a preferência H-3 de subavaliar; revisar na ficha A–F da vistoria. Laudo v4 vigente já usa o piso −15% como headline: NENHUMA regeração necessária até a vistoria | Decidido (provisório) |
| 3 | **Fase 1 das planilhas** | Preencher "Confere?" nas casas 2026 sem guia pública: 13 no 113, 12 no 132 (`ACM-*-validacao-corretor*.xlsx`). Depois: operador roda `merge-back-xlsx.tsx` | Backlog Luciana |
| 4 | **Fatores de liquidez do 113** | Elicitar com a consultora (emissão atual: fechamento = mercado; perfil reforma geral tende a Capex) | Backlog Luciana |
| 5 | **XLSX rev2 do 132 (modificada)** | Cópia preservada para conferência futura: `ACM-AndradePertence132-validacao-corretor-rev2-OLD-modificada-20260710.xlsx` (134KB→32KB, provável re-save do Excel; stash também mantido). rev3 é a canônica. Conferir antes de qualquer merge-back | Preservado |
| 6 | **Migrations 023/024** | Aplicadas em PROD 10-Jul e VALIDADAS via PostgREST (tabela 200 + `fn_owner_lookup_stats` OK). Conta de teste deletada, issue #2 fechado | ✅ Done |

D-3 (skill `/acm-validate` + agentes ACM): **✅ Done na 9.29 (QA PASS, PR #10 merged 11-Jul)** —
skill `.claude/skills/acm-validate/` + agentes `acm-operator`/`acm-auditor` (2, não 4 — KISS,
ver Dev Record da story). Gate de entrada N=4 LLM executado: baseline v1 reproduziu
stable-but-wrong (FAIL×4 vs gabarito CONCERNS no legado) → checklist ancorado a v1.1
(eixos E4–E8) → veredito amplitude 0 + acurácia 100% → **veredito automatizado ATIVADO**.
Prova ponta a ponta: caso novo `docs/acm/baluarte-400/` (n=68, auditor PASS 99, Lite emitido)
sem copiar pasta de scripts. Medições: `medicoes-llm-9.29.json` no research pack.

**Casos (fora de story, SOP-OPERACAO-ACM-POS-H3):** 113 v3 emitido 10-Jul com
C-1 declarado (paridade com o 132 v4 — assimetria fechada); pendências humanas:
terreno real do 132 (condicionante nº 1) e Fase 1 das planilhas de validação.

---

## 10. Adendo 09-Jul — frentes metodológicas (evolução do modelo) + protótipo bairro

**Origem:** sessão 09-Jul (caso 132). Incidente tipologia ESTENDIDO: além das 2 vendas
da própria rua, a **verificação visual (Google Street View, dez/2024)** achou 2 EDIFÍCIOS
que a heurística de lote classificara como casa — **Av. Cotovia 726** e **Av. Pavão 700**.
Excluídos → **laudo v3** (amostra 58→56; mediana homogeneizada 10.654→**11.072/m²**).
Correção **declarada por SQL** em `04-build-dataset.mjs` (override `VERIFICACAO_VISUAL`,
reproduzível, Art. IV). Grade de sensibilidade Top 5/10/20/56 (média×mediana, com/sem
deságio) em `11-grade-sensibilidade.tsx`. Protótipo de bairro em `12-mediana-bairro.mjs`.

### 10.1 Frentes novas (priorizadas por ROI)

| # | Item | Detalhe | Esforço | ROI |
|---|---|---|---|---|
| **C-1** | **Deságio TRATADO (substituir o −15% cego)** | O `CAPEX_BY_SCORE.B=0.15` é "fator-cego" (auditoria §3.1); parece o campo de arbítrio ±15% da NBR, mas aplicado como desconto OCULTO. É o **maior mover de valor** (swing ~R$350k / ~17% no 132) e o mais barato. **Nível 1:** cenário 0/−7,5/−15% na sensibilidade + elicit estado do alvo. **Nível 2:** fator de estado/padrão (casa com C-2). **Nível 3:** regressão NBR. **IMPLEMENTADO no laudo v3 (Nível 1)** — sensibilidade declarada conservador/provável/agressivo, ver §10.6. **Uso por contexto:** captação=faixa; ACM técnica=fator declarado; laudo formal=R-H/regressão; estratégia comercial=deságio de negociação (separado do valor técnico). | baixo (N1) | **ALTO** |
| **C-2** | **Idade/padrão/depreciação Ross-Heidecke** (enriquece N-3) | Três eixos com maturidade DIFERENTE de dado — ver **§10.5**. Resumo: **idade** (`anoConstrucaoIptu`) usável AGORA; **padrão** (`padraoIptu`) é só rótulo de tipologia, NÃO grau de qualidade → gap de dado (Story 9.4); **conservação** é inobservável via registro → entra pela inspeção do ALVO (= o próprio deságio C-1). Falta ainda: idade/estado do **ALVO** (condicionante nº 1) + curva calibrada (decisão Luciana: R-H cheio × NBR-lite). **Parâmetro de calibração:** vida útil referencial **IBAPE-SP 60–80 anos** para casa urbana (curva de Ross). | médio | médio |
| **C-3** | **Índice de bairro do próprio ITBI** — **PROTÓTIPO FEITO** | `12-mediana-bairro.mjs`. Ver §10.2. Recomendação: índice próprio por **bairro×tipologia** como nível/triangulação; FipeZap só p/ movimento temporal; portais/FipeZap-bairro secundários. **Papel = índice de COERÊNCIA (sanity-check), NÃO substituto dos comparáveis** — o valor final vem dos comparáveis próximos/semelhantes; o índice detecta se o resultado está dentro/fora de uma banda aceitável e sinaliza revisão. | médio | médio-alto |
| **C-4** | **Camada estratégica de concorrência/visibilidade** (anúncios ativos) — **NÃO é dado de avaliação** | Decisão founder 09-Jul: anúncios concorrentes entram como **análise estratégica** (visibilidade do imóvel, chance de atração de interessados), pois outras ofertas são **concorrentes INDIRETOS** — nunca âncora de valor (âncora = 100% ITBI fechamento, Art. IV). Popula `ofertasAtivas`/`concorrentesDiretos`/`referenciasSuperiores` como seção comercial (nº competindo, preço pedido, tempo de exposição, posicionamento), **separada da estatística**. **Nome operacional: "Índice de Atratividade Comercial"** — responde: nº de substitutos disponíveis, posição no ranking de oferta (barato/alinhado/caro), há imóveis melhores pelo mesmo preço?, tempo médio de exposição dos concorrentes, risco de ficar parado. | médio | alto (comercial) |
| **C-5** | **Validação anúncio↔venda robusta** (cross-ref N-4/D-2) | No 132 a Fase 2 não rodou; `precoPedido` null → `desagioMedido` null; comparáveis 100% ITBI "off-market/não-recuperável" (= anúncio não religado, **NÃO** venda privada). Robustecer: confiança graduada, retry 403, portais de luxo, chave de casamento; persistir `precoPedido` → destrava **fator de oferta empírico**. **Parâmetro de referência (prior):** desconto oferta→transação típico em SP **8–12%** (fator-fonte NBR admitido no MCDDM) — usar como prior declarado até medir o empírico próprio; nunca como injeção de anúncio na mediana (ver §10.6, "Ponto rejeitado"). | médio | médio |
| **C-6** | **Mediana PONDERADA por score de aderência (A/B/C)** | Hoje pegamos mediana SIMPLES do Top-N; já existe `rankByAdherence`. Evoluir p/ mediana **ponderada pela qualidade da evidência**: A=peso cheio, B=reduzido, C=referência lateral/excluído. Sobe o **grau de fundamentação** com máquina que já temos. **Ressalva:** ponderar só por eixos OBSERVÁVEIS (raio, tipologia, área, idade, data) — conservação por comparável não existe (§10.4). | baixo-médio | médio-alto |

### 10.2 Protótipo índice de bairro (`12-mediana-bairro.mjs`, 09-Jul)

Raio 1500 m do alvo 132, **1000 ITBI** válidas (RPC cap), todas tipologias, defl. FipeZap 2026-06:

| Bairro | n | Mediana R$/m² (defl.) |
|---|---|---|
| Vila Nova Conceição | 120 | 10.090 |
| Vila Olímpia | 450 | 9.335 |
| Moema | 354 | 8.373 |
| **Global** | 1000 | **9.074** |

**Achados:**
1. **Banda de ~20% entre bairros vizinhos** (V.N.Conceição 10.090 ↔ Moema 8.373) em 1,5 km → o índice de cidade ("SP Total") é grosseiro para **nível**.
2. **Tipologia pesa MAIS que bairro no nível:** casas (laudo v3) trocam muito acima do bairro misto — Moema casas **10.632** vs bairro misto 8.373 (**+27%**); V.Olímpia casas **15.688** vs 9.335 (**+68%**). Um índice de bairro MISTO subavaliaria uma casa → **valida a R5**.
3. **Teste temporal:** Moema apreciou **+3,0%** (2024→2026) vs FipeZap SP **+8,7%** → o índice de cidade **superestima** o movimento de Moema (deflaciona demais vendas antigas). Efeito pequeno na amostra recente, mas direção clara.

### 10.3 Nota de custo-benefício — modelo NBR completo × deságio bem calibrado (realista)

Ranqueado por impacto no **valor** (caso 132, base ~R$2,2M):

| Alavanca | Swing no valor | Esforço | Natureza do ganho |
|---|---|---|---|
| Deságio 0 vs −15% (C-1) | ~R$350k (~17%) | baixo | **valor + defensabilidade** |
| Tipologia R5 (feito) | −11% documentado | feito | correção |
| Índice bairro vs cidade (C-3) | ~5pp em 2 anos (~R$80k), em vendas antigas | médio | triangulação |
| R-H / regressão NBR completa (C-2) | poucos % na mediana central (amostra já homogênea por R5) | alto | **grau de fundamentação NBR** |

**Veredito (redação defensável — cuidado de governança da revisão externa 09-Jul):**
NÃO afirmar "modelo simples substitui a NBR". A formulação correta para material técnico é:

> *Para uso comercial de captação, um modelo por fatores bem documentado — com amostra
> saneada (R5), homogeneização temporal e faixa de sensibilidade — tende a ser suficiente.
> Para contestação formal, financiamento, disputa judicial ou laudo de maior rigor,
> recomenda-se aprofundar Ross-Heidecke, inferência estatística e o enquadramento explícito
> nos Graus de Fundamentação e Precisão da NBR 14653-2.*

O racional técnico por trás disso: para uma amostra **já homogeneizada por tipologia (R5)**, os
comparáveis ITBI convergem para o valor provável sem exigir R-H — o R-H importa quando a
amostra é heterogênea em idade/estado, o que aqui foi **parcialmente resolvido pelo próprio R5**.
O swing residual do R-H é pequeno porque os remanescentes já são tipologicamente similares ao
alvo; o ganho dele é **grau de fundamentação, não outro número**. Portanto priorizar
**C-1 + N-1 (avisos) + C-3** (barato, já prototipado); R-H/regressão completa fica para o tier
"ACM Técnica" (§10.6), quando o caso exigir.

**Quantificação para reunião (revisão externa 09-Jul):** o modelo atual com **C-1 (deságio tratado)
+ C-3 (índice bairro)** chega a **~85–90% do número** de um modelo NBR Grau III. Os **10–15%
restantes são defensabilidade formal — rastreabilidade e aderência técnica —, NÃO precisão
numérica adicional**. Esse é o argumento a apresentar à Luciana ao priorizar o roadmap: aprofundar
para Grau III agrega blindagem para contestação/juízo, não um valor central diferente.

### 10.4 Refinamento do C-2 — os três eixos de homogeneização física (09-Jul)

A homogeneização temporal (FipeZap) corrige **quando** a venda ocorreu. Mas o comparável difere
do alvo em três eixos físicos, com **maturidade de dado muito diferente** — não tratar como bloco único.

| Eixo | O que corrige | Dado que temos | Veredito |
|---|---|---|---|
| **Idade** | desgaste esperado pelo tempo de construção | ✅ `anoConstrucaoIptu` **real** (46 casas: 1955–2021, **concentradas 1960–79, mediana ~1970**) | **Usável AGORA** — depreciação por idade (curva de Ross); homogeneizar cada venda p/ a idade do alvo; detectar viés idade amostra×alvo |
| **Padrão construtivo** | qualidade original (acabamento/classe) | ⚠️ `padraoIptu` = **"RESIDENCIAL HORIZONTAL" em 42/46** (+4 vazio) — é **rótulo de TIPOLOGIA, não grau de qualidade** | **NÃO dá fator de padrão sozinho.** O grau fino (baixo/médio/alto/luxo) está em OUTRO campo do cadastro IPTU, não ingerido → **gap de dado (escopo Story 9.4)** |
| **Conservação** | manutenção atual (reformado × deteriorado) | ❌ **nenhum** — IPTU não revistoria; casa 1970 reformada e degradada têm o mesmo cadastro | **Inobservável via registro** (para qualquer comparável). É a metade "Heidecke" do Ross-Heidecke. Entra **só pelo ALVO**, via inspeção da Luciana = o próprio **deságio C-1** |

**A lógica que dispensa saber a conservação de cada comparável:** numa amostra homogênea por
tipologia (R5) e com n razoável, as conservações idiossincráticas se cancelam em torno do meio —
a **mediana** representa o R$/m² de uma casa em **conservação TÍPICA** da microrregião. Não é
preciso medir cada uma; basta caracterizar a condição do **ALVO relativa a esse típico**. Essa
nós conhecemos. Logo o único ajuste necessário é o **delta de condição do alvo** = deságio (C-1).

**Implicação p/ o 132:** o comparável típico é uma casa de ~50 anos em conservação média; o 132
é *conservado, pronto para morar* → está **igual ou acima** do típico → por caminho independente,
confirma que o **−15% subavalia** e o cenário correto é **0 a −7,5%** (ref. ~R$ 2,17–2,34M).

**Consequência no backlog:** Story 9.4 ganha mais um campo-alvo de ingestão — o **padrão de
construção real** do cadastro IPTU (não só o "Uso"/"Descrição" que traz "residencial horizontal").
Sem ele, C-2 fica só com o eixo idade (Ross), sem o fator de padrão.

**Achado 09-Jul (v4 do 132) — terreno é LENTE, não peso de ranking:** ao informar o terreno do alvo
(~220 m²), a tentação é ativar a similaridade de terreno (20% do `adherenceIndex`). NÃO fazer para imóvel
cujo valor está no CONSTRUÍDO: a similaridade de terreno puxa para o Top-N casas terreno-similares porém
**baratas em construção** (ITBI subdeclarado / preço de terra — ex.: José Cândido de Souza 74/77 a ~5.000/m²c),
**contaminando a mediana de construção** e colapsando a referência (no 132: R$ 1,99M → R$ 1,27M, artefato que
inverte a tese). Tratamento correto: **duas lentes independentes** — construção rankeia por construção+proximidade
(`target.areaTerreno=0` no ranking); terreno entra como leitura separada (`R$/m² terreno × área`) que CONVERGE.
Regra: só acoplar terreno ao ranking quando a tese for de TERRENO (teardown/investidor, como no 113), não de construção.

### 10.5 Sequência sugerida do adendo

```
C-1 (N1: cenário de deságio) → C-3 (índice bairro×tipologia) → N-1 (avisos)   ← barato, alto valor
C-4 (camada concorrência)  — encaixe comercial, independente da estatística
C-6 (mediana ponderada) — encaixe curto, usa rankByAdherence existente
C-2 (Ross por idade já dá; padrão depende da 9.4; conservação = inspeção do alvo) + C-5 → decisão Luciana / uso formal
```

### 10.6 Consolidação 09-Jul — revisões externas (arquitetura de produto)

Duas revisões externas independentes convergiram com o plano e adicionaram framing de produto:

**Split de topo (decisão metodológica — refinado pela revisão externa 09-Jul p/ TRÊS camadas):**
a ACM separa explicitamente três coisas que antes podiam se misturar —
1. **Valor técnico provável** — ITBI + R5 + homogeneização + fatores (o laudo). É a âncora.
2. **Sensibilidade comercial (estado de conservação)** — a faixa de deságio 0 / −7,5 / −15% do C-1.
   É um intervalo declarado SOBRE o valor técnico (campo de arbítrio NBR), não outra base de dados.
3. **Estratégia de exposição do imóvel** — anúncios ativos, concorrência indireta, preço pedido,
   visibilidade, liquidez (o "Índice de Atratividade Comercial", C-4). É camada comercial, não avaliativa.
Nunca colapsar as três na mesma mediana: (1) é evidência transacional, (2) é arbítrio sobre o alvo,
(3) é inteligência de mercado. Cada uma responde a uma pergunta diferente.

**Três tiers de entrega** (evita esforço técnico pesado em toda captação):

| Tier | Uso | Conteúdo |
|---|---|---|
| **ACM Lite** | captação rápida | ITBI + R5 + mediana + faixa de deságio (C-1 N1) |
| **ACM Pro** | apresentação ao cliente | + fatores declarados + bairro×tipologia (C-3) + concorrência estratégica (C-4) |
| **ACM Técnica** | contestação / laudo forte | + Ross-Heidecke + inferência/regressão (C-2 N3) + validação anúncio↔venda (C-5) |

**Ficha objetiva do imóvel-alvo (intake — destrava a condicionante nº 1):** ano de construção
(IPTU/matrícula), reformas relevantes (vistoria/corretor/fotos), estado de conservação (A/B/C/D),
padrão construtivo (IPTU + validação visual), vagas/terreno/testada (matrícula/IPTU), liquidez
percebida (anúncios). Sem essa ficha o modelo fica cego no item mais importante (condição do alvo = deságio C-1).

**Ponto rejeitado (registro):** trazer anúncios ativos PARA DENTRO da amostra com fator-fonte
para aumentar N (sugestão de uma das revisões) — **NÃO adotado**: nosso N de ITBI é abundante
(848 no raio), é preço transacionado (evidência superior a preço pedido), e misturar foi a crítica
central da auditoria ao laudo externo. O fator-fonte/deságio entra medido via C-5 (anúncio↔venda),
não injetando oferta na mediana.

**Régua de maturidade (comunicação):** 0 mediana simples · 1 +temporal · 2 +fatores declarados ·
3 +score de comparabilidade · 4 +regressão/validação anúncio↔venda · 5 híbrido com histórico/liquidez.
Hoje estamos saindo do **nível 1** rumo ao **2–3** (C-1 feito, C-3 prototipado, C-6 desenhado).

### 10.7 Referências normativas (blindagem do material técnico)

Fontes que fundamentam o enquadramento (citadas na revisão externa 09-Jul):

- **NBR 14653-2** — método comparativo direto de dados de mercado (MCDDM): admite tratamento por
  **fatores** OU **inferência estatística**, desde que os dados sejam adequadamente homogeneizados;
  prevê **campo de arbítrio** em torno da estimativa para variável relevante não contemplada, **desde
  que fundamentado** (não como desconto oculto automático) — base do C-1.
- **Manual de Avaliação de Imóveis da União (2024, gov.br)** — referência de boas práticas do MCDDM.
  `gov.br/gestao → patrimonio-da-uniao/avaliacao-de-imoveis-da-uniao/manual-de-avaliacao-de-imoveis-2024`.
- **IBAPE Nacional / IBAPE-SP** — inferência estatística aplicada a imóveis urbanos e vida útil
  referencial (**60–80 anos** casa urbana, curva de Ross — parâmetro do C-2). `biblioteca.ibape-nacional.com.br`.
- **ITBI/DTI — Prefeitura de São Paulo (via CNB/SP)** — base de transações registradas (preço de
  fechamento): evidência transacional superior a preço pedido, mas exige saneamento por tipologia,
  localização, data, área e inconsistências cadastrais (é exatamente o que a R5 faz). `cnbsp.org.br`.

> Redação recomendada: posicionar a ACM como **modelo operacional compatível com boas práticas NBR**,
> com caminho de aprofundamento (tier ACM Técnica) — nunca como "substituta da NBR".

### 10.8 Fundamentos NBR 14653-2 — Graus de Fundamentação e Precisão (referência)

*Consolidado das revisões externas 09-Jul. É o "placar" contra o qual medimos o modelo.*

**Grau de Fundamentação** — pontua 5 itens (1–3 pts cada, máx. 15):

| Item | O que mede | Para Grau III |
|---|---|---|
| 1 — Caracterização do alvo | atributos coletados (área, padrão, idade, conservação) | pontuação ≥ 2 em todos os itens |
| 2 — Quantidade de amostras | nº de comparáveis tratados | **≥ 5 amostras** |
| 3 — Identificação dos dados | fonte, contato, fotos, preço, atributos completos | amostras totalmente documentadas |
| 4 — Fatores de homogeneização | fatores dentro do intervalo NBR (**0,5 a 2,0**) | todos no intervalo |
| 5 — Apresentação do laudo | estrutura, anexos, conclusão | laudo completo com ART/RRT |

**Grau III exige soma ≥ 12 e nenhum item = 1.** Onde nosso modelo atual ("homogeneização mínima" +
só fator temporal) **perde pontos:** Item 1 (caracterização incompleta do alvo — condicionante nº 1,
idade/estado) e Item 4 (um único fator). São exatamente os itens que **C-1 e C-2 atacam**.

**Grau de Precisão** (independente do de Fundamentação) — amplitude do IC 80% em torno do valor central:

| Grau | Amplitude ≤ |
|---|---|
| III | **15%** |
| II | 30% |
| I | 50% |

**Coincidência crítica:** o **campo de arbítrio ±15%** da NBR e o **limiar de amplitude do Grau III (15%)**
são o mesmo número → um −15% fixo consome sozinho toda a margem de precisão do grau mais alto. Só é
tolerável para Grau III **se declarado e justificado** — nunca como desconto oculto. É o cerne do C-1.

### 10.9 Ross-Heidecke — mecânica completa (spec de implementação do C-2)

Depreciação da CONSTRUÇÃO como função de dois eixos (terreno não deprecia, entra separado):

- **Ross (idade):** `α = 0,5 × (Ie/Ir + (Ie/Ir)²)`, onde `Ie` = idade efetiva, `Ir` = vida útil
  referencial da tipologia (casa urbana: **60–80 anos**, IBAPE-SP).
- **Heidecke (estado) + final:** `Kd = α + C × (1 − α)`. Valor depreciado = Custo Reedificação × (1 − Kd).

**Escala Heidecke (não-linear — é o ponto-chave):**

| Estado | Descrição | C |
|---|---|---|
| 1 — Novo | recém-construído / integralmente reformado | 0,00% |
| 1,5 | entre novo e regular | 0,32% |
| 2 — Regular | uso normal, conservação adequada | 2,52% |
| 2,5 | manutenção leve pendente | 8,09% |
| 3 — Reparos simples | manutenção em atraso | 18,10% |
| 3,5 | deterioração visível | 33,20% |
| 4 — Reparos importantes | comprometimento estrutural | 52,60% |
| 4,5 | recuperação onerosa | 75,20% |
| 5 — Sem valor | demolição | 100,00% |

**Exemplo (calibra a intuição):** casa 20 anos, `Ir`=60, estado Regular (C=0,0252):
`x = 20/60 = 0,333` · `α = 0,5×(0,333+0,111) = 22,2%` · `Kd = 0,222 + 0,0252×0,778 = 24,2%`.
A mesma casa em estado 3 (C=0,181): `Kd = 36,3%`. **12pp separam "conservado" de "reparos simples"** —
o −15% fixo trata os dois igual (é o erro que o C-2 corrige).

**Uso correto no MCDDM — homogeneização BILATERAL (não só o alvo):**
1. calcula `Kd_alvo` (idade + estado que a Luciana confirmar);
2. calcula `Kd` de **cada comparável** (`anoConstrucaoIptu` + `padraoIptu` — dado que já temos, para casas);
3. aplica `fator = (1 − Kd_alvo) / (1 − Kd_comparável)` sobre o R$/m² de cada comparável;
4. só então tira a mediana dos preços homogeneizados.
Assim uma casa de 1975 e uma de 2015 entram na mesma "base de estado". **Ressalva §10.4:** conservação
por comparável é inobservável via registro — na prática o eixo idade (Ross) é o robusto; o eixo estado
(Heidecke) entra confiável só pelo ALVO (= o próprio deságio C-1).

### 10.10 Especificações concretas por frente (para não reinventar na implementação)

**C-1 Nível 2 — régua declarada de estado/padrão** (substitui o −15% cego quando houver ficha do alvo):

| Estado do alvo vs. amostra | Ajuste |
|---|---|
| Reformado / muito conservado | 0% a −3% |
| Conservado / uso normal | −3% a −6% |
| Necessita modernização leve | −6% a −10% |
| Necessita reforma relevante | −10% a −15% |
| Reforma pesada / obsolescência | fora da régua simples → vistoria/CAPEX estimado |

Para o 132 (conservado): cai na 1ª–2ª faixa (0 a −6%), **confirma que −15% é piso pessimista**.

**C-5 — três pistas + deságio empírico:**
- Pista 1 — fechamentos ITBI = âncora de valor provável.
- Pista 2 — anúncios ativos = liquidez, concorrência, teto (camada C-4, não avaliação).
- Pista 3 — anúncios recuperados de imóveis **já vendidos** = a fonte do deságio real:
  `deságio real = 1 − (preço fechado / preço pedido)`. Religar anúncio histórico ↔ transação ITBI
  (por endereço/data) substitui o prior 8–12% por número próprio da microrregião.

**C-6 — score de comparabilidade A/B/C** (pondera a mediana pela qualidade da evidência; só eixos observáveis):

| Critério | Peso |
|---|---|
| Micro-região / raio adequado | 25% |
| Mesma tipologia | 15% |
| Área próxima | 15% |
| Padrão construtivo semelhante | 15% |
| Idade semelhante | 15% |
| Vagas/terreno/testada/uso | 10% |
| Data da transação | 5% |

A = muito semelhante (peso cheio) · B = semelhante c/ ajuste (peso reduzido) · C = fraco (referência lateral/excluído).

### 10.11 Sequência com GATILHO (transforma a condicionante nº 1 em decisão com data)

```
Sprint atual (não bloqueia nada, maior swing):
  C-1 N1 (cenários deságio 0/−7,5/−15%)     ← baixo esforço
  C-3 (índice bairro×tipologia, triangulação)

GATILHO — Luciana confirma idade + estado de conservação do 132:
  → C-2 R-H (fator depreciação bilateral)
  → C-5 (validação precoPedido + fator de oferta empírico)

Encaixe independente (camada comercial):
  C-4 (Índice de Atratividade Comercial)

Reserva (só se contradita formal / laudo Grau III):
  C-2 N3 (regressão/inferência NBR)
```

O ponto de governança: a idade/estado do alvo deixa de ser "pendência aberta" e vira **decisão com data**
com a Luciana — sem isso o C-2 fica eternamente em espera.

### 10.12 Fatores de Ajuste de Liquidez e Condição — mecanismo IMPLEMENTADO (opção por ACM)

Materializa a **camada 3** do split (§10.6, "estratégia de exposição / deságio de negociação"): sobre o
**valor de mercado** (técnico) aplica-se uma calibração comercial que reflete liquidez efetiva e condição
para conversão em oferta firme → **valor de fechamento estratégico** (Laudo Sec. 2). **Nunca mistura com a
mediana técnica** — o valor de mercado das seções 1 e 9 não é afetado.

- **Fórmula (composição multiplicativa):** `valorFechamento = valorMercado × Π(1 − ajuste_i)`.
  Ex. Honduras: −7/−5/−3/−4% → ×0,93×0,95×0,97×0,96 = −17,7%.
- **Infra compartilhada (já existia):** `methodology.ts::liquidityAdjustment()`, `laudoModel.ts`
  (`LaudoFatorLiquidez` = {fator, calibracao, ajuste}, campo `fatoresLiquidezDetalhe`, `FATORES_LIQUIDEZ_DEFAULT`),
  render na Sec. 2 do `LaudoDocument`.
- **Opção por ACM:** cada caso declara a const `FATORES_LIQUIDEZ` no seu `05-build-laudo.tsx`
  (`[]` = fechamento = mercado). São **INPUTS da consultora POR IMÓVEL** (elicitação H-3) — nunca
  reusar de outro imóvel nem hardcodar (Art. IV).

**Estado (09-Jul):**

| Caso | Fatores | Fechamento | Racional |
|---|---|---|---|
| Honduras | −7/−5/−3/−4% | −17,7% | inputs da consultora (v4/v5) |
| **132** | −7/−5/−4% (ilustrativo, a validar) | R$ 1,69–1,98M | conservado → **sem Capex de modernização**; piso ainda ~13% ACIMA do anúncio (reforça subprecificação) |
| **113** | `[]` (vazio) | = mercado | mecanismo portado, **critérios não observados**; perfil de reforma geral → Capex tende a aplicar quando elicitado |

**Regra de composição com o C-1:** o deságio de conservação (C-1, campo de arbítrio NBR sobre o valor
técnico) e os fatores de liquidez (camada comercial de negociação) são **camadas distintas** — não
somar/duplicar o mesmo efeito. Um imóvel conservado tem C-1 ≈ 0 mas ainda pode ter fatores de liquidez
(tempo de exposição, regularização) > 0. Documentar qual efeito entra em qual camada evita dupla contagem.

---

*Roadmap vivo — atualizar a cada story fechada. Alterações de escopo/AC via @po (SDC).*

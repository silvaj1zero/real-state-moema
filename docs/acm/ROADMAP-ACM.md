# Roadmap ACM — Mecanismo de Avaliação Comparativa de Mercado

**Atualizado:** 07-Jul-2026 · **Dono:** founder + Luciana Borba (RE/MAX Galeria, CRECI 045063-J)
**Documentos-mãe:** `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md` (auditoria + plano 4 frentes) · `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` (propósito e pilares)
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
| Base ITBI | Moema 3.618 registros em PROD, **100% NULL nos campos de metodologia** (Story 9.4 pendente) |
| CI | Quality Gates verdes desde 06-Jul (PR #1) |

## 3. Princípios de execução

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
| **H-3** | **Validar formato com a Luciana** | Faixa + referência aderente (Story 9.10) e composição por bairro (9.11) — ajustar labels/textos conforme feedback | reunião | H-2 |
| **H-4** | **Propagar faixa para resumo/deck/didático** | `resumoModel`/`deckModel`/`didaticoModel` ainda reportam `valorMercado` ponto — migrar para `computation.headline` | 0,5d | H-3 |

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
| **D-2** | Story 9.5 — Fase B (re-verificação web) in-app | Lições da Fase 2 externa: navegador real, retry 403 (~60% de falsos negativos hoje), `confianca` graduada (alta/média/baixa), screenshots como evidência, portais de luxo, Wayback/GeoSampa | P-1 |
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
| **N-5** | **Variância dos gates ACM medida antes de automatizar** | Gates de julgamento não-ancorados oscilam até 40 pts (evidência framework 03-Jul) | Quando o checklist do `@acm-auditor` nascer (D-3), rodar o playbook: medir N=4, ancorar condições→banda, re-medir amplitude→0, validar contra gabarito congelado (caso Honduras) |

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
H-1 → H-2 → H-3 (Luciana) → H-4        ← captação Clarisia destravada
         ↘ P-1 → P-2 → D-3 (skill/squad)
P-3 (9.4) → D-1 (9.1) → D-4            ← escala Moema/V.Olímpia/Brooklin
N-1 (avisos) — encaixe curto a qualquer momento; N-4 antes de D-2
```

---

*Roadmap vivo — atualizar a cada story fechada. Alterações de escopo/AC via @po (SDC).*

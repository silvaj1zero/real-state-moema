# Análise de Engenharia ACM — Metodologia, PDF, Skill e Incidentes

**Data:** 2026-07-09  
**Status:** Documento de análise (não altera código de produção)  
**Escopo:** motor `methodology.ts`, camada PDF/XLSX, caminho até `/acm-validate`, incidente R5  
**Casos de evidência:** Honduras 629 · Andrade Pertence 113 · Andrade Pertence 132  
**Documentos-mãe:** `ROADMAP-ACM.md` · `AUDITORIA-EVOLUCAO-ACM-20260703.md` · `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` · `docs/prd/EPIC-9-ACM-PARIDADE-PREMIUM.md` · `HANDOFF-20260709-andrade-pertence.md`  
**Complemento metodológico:** `docs/acm/AVALIACAO-CRITICA-METODO-ACM-20260709.md` (crítica do *método*, não só da engenharia)

---

## 0. Sumário executivo

O ACM do Real-State Moema é um **motor determinístico de avaliação comparativa** (ITBI → mediana → Score → liquidez → aderência → faixa → residual), com **regressão numérica** no caso Honduras e **fábrica nativa** de PDF/XLSX. A engenharia separa com clareza:

| Camada | Responsabilidade | Maturidade |
|--------|------------------|------------|
| **A — Compute** | `computeLaudo` puro | Alta (suite Vitest + fixture) |
| **B — Render** | `buildLaudoModel` → React-PDF / XLSX | Alta no laudo; polish residual |
| **C — Amostra / tipologia** | R5 + guard-rails 9.8 | Alta em scripts de caso; **baixa na base PROD** |
| **D — Autonomia agentica** | CLI + skill + squad | Especificada; **não implementada** |

**Veredito:** o produto já entrega laudos defensáveis *quando a amostra é limpa e o pipeline offline é operado*. O gargalo não é a fórmula — é **generalização (P-1)**, **riqueza de dado ITBI (9.4)** e **gates de tipologia/qualidade da amostra (R5 industrializado)**.

**Sequência de valor (alinhada ao roadmap):**

```
H-3 (Luciana) → P-1 (CLI) + 9.4 (sink) → R5 no CLI → P-2 (XLSX vivo) → D-3 (skill/squad)
N-1 (avisos[]) pode encaixar a qualquer momento
```

---

## 1. Propósito e princípios

### 1.1 Negócio

O ACM serve a **captação com exclusividade**: tese do deságio com âncora em **vendas reais ITBI/PMSP**, não em anúncios. A consultora decide o comercial; o sistema deve tornar **impossível** (ou gritante) número que não sobreviva a contraditório.

### 1.2 Três qualidades (ordem fixa)

1. **Defensável** — guard-rails, faixa, SQL/CEP/índice rastreáveis  
2. **Reprodutível** — qualquer endereço → mesmo pacote com um comando  
3. **Autônomo** — skill/squad com gates; humano só no comercial  

### 1.3 Princípios de engenharia observados no código

| Princípio | Manifestação |
|-----------|--------------|
| Art. IV No Invention | Constantes e seções traçam a PDFs de referência Honduras |
| Dado × compute × render | ADR-EPIC8-001: engine Python só ITBI; app nativo TS |
| Opt-in de mecanismos novos | 9.8/9.11 inertes sem inputs — fixture legado não quebra |
| Guard-rail por construção | 9.8, headline faixa, R5 — incidentes viram código |
| Zero recálculo no PDF | `LaudoDocument` só layout sobre `LaudoModel` |

---

## 2. Arquitetura em quatro camadas

```
┌─────────────────────────────────────────────────────────────┐
│  DADOS — ITBI/PMSP + (futuro) sink 9.4                      │
│  acm_comparaveis · RPC fn_comparaveis_no_raio · datasets    │
└───────────────────────────┬─────────────────────────────────┘
                            │ AcmComparable[]
┌───────────────────────────▼─────────────────────────────────┐
│  A — COMPUTE — app/src/lib/acm/methodology.ts               │
│  screen → homog. → mediana → Score → mercado → liquidez     │
│  → aderência → sensibilidade → headline → residual          │
│  → AcmLaudoComputation                                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ zero recálculo de metodologia
┌───────────────────────────▼─────────────────────────────────┐
│  B — VIEW-MODEL + RENDER                                    │
│  laudoModel / resumoModel / deckModel / didaticoModel       │
│  planilhaModel + exceljs · @react-pdf/renderer              │
│  buildAcmPackage (4 PDFs do mesmo computation)              │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ C protege a amostra (R5, 9.8) antes do compute
         │ D orquestra A+B+C para qualquer endereço (futuro)
```

**Arquivos-chave:**

| Path | Papel |
|------|--------|
| `app/src/lib/acm/methodology.ts` | Motor (~650+ linhas, puro) |
| `app/src/lib/acm/methodology.test.ts` | Regressão unitária |
| `app/src/lib/acm/honduras.fixture.ts` | Gabarito 23 vendas |
| `app/src/lib/acm/data/hondurasVendas.ts` | Homogeneização v5 |
| `app/src/lib/acm/pdf/*` | Models + Documents |
| `app/src/lib/acm/xlsx/*` | Planilha 7 abas |
| `app/scripts/acm-honduras/` | Pipeline offline caso âncora |
| `app/scripts/acm-andrade-pertence*/` | Casos 2–3 + R5 |
| `docs/reference/acm-honduras/` | PDFs-fonte da metodologia |

---

## 3. Eixo A — Motor `computeLaudo` (análise)

### 3.1 Pipeline

```
comparáveis
  → ① screenSelfReferences (9.8)     // ANTES de estatística
  → ② deflacionarComparaveis (9.11)  // opt-in FipeZap
  → ③ mediana R$/m² construído
  → ④ classifyScore → Capex → marketValue
  → ⑤ liquidityAdjustment (∏(1−fᵢ))
  → ⑥ rankByAdherence 50/20/30 → top5/top3
  → ⑦ sensitivityScenarios (todos/top5/top3)
  → ⑧ headlineFaixa (ref. aderente min · teto max)
  → ⑨ landPriceByLotSize + residualLandValue
  → ⑩ desagioMedido + composicaoBairros
  → AcmLaudoComputation
```

### 3.2 Âncoras de regressão Honduras (fixture legado)

| Indicador | Valor travado |
|-----------|----------------|
| N | 23 |
| Mediana R$/m² | ≈ 18.264 |
| Score alvo | B |
| Valor de mercado | ≈ 12.419.520 (= 18264 × 800 × 0,85) |
| Fechamento | ≈ 10.217.539 (fatores 7/5/3/4%) |
| Co-âncora residual | 9.624.000 |
| Top 3 | Chiaffarelli 86 · Bitencourt 101 · Torres Homem 399 |
| Deságio medido | ≈ −12,7% |
| Headline (sem homog.) | ref Top3 ~9,84M · teto todos ~12,42M |

Tolerância típica nos testes: ~0,5% (`within`).

### 3.3 Fórmulas e pesos (Art. IV)

| Conceito | Regra |
|----------|--------|
| Aderência | 0,50·simÁreaConstr + 0,20·simÁreaTerreno + 0,30·proximidade |
| Score AAA/AA/A/B | faixas ≥40k / ≥30k / ≥22k + suítes/vagas/área |
| Capex Score B | **0,15** (único calibrado no caso Honduras) |
| Raio padrão | 1.000 m |
| Residual | VGV − obra − demolição − comerc. − fin. − margem |

### 3.4 Forças e riscos do motor

**Forças**

- Funções puras, testáveis, sem React/Next  
- Opt-in preserva regressão ao evoluir (9.8, 9.11)  
- Headline em faixa remove o viés do “maior cenário como ponto”  
- Deságio invariante sob deflação temporal (por construção)  

**Riscos**

| Risco | Detalhe | Mitigação candidata |
|-------|---------|---------------------|
| Capex 0,15 “cego” | Maior mover de valor; parece arbítrio NBR oculto | C-1: cenários 0 / −7,5 / −15% declarados (já no 132 v3+) |
| Residual sem fonte citada | VGV 34k, obra 10,5k, margem 20% | N-2: campo `fonte` + elicit Luciana |
| Amostra frágil silenciosa | N=1 aceito; terreno n=2; multi-bairro | N-1: `avisos[]` no computation |
| Ranking com terreno 20% | No 132 distorceu mediana de construção | Terreno como lente Sec. 8, não peso (decisão 09-Jul) |
| Régua apto ausente | Método nasceu em casa/terreno | Story 9.1 |

### 3.5 Fixture v4 vs pipeline v5

| | Fixture (8.2) | Laudo Honduras v5 |
|--|---------------|-------------------|
| Guard-rail 9.8 | inerte | ativo |
| Homogeneização | off | FipeZap → mediana ~19.061 |
| Headline no PDF | ponto legado em partes | faixa **10,92–12,96M** |
| Bairro | “Jardim América” 23× | CEP real 16 / 5 / 2 |
| SQL | parcial | 23/23 |

A suite **protege o motor**; o v5 é o mesmo motor com opts + fonte rica.

---

## 4. Eixo B — PDF / view-model (análise)

### 4.1 Contrato de camadas

```
AcmLaudoComputation + LaudoSourceComparable[] + LaudoInput
        → buildLaudoModel()  // view-model puro
        → LaudoModel         // sec1…sec10
        → LaudoDocument      // React-PDF (layout only)
```

Se o número no PDF estiver errado: bug em **compute** ou **buildLaudoModel**, quase nunca no Document.

### 4.2 Paginação e capa

- **Page 1:** header RE/MAX · ficha · Score · **5 cards** · sumário  
- **Page 2+ (`wrap`):** seções 1–10; linhas de tabela `wrap={false}`; rodapé `fixed`

### 4.3 Cinco cards da capa

| Card | Origem |
|------|--------|
| Pretendido | `input.precoPretendido` (expectativa — **não** evidência) |
| Anúncio real | `input.precoPedidoReal` |
| Mercado (ACM) | `headline.mercado` min–max ou ponto se min=max |
| Co-âncora terreno | `computation.coAncoraTerreno` |
| Fechamento (destaque) | `metaFechamento` / `faixaFechamento` |

### 4.4 Mapa seção → fonte de verdade

| Sec. | Conteúdo | Fonte dos números |
|------|----------|-------------------|
| 1 Posicionamento | Pretendido / pedido / mercado / Δ / parecer / fechamento | input + headline + liquidez |
| 2 Liquidez | Tabela de fatores compostos | input (consultora) |
| 3 Localização | Mapa, Top 5, bairros, ofertas ativas | top5 + source + ofertas |
| 4 Critérios | Critérios + régua Score | defaults + homog. se ativa |
| 5 Universo | Tabela completa ★★★/★ | source + ranking |
| 6 Concorrência | Ofertas diretas / superiores | input comercial (não âncora ITBI) |
| 7 + 7.1 | Top N + SQL/status/URL | computation.top5 + source |
| 8a/8b | Efeito-escala + residual | efeitoEscala + ResidualLandParams |
| 9 Sensibilidade | Todos / Top5 / Top3 | sensibilidade[] |
| 10 Parecer | Conclusão + estratégia + condicionantes | templates + input |

### 4.5 Pacote e planilha

- `buildAcmPackage`: **um** computation → resumo + laudo + deck + didático  
- XLSX 7 abas (9.2): Leia-me · Top3 · Top5 · Top10 · Todos · Ofertas · Terrenos  
- Campos NULL → célula vazia (nunca `"nan"`)

### 4.6 Lacunas de render

| Gap | Impacto | Item roadmap |
|-----|---------|--------------|
| Resumo/deck/didático com mercado ponto | Inconsistência com laudo em faixa | H-4 |
| Seções de terreno em apto | Laudo metodologicamente incorreto para vertical | 9.1 |
| Mapa sem Top 5 numerados | Paridade visual vs. referência | 9.3 |
| Sem `avisos[]` | Amostra frágil “bonita” no PDF | N-1 |
| Tipografia/logo polish | Percepção premium | 9.6 |

**Veredito B:** a fábrica de PDF está madura para laudo técnico; o valor residual está em **paridade multi-entregável**, **produto apto** e **avisos de robustez**.

---

## 5. Eixo C — Tipologia R5 e casos Andrade Pertence (análise)

### 5.1 Incidente (causa-raiz)

```
Guia ITBI: Complemento "AP 82"
    → ingestão descartou Complemento
    → endereço de rua + venda única
    → proxy "casa?" falhou
    → ~40–50% APs na amostra
```

| Caso | Contaminação | Distorção na referência |
|------|--------------|-------------------------|
| 113 | ~54/120 APs | **−27%** |
| 132 | ~46/115 APs | **−11%** |

Narrativa comercial do 132 chegou a **inverter** (APs apresentados como casas da rua).

### 5.2 Regra R5 (não-negociável)

1. Tipologia só com **SQL → guia oficial** (Uso IPTU + padrão + Complemento)  
2. Entra só RESIDÊNCIA / horizontal  
3. Sem guia pública: heurística de lote **declarada** + flag Fase 1  
4. Bônus: terreno real, fração, testada, ACC → Sec. 8 mensurável  

Implementação de referência: `app/scripts/acm-andrade-pertence-132/10-backfill-tipologia.mjs`.

### 5.3 Resultados numéricos (estado 09-Jul)

#### Caso 113 (v2)

| Indicador | Valor |
|-----------|--------|
| Amostra | 56 casas |
| Mediana homog. | 10.640/m² |
| Faixa construção | R$ 723.536 – 1.094.096 (ref Top5 **1.060.626**) |
| Lente terreno | ~R$ 1,33M (42 lotes <500 m²) |
| Conclusão | **R$ 1,1M da proprietária é defensável** (v1 contaminada dizia o oposto) |

#### Caso 132 (v4 canônico)

| Indicador | Valor |
|-----------|--------|
| Amostra | 56 casas (58→56: Cotovia 726 + Pavão 700 Street View) |
| Área alvo | **196 m²** oficial (não 220 estimado) |
| Lente construção | ~R$ 1,77M (faixa ~1,77–2,08M) |
| Lente terreno | ~R$ 1,98M (terreno ~220 m² **provisório**) |
| Anúncio | R$ 1.495.000 ≈ **18,7% abaixo** da construção |
| Tese | Subprecificação + oferta pulverizada — **não cortar preço** |

**Decisão metodológica 132:** terreno como **lente Sec. 8 independente**, não peso 20% no ranking (evita colapso da mediana de construção por ITBI subdeclarado).

### 5.4 Lições

1. Maps/Street View = **trigger**; guia = **fonte autoritativa**  
2. Heurística de lote sozinha **não basta** (2 edifícios no 132)  
3. Contaminação de tipologia **inverte tese** (113)  
4. R5 deve ser **gate de P-1/D-3**, não script ad hoc  
5. Story **9.4** sobe de prioridade (Complemento/Uso/terreno/ACC)  
6. Fase 1 humana permanece para “casa (provável)” sem guia 2026  

**Veredito C:** qualidade da **amostra** domina sofisticação da **fórmula**. Sem R5 industrializado, o motor Honduras-perfeito gera laudo **erradamente confiante**.

---

## 6. Eixo D — Skill `/acm-validate` e autonomia (análise)

### 6.1 Estado atual

| Peça | Existe? |
|------|---------|
| Motor + PDF + XLSX | Sim |
| Scripts por caso (Honduras, 113, 132) | Sim |
| CLI `acm-validate <endereço>` (P-1) | **Não** |
| XLSX merge-back (P-2) | **Não** |
| Skill `.agents/skills/.../acm-validate` | **Não** |
| Squad `acm-squad` | **Não** (só especificado) |

### 6.2 Visão-alvo (auditoria + roadmap)

```
/acm-validate <endereço>
  → @acm-data      (RPC/ITBI/R5)
  → @acm-verifier  (web adversarial)
  → @acm-auditor   (checklist + guard-rails)
  → @acm-writer    (PDF/XLSX/handoff)
  → docs/acm/<slug>/
```

### 6.3 Dependências de desbloqueio

```
P-1 CLI (3,5–5d)  ──BLOQUEADOR #1──┐
                                    ├──► D-3 skill/squad
P-2 XLSX merge-back ────────────────┤
R5 no pipeline genérico ────────────┤
Story 9.4 (dados PROD) ─────────────┤
N-5 variância dos gates ────────────┘ (antes de confiar no auditor LLM)
normalizeStreet() gap 9.8 ── story candidata
```

### 6.4 Critérios de pronto D-3

1. Um endereço gera pacote sem script dedicado  
2. Gates 9.8 + R5 + Top-3 falham **com motivo** ou passam  
3. Rebuild XLSX preserva Confere?/Correção/Obs  
4. `@acm-auditor` com variância medida no gabarito Honduras  
5. Artefatos em `docs/acm/<slug>/` + handoff  

### 6.5 O que não colocar no skill cedo

- Tipologia sem guia  
- Gate LLM “parece bom?” sem banda (N-5)  
- Anúncio como âncora de valor (C-4 = só atratividade comercial)  

**Veredito D:** a camada agentica é o **último km operacional**. Implementá-la antes de P-1/9.4/R5 multiplica erro com aparência de processo.

---

## 7. Matriz de maturidade (score sintético)

Escala 1–5 (1 = ad hoc, 5 = industrializado e medido).

| Dimensão | Score | Comentário |
|----------|-------|------------|
| Fidelity metodológica (Honduras) | **5** | Regressão + Art. IV |
| Determinismo do compute | **5** | Puro + testes |
| Fábrica PDF laudo | **4** | Madura; H-4/9.1/9.3 |
| Planilha validação corretor | **4** | 9.2; falta merge-back |
| Guard-rails anti-contaminação | **4** | 9.8 + R5 scripts; R5 ≠ PROD |
| Base ITBI metodologia-ready | **2** | 100% NULL campos; Complemento perdido |
| Generalização multi-endereço | **2** | 3 pipelines manuais |
| Autonomia skill/squad | **1** | Spec only |
| Validação comercial Luciana | **2** | H-3 pendente |

**Score médio ponderado (ênfase defensabilidade):** ~3,4/5 — **sólido em método, frágil em escala e dado**.

---

## 8. Análise de riscos (priorizada)

| # | Risco | Prob. | Impacto | Mitigação |
|---|-------|-------|---------|-----------|
| R1 | Laudo em PROD com APs na amostra | Alta sem 9.4/R5 | Crítico (tese invertida) | 9.4 + R5 gate |
| R2 | Headline/faixa sem buy-in Luciana | Média | Alto (captação Clarisia) | H-3 |
| R3 | Capex −15% não elicitado | Alta | Alto (swing valor) | C-1 + H-3 |
| R4 | Skill antes do CLI | Média se apressar | Alto (automação do erro) | P-1 primeiro |
| R5 | Residual sem fonte | Média | Médio | N-2 |
| R6 | Terreno 132 provisório | Alta | Médio (lente sobe se matrícula maior) | Matrícula/IPTU |
| R7 | Gates LLM instáveis | Alta se N-5 skip | Médio–Alto | Playbook N-5 |

---

## 9. Recomendações (ordem de execução)

### Imediato (captação + confiança)

1. **H-3** com Luciana: formato faixa, fatores liquidez dos 3 casos, Capex por estado do imóvel  
2. **H-4** propagar `headline` a resumo/deck/didático  
3. **N-1** `avisos[]` no computation (baixo esforço, alto valor)  

### Curto prazo (escala)

4. **P-1** CLI `acm-validate` (dataset canônico, RPC, gate Top-3 dinâmico, R5 plugável)  
5. **Story 9.4** sink ITBI com Complemento / Uso / terreno / SQL / ACC  
6. **P-2** XLSX merge-back  

### Médio prazo (autonomia)

7. Skill `/acm-validate` + squad (D-3)  
8. **N-5** medir gates antes de `@acm-auditor` em produção  
9. **9.1** régua apto/casa no laudo  
10. **D-2 / N-4** Fase B web com `confianca` graduada  

### Explicitamente *depois*

- Regressão hedônica / NBR formal (roadmap Fase 2 estatística)  
- Squad completo com julgamento livre sem banda medida  

---

## 10. Como A · B · C · D se encaixam

```
        A (motor computeLaudo)     ← maduro
              │
              ▼
        B (PDF/XLSX)               ← maduro no laudo
              │
              ▼
        C (R5 + 9.8 na amostra)    ← crítico; partial
              │
              ▼
        D (skill generaliza)       ← bloqueado por P-1 + C + 9.4
```

**Síntese em uma frase:**  
o ACM já é um **instrumento de avaliação auditável**; ainda não é uma **fábrica multi-endereço autônoma**. O caminho seguro é industrializar **amostra e CLI** antes de **orquestração agentica**.

---

## 11. Referências cruzadas

| Documento | Uso |
|-----------|-----|
| `docs/acm/ROADMAP-ACM.md` | Sequência H/P/D/N e estado de stories |
| `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md` | 4 frentes + checklist auditor |
| `docs/acm/honduras-629/RELATORIO-ALTERACOES-LAUDO-v4-v5-20260707.md` | Diff v4→v5 |
| `docs/acm/HANDOFF-20260709-andrade-pertence.md` | Casos 113/132 + R5 |
| `docs/architecture/adrs/ADR-EPIC8-001-acm-rendering-engine-vs-native.md` | Dado × compute × render |
| `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` | Escopo Epic 8 |
| `docs/prd/EPIC-9-ACM-PARIDADE-PREMIUM.md` | Escopo Epic 9 |
| `docs/reference/acm-honduras/` | PDFs-fonte metodologia |

---

## 12. Changelog deste documento

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-07-09 | Análise de engenharia (sessão deep-dive B→D→A→C) | Criação |

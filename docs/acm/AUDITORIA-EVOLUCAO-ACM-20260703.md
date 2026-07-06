# Auditoria ACM Honduras 629 + Plano de Evolução do Processo

**Data:** 03 Jul 2026
**Consultora:** Luciana Borba — RE/MAX Galeria Moema
**Caso de referência:** Rua Honduras 629, Jardim América, São Paulo
**Branch:** `fix/epic7-v-crawl-health`
**Auditoria multi-agente:** Opus = metodologia · Sonnet = código + produto · Fable = síntese / plano / QA

---

## 1. Sumário executivo

- O pipeline de validação multi-etapas (Honduras scripts + planilhas) cumpriu seu papel: identificou erros reais no laudo, incluindo o incidente de auto-referência com Rua Honduras 639 e a classificação sistemática incorreta de bairro — evidência de que o processo de QA externo tem valor.
- O laudo técnico gerado pelo engine externo (projeto `imoveis-jardins`, 09/06/2026) apresenta falhas metodológicas críticas que comprometem a defensabilidade do valor headline R$ 12,4M: seleção do cenário de maior valor como referência, uso do preço pedido do próprio imóvel como âncora de mercado, ausência de homogeneização e mistura de bairros com rotulação inconsistente.
- A tabela de sensibilidade do laudo revela que o cenário mais aderente (Top 5 comparáveis) produz mediana de 14.474 R$/m² e valor de mercado R$ 9,84M — cerca de 20% abaixo do headline. A faixa robusta situa-se entre R$ 9,8M e R$ 11,9M, com R$ 12,4M sendo o teto do recorte menos aderente (todos os 23 comparáveis).
- Nenhum guard-rail automatizado impede que um comparável seja o próprio imóvel-alvo: o incidente 639 (anúncio do alvo quase incorporado na p. 6 do laudo v4) foi corrigido manualmente e externamente — o sistema não rejeita auto-referência por fingerprint.
- O código dos scripts de validação replica funções já testadas e canônicas do app (`adherenceIndex`, `haversine`, geocode Mapbox), criando risco de divergência silenciosa entre scripts e produto.
- O processo de validação Fase 2 (re-verificação web) não cobre fontes de luxo, tem taxa de falso negativo estimada em ~60% por ausência de retry para HTTP 403, e o campo de resultado é booleano em vez de graduado (alta/média/baixa confiança).
- O pipeline inteiro é hardcoded para o caso Honduras: TARGET, 23 comparáveis, paths, workflow — generalizar para `acm-validate <endereço>` requer estimativa de 3,5 a 5 dias de desenvolvimento.
- Os 3.618 registros ITBI de Moema no banco têm 100% NULL nos campos de metodologia (`area_construida_m2`, `dormitorios`, `suites`, `vagas`, `score`, `sql_cadastral`), bloqueando o uso pleno do produto in-app para qualquer caso além do seed de demo.
- O plano de evolução é estruturado em 4 frentes: (1) guard-rails metodológicos, (2) generalização do pipeline, (3) fechamento do Epic 9 no produto, (4) skill + squad de automação.
- Veredito: o valor R$ 12,4M não é defensável como número único sem due diligence (matrícula/IPTU: metragem, averbação, uso comercial×residencial, programa); a entrega ao proprietário deve reportar faixa com o cenário aderente como referência principal.

---

## 2. Propósito inicial do ACM (contexto de produto)

### 2.1 Propósito e pilares

O ACM foi concebido para operacionalizar a metodologia proprietária da Luciana Borba na etapa de **captação**: convencer o proprietário a assinar o contrato de exclusividade pela "tese do deságio" (desconto de 10% a 15% sobre o valor pedido), com âncora em transações ITBI reais — não em preços pedidos de portais.

Quatro pilares sustentam a metodologia (fonte: `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md`):

1. **Âncora ITBI** — valor de venda real como base, não preço de anúncio.
2. **Score de aderência 50/20/30** — área construída (50%), área de terreno (20%), proximidade geodésica (30%).
3. **Dois cenários do comprador** — direto (R$/m² de mercado) e residual do incorporador (VGV − custo de obra − margem).
4. **Rastreabilidade SQL/GeoSampa** — toda comparável vinculada a registro público.

### 2.2 Estado atual do produto (Epic 8 fechado)

A rota `/acm/[leadId]` do app gera, em produção:

- Resumo Executivo PDF
- Laudo Técnico PDF (18 páginas)
- Deck Comercial PDF
- Material Didático PDF
- Pacote 1-clique (4 PDFs gerados em sequência)
- CSV de comparáveis
- Planilha XLSX de 7 abas (Story 9.2 Done/CONCERNS)
- Mapa Top 5 embutido

Decisões técnicas vigentes: React-PDF nativo (ADR-EPIC8-001); fontes Montserrat/Inter embutidas (Story 9.6 Done); camada de cálculo `methodology.ts` com regressão travada no caso Honduras (132 testes ACM).

### 2.3 Por que Honduras 629 foi produzido fora do app

Três razões convergentes:

1. **Cobertura geográfica**: o banco de ITBI cobre apenas Moema; o imóvel-alvo (Rua Honduras 629) localiza-se no Jardim América, sem dados no repositório.
2. **Cronologia pré-Epic 8**: o laudo foi gerado em 09/06/2026 pelo engine Python externo (`imoveis-jardins` / "Jardins Intelligence Lab"); o Epic 8 foi implementado entre 15 e 16/06/2026.
3. **Fase B inexistente no app**: a re-verificação web (Fase 2) não existe como funcionalidade in-app — está apenas esboçada no PRD (Story 9.5, não draftada).

Cronologia resumida: laudo 09/06 → Epic 8 15-16/06 → Epic 9 criado 17/06 → scripts de validação `app/scripts/acm-honduras/` executados 16-22/06 → achado Honduras 639 = 629 em 28/06 (registrado em `docs/HANDOFF-SESSION-20260628-honduras-639.md`).

### 2.4 Pendências do Epic 9

| Story | Título | Status | Bloqueio |
|-------|--------|--------|----------|
| 9.1 | Apto/casa (régua de score) | Ready | Elicit com Luciana |
| 9.4 | Sink/backfill cross-repo | Ready | Prioritário — 3.618 ITBI com 100% NULL |
| 9.5 | Validação web Fase B in-app | Não draftada | Aguarda lições da Fase 2 externa |

A Story 9.4 é pré-requisito para 9.1 e para a riqueza de dado de qualquer ACM in-app futuro.

---

## 3. Auditoria de metodologia (relatório Opus)

### 3.1 Achados críticos

**[CRÍTICO] Seleção de cenário favorável como headline**

A tabela de sensibilidade do laudo (Seção 9, p. 15) apresenta três recortes:

| Recorte | Mediana R$/m² | Valor de mercado | Valor fechamento |
|---------|--------------|-----------------|-----------------|
| Todos os 23 comparáveis | 18.264 | R$ 12,42M | R$ 10,22M |
| Top 5 aderentes | 14.474 | R$ 9,84M | R$ 8,10M |
| Top 3 aderentes | 17.544 | R$ 11,93M | R$ 9,81M |

O padrão é inequívoco: quanto mais aderente o recorte, menor o valor. O laudo adota o cenário de maior valor (23 comparáveis) como headline, enquanto o texto afirma que Top 3/Top 5 são a "espinha dorsal" da análise. O intervalo entre os cenários extremos ultrapassa 25%. Não existe justificativa registrada para a escolha do recorte menos aderente como referência.

**[CRÍTICO] Âncora circular (preço pedido do alvo como evidência de mercado)**

A "convergência tríplice R$ 10,0–10,5M" citada no laudo incorpora o preço pedido do próprio imóvel-alvo (anúncio Cheznous, ref. 73232, R$ 10,5M) como dado de mercado independente. Trata-se do mesmo fenômeno do incidente Honduras 639: o anúncio do imóvel-alvo quase entrou como comparável na p. 6 do laudo v4, sendo corrigido manualmente e de forma externa ao sistema — nenhum guard-rail automatizado teria bloqueado a inclusão.

**[CRÍTICO] Ausência de homogeneização**

O score 50/20/30 ordena comparáveis, mas não pondera o valor unitário. O valor final é calculado como mediana simples de R$/m² acrescida de um fator-cego de −15% (Capex/Score B), sem tratamento de atributos relevantes. Imóveis com ano de construção entre 1960 e 2023 são misturados sem qualquer ajuste de depreciação ou padrão construtivo — prática inconsistente com NBR 14653-2 (tratamento por fatores ou regressão).

**[CRÍTICO] Contradição de bairro sistemática**

A Seção 3 do laudo admite a composição real da amostra: Jardim Paulista (16 comparáveis), Jardim América (6), Jardim Europa (2). A Seção 5 rotula todos os 23 como "Jardim América" — e o arquivo `honduras-dataset.mjs:41-64` propaga essa rotulação incorreta para o pipeline computacional. A contradição é estrutural: o método ignora a distinção de bairro para ampliar a amostra, mas invoca o prestígio de Jardim América (mediana BNSir R$ 34.287/m²) como calibração do Score B.

**[CRÍTICO — processo] Guard-rail de auto-referência ausente**

Nenhum mecanismo do pipeline rejeita automaticamente um comparável cujo fingerprint (rua coincidente + distância < ~10m, área ≈ 800m², 10 vagas, preço pedido ≈ R$ 12M) case com o imóvel-alvo. O gate do script `05-build-final-styled.mjs:222` protege apenas a ordenação do ranking, não a exclusão de auto-referências.

### 3.2 Achados de alta severidade

**[ALTO] Sem tratamento temporal**

Vendas de 2024 a 2026 são computadas na mesma mediana sem qualquer deflação ou indexação. As datas por item existem no material didático (p. 5-7), mas a coluna "Mês/Ano venda" foi mantida como placeholder — as datas foram descartadas do cálculo.

**[ALTO] Co-âncoras sobre amostras insuficientes**

A âncora de terreno apoia-se em N = 2 transações. Os parâmetros do cenário residual do incorporador (VGV 34.000 R$/m², custo de obra 10.500 R$/m², margem 20%) não têm fonte citada no laudo.

**[ALTO] Divergência entre laudo e pipeline sobre comparáveis confirmados**

A Fase 2 (re-verificação web) confirmou 3 dos 10 itens verificados — e os 3 têm ressalvas: Canadá 111 (endereço institucional SAESP), Estados Unidos 691 (imóvel comercial, 10 quartos/16 vagas), Suécia 526 (Jardim Europa, não Jardim América). Mais grave: o material didático do laudo declara como confirmados Bittencourt/Torres Homem/Veneza; o pipeline rejeitou os dois primeiros. O conceito de "confirmação" permanece mal definido.

**[ALTO — formato] Promessa de merge-back não cumprida**

O arquivo `WORKFLOW-revalidacao-web.md:64` promete preservar as marcações do corretor (Confere? / Correção / Observação) a cada rebuild da planilha. Nenhum script implementa o merge-back: existem 3 arquivos sobrepostos e as marcações se perdem em qualquer regeneração.

### 3.3 Mérito do processo

O fluxo de validação externa capturou erros reais que não seriam detectados pelo engine Python isolado: auto-referência circular (Honduras 639), rotulação sistemática de bairro, uso comercial (Torres Homem 4d/4s como programa residencial), caveat sobre endereço institucional (Canadá 111). As planilhas produzidas têm design funcional: dropdown ✓/✗/?, semáforo visual, freeze de painéis, autofilter e banner de achado crítico.

### 3.4 Conclusão metodológica

O número único R$ 12,4M não é defensável para apoiar a decisão de precificação de um imóvel ofertado a R$ 12M sem due diligence prévia sobre matrícula e IPTU (metragem registrada, status de averbação, uso comercial vs. residencial, programa exato). A entrega ao proprietário deve reportar **faixa** com o cenário aderente (Top 5 ou Top 3 com justificativa) como referência principal, e o cenário de 23 comparáveis como teto conservador.

---

## 4. Auditoria de código (relatório Sonnet)

### 4.1 Duplicações identificadas

| Função | Ocorrências | Canônica |
|--------|-------------|----------|
| `adherence()` | 3 cópias nos scripts (03:38-45, 04:23-27, 05:24-29) | `adherenceIndex()` em `app/src/lib/acm/methodology.ts:181-198` (testada) |
| `haversine` | 3 implementações no projeto (scripts, `callListOrder.ts`, `apify.ts`) | — (nenhuma declarada canônica) |
| Geocode Mapbox | Reimplementado nos scripts | `geocoding.ts` no app (com bbox de Moema hardcoded) |
| `loadEnv()` | 2 cópias (scripts 01 e 03) | — |
| Dataset 23 comparáveis | 2 fontes com schemas diferentes: `honduras-dataset.mjs` e `honduras.fixture.ts` | Sincronizadas manualmente |
| XLSX | 2 bibliotecas: SheetJS (scripts 03/04) e exceljs (script 05 + app) | — |

### 4.2 Qualidade e riscos

- Gate de sanidade Top-3 nos scripts tem lógica correta e agrega valor.
- Catch silencioso no geocode dos scripts encobre falhas de rede sem registro.
- Ausência de try/catch na leitura de `reverify-result.json`: erro ENOENT exposto diretamente ao runtime.
- Mutação do objeto `TARGET._geo` dentro de módulo importado (efeito colateral global).
- `reverify-web.workflow.mjs` não é código Node executável — é pseudocódigo de Workflow Claude sem aviso explícito no arquivo.

### 4.3 Cobertura de testes

Os módulos ACM do app têm boa cobertura: `methodology.test.ts` usa `honduras.fixture.ts` como caso de regressão. Os scripts de validação têm cobertura zero. Risco direto: alteração em `ADHERENCE_WEIGHTS` quebra silenciosamente os scripts sem qualquer alerta de teste.

### 4.4 Workflow de Fase 2 — limitações

- Schema de resultado bem definido; `found: false` implementado corretamente (sem invenção, Art. IV).
- Ausência de retry para HTTP 403: estimativa de ~60% de falsos negativos nas verificações web.
- Veredito da verificação é booleano (`confirmado: true/false`) em vez de graduado (alta/média/baixa confiança).
- Sem cache ou timestamp de execução por item — reruns não são idempotentes.
- Screenshots não são capturados como evidência.
- Fontes de mercado de luxo (Bossa Nova Sotheby's, JLL etc.) não estão contempladas.

### 4.5 Hardcoding para Honduras

O pipeline é inteiramente parameterizado pelo caso Honduras: TARGET completo, 23 comparáveis, 11 ofertas, ESPERADO Top 3, paths `docs/acm/honduras-629/` e itens do workflow — todos constantes hard-coded. Estimativa para generalizar em `acm-validate <endereço>`: **3,5 a 5 dias** (utils compartilhados 1d; adapter RPC 1-2d; parametrizar saída/gate 0,5d; testes 1d).

### 4.6 Refactors prioritários (esforço × valor)

| # | Refactor | Esforço |
|---|---------|---------|
| 1 | `loadEnv` compartilhado entre scripts | 0,5h |
| 2 | Importar `adherenceIndex`/`ADHERENCE_WEIGHTS` de `methodology.ts` nos scripts | 2h |
| 3 | `haversine` único em lib geo compartilhada | 1h |
| 4 | Dataset canônico único (fixture + scripts) | 3h |
| 5 | `exceljs` único + helpers XLSX compartilhados | 4h |
| 6 | try/catch em leitura de `reverify-result.json` | 30min |
| 7 | Retry 403 + campo `confianca` graduado | 2h |
| 8 | CLI parametrizado (passo 1 do `acm-validate`) | 1d |
| 9 | Renomear `.workflow.mjs` para deixar claro que é pseudocódigo | 10min |
| 10 | Smoke tests dos scripts | 1d |

---

## 5. Plano de evolução (definido pelo arquiteto — Fable)

### Frente 1 — Guard-rails metodológicos (curto prazo, maior impacto no valor)

**1.1 Anti-auto-referência em `methodology.ts`**
Implementar `isSelfReference(comp, target)`: rejeita comparável, oferta ou âncora que satisfaça (mesma rua E distância < 50m) OU fingerprint raro coincidente (área ± 2% + vagas iguais + preço pedido na faixa). O gate é obrigatório no dataset, no laudo e na planilha. Teste de regressão com o caso Honduras 639.

**1.2 Faixa, não ponto**
O modelo do laudo passa a expor a tabela de sensibilidade completa (cenários 23/Top5/Top3). O headline vira faixa. Regra dura: o headline não pode ser o cenário de maior valor sem justificativa explícita registrada no artefato.

**1.3 Homogeneização mínima**
Segmentar comparáveis por bairro real verificado via CEP (novo campo `bairroReal`). Ajustar por idade do imóvel. Incorporar a data de venda por item e deflacionar para valor presente com índice a definir com a Luciana (INCC / IGP-M / FipeZap — ver Seção 6).

**1.4 Âncoras exclusivamente de terceiros**
Preço ou atributo originado de anúncio do próprio imóvel-alvo nunca entra como evidência de mercado — apenas como "expectativa da proprietária", em campo separado e com label explícito.

---

### Frente 2 — Generalização do pipeline (`acm-validate`)

**2.1 Refactors estruturais**
Executar os refactors 1 a 6 da tabela do §4.6 (deduplicação de `adherence`, `haversine`, geocode, `loadEnv`; exceljs único; dataset canônico único) como pré-requisito de qualquer generalização.

**2.2 CLI `acm-validate <endereço>`**
TARGET via parâmetros da linha de comando; comparáveis via RPC `fn_comparaveis_no_raio` com fallback a dataset declarado; saída em `docs/acm/<slug>/`; gate Top-3 dinâmico. Esforço estimado: 3,5 a 5 dias.

**2.3 XLSX vivo com merge-back**
Implementar merge-back das marcações do corretor (Confere? / Correção / Observação) a cada rebuild da planilha — cumpre a promessa documentada em `WORKFLOW-revalidacao-web.md:64` e preserva o trabalho de revisão entre iterações.

---

### Frente 3 — Fechar Epic 9 (produto in-app)

**3.1 Story 9.4 primeiro (sink/backfill cross-repo)**
Desbloqueia 9.1 e torna o dado ITBI de Moema utilizável: os 3.618 registros têm hoje 100% NULL nos campos de metodologia (`area_construida_m2`, `dormitorios`, `suites`, `vagas`, `score`, `sql_cadastral`).

**3.2 Story 9.1 (apto/casa) após elicit com Luciana**
Definir a régua de score para tipologia apartamento e casa, com os pesos adequados para cada caso.

**3.3 Draftar Story 9.5 (Fase B in-app)**
Incorporar as lições da Fase 2 externa: navegador real (claude-in-chrome) em vez de `WebFetch`; retry/fallback para HTTP 403; campo `confianca` graduado (alta/média/baixa); screenshots como evidência auditável; portais de luxo como fontes; Wayback Machine e GeoSampa como fontes de cruzamento.

**3.4 Cobertura geográfica parametrizável**
Pipeline ITBI por bairro, não fixado em Moema — pré-requisito para qualquer ACM in-app fora do território coberto pelo banco atual.

---

### Frente 4 — Skill + Squad (automação com as qualidades do Fable)

**4.1 Skill de projeto `/acm-validate`**
Arquivo: `.claude/skills/acm-validate/SKILL.md`

Encapsula o processo completo:
- Entrada: endereço-alvo + laudo/dataset
- Fase 1: geração da planilha de validação
- Fase 2: workflow de re-verificação web com verificação adversarial
- Merge-back de marcações
- QA gates obrigatórios: anti-auto-referência, self-check Top-3, checklist metodológico do §3

Roteamento de modelo embutido: orquestração/QA = Fable; buscas/leitura = Sonnet; casos ambíguos de metodologia = Opus.

**4.2 Squad AIOX `acm-squad` (via @squad-creator)**

| Agente | Papel | Modelo sugerido |
|--------|-------|-----------------|
| `@acm-data` | Dataset/ITBI/RPC | Sonnet |
| `@acm-verifier` | Re-verificação web adversarial | Fable |
| `@acm-auditor` | Auditoria metodológica NBR-lite + guard-rails | Fable/Opus |
| `@acm-writer` | Planilhas/laudos/documentação | Sonnet |

O checklist do `@acm-auditor` nasce da Seção 3 deste documento.

**4.3 Workflow salvo generalizado**
Arquivo: `.claude/workflows/acm-reverify.mjs`

Evolução do `reverify-web.workflow.mjs` existente com: itens via args (não hardcoded), retry para HTTP 403, campo `confianca` graduado, screenshots de evidência, timestamp e cache por execução.

---

### Roadmap sugerido

| Sprint | Duração estimada | Frentes |
|--------|-----------------|---------|
| Sprint 1 | 1-2 dias | Frente 1 (guard-rails) + refactors rápidos 1-3/6/9 |
| Sprint 2 | 3-5 dias | Frente 2 (CLI `acm-validate` + XLSX vivo) |
| Sprint 3 | A definir | Frente 3 (9.4 → 9.1 → draft 9.5) |
| Incremental | Em paralelo | Frente 4 (skill primeiro; squad quando processo estabilizar) |

> **Status Sprint 1 — CONCLUÍDO em 05-Jul-2026:**
> - **Story 9.8** (04-Jul): guard-rail anti-auto-referência (1.1) + exposição de `faixaSensibilidade` (1.2-dados) + refactors #6 (try/catch `reverify-result.json`) e #9 (aviso pseudocódigo no `.workflow.mjs`).
> - **Story 9.9** (05-Jul, `docs/stories/9.9.story.md`): refactors #1/#2/#3 — deduplicação de `loadEnv`/aderência/haversine. Criados `app/src/lib/geo.ts` (haversine canônico único) e `app/scripts/acm-honduras/lib.mjs` (espelho Node puro para os scripts); cadeado anti-drift `app/src/lib/acm/scriptsParity.test.ts` (paridade de aderência + haversine entre `lib.mjs` e os canônicos). 16 arquivos / 161 testes passando; eslint e tsc limpos no escopo.
> - **Pendência remanescente da Frente 1:** apenas a homogeneização 1.3 (segmentação por `bairroReal` + deflação temporal) — aguarda elicit com Luciana sobre o índice (INCC / IGP-M / FipeZap).
> - **Próximo:** Sprint 2 — CLI `acm-validate <endereço>` + XLSX vivo com merge-back (Frente 2).

Governança: cada frente vira stories via @sm/@po (SDC); push e PRs via @devops (exclusivo, Art. II).

---

## 6. Decisões em aberto (para o founder / Luciana)

### Direcionamento de mercado — confirmado pelo founder em 04-Jul-2026

**Mercado-alvo do mecanismo ACM:** região Sul + Jardins de São Paulo, com foco principal em **Moema / Vila Olímpia / Brooklin**.

Implicações diretas:

- **Frente 2 (generalização)** e **Frente 3.4 (cobertura geográfica)** devem priorizar esses bairros na ordem acima.
- Moema já tem 3.618 ITBI em PROD (cobertura operacional).
- **Vila Olímpia e Brooklin exigirão ingestão ITBI nova** via repositório externo `acm-imobiliario` — não há dados disponíveis no banco atual.

---

1. **Índice de atualização temporal — [RESOLVIDO — 06-Jul-2026]:** founder escolheu **FipeZap** (índice específico de imóveis por cidade) para deflacionar as vendas ITBI 2024–2026 a valor presente. Implementação na homogeneização 1.3.

2. **Política de headline — [RESOLVIDO — 06-Jul-2026]:** founder escolheu **faixa + cenário aderente como referência principal** (Top 3/Top 5 como referência, "todos" como teto; ex.: R$ 9,8–12,4M). Implementação no `laudoModel` usando o `faixaSensibilidade` já exposto pela Story 9.8. Validar o formato final com a Luciana antes do primeiro laudo entregue.

3. **Elicit Story 9.1 — [DIRECIONADO — 06-Jul-2026]:** implementar com a **régua provisória do rascunho** (handoff 17-Jun), marcada como PROVISÓRIA nos artefatos, e validar com a Luciana depois com casos reais de apto.

4. **Prioridade entre Frente 2 e Frente 3**: generalizar o pipeline local (Frente 2, CLI `acm-validate`) ou evoluir o produto in-app (Frente 3, Epic 9) dependem de orçamento de sessão e horizonte de uso. Um caso fora de Moema imediatamente justifica a Frente 2 antes da 3.

5. **Confirmação de consultora — [RESOLVIDO — 04-Jul-2026]:** **Clarisia é a proprietária do imóvel Rua Honduras 629** — amiga da consultora, potencial cliente de captação. A consultora do processo permanece Luciana Borba (RE/MAX Galeria Moema). O nome não constava nos artefatos auditados porque a associação proprietária↔imóvel não havia sido formalizada até a confirmação do founder em 04-Jul-2026.

---

## 7. Referências

### Documentação e handoffs

| Arquivo | Conteúdo |
|---------|----------|
| `docs/HANDOFF-SESSION-20260628-honduras-639.md` | Achado: Honduras 639 = imóvel-alvo (mesmo imóvel); não usar como comparável |
| `docs/HANDOFF-SESSION-20260616-epic8-acm-pdf.md` | Epic 8 PDF — 8.2 fechada, 8.3a/8.3b implementadas |
| `docs/HANDOFF-SESSION-20260616b-epic8-fechado.md` | Epic 8 FECHADO (8.3b/8.4/8.6 Done, pushed e9a76ad) |
| `docs/HANDOFF-SESSION-20260617-epic9-acm.md` | Epic 9 criado (4 stories Ready: 9.0/9.1/9.2/9.4) |
| `docs/HANDOFF-SESSION-20260621-epic9-10.md` | Sessão 21 Jun: Epic 9/10 em andamento |
| `docs/HANDOFF-SESSION-20260622-epic10.md` | Epic 10 completo; dívida captação Epic 6 em PROD |

### PRDs e arquitetura

| Arquivo | Conteúdo |
|---------|----------|
| `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` | Propósito, 4 pilares, stories do Epic 8 |
| `docs/acm/honduras-629/` | Planilhas de validação (Fase 1 / REVERIFICADO / FINAL) + `WORKFLOW-revalidacao-web.md` |
| `docs/reference/acm-honduras/` | Laudo `LAUDO_ACM_Rua_Honduras_RE-MAX_v4_NOVO.pdf` + `MATERIAL_DIDATICO_ACM_Honduras.pdf` |
| `docs/guides/MIGRACAO-ACM-laudo-planilha-mapa.md` | Guia de migração ACM laudo→planilha→mapa |

### Scripts de validação

| Arquivo | Conteúdo |
|---------|----------|
| `app/scripts/acm-honduras/01-discover.mjs` | Descoberta read-only do banco (diagnóstico); `loadEnv` duplicado |
| `app/scripts/acm-honduras/03-build-xlsx.mjs` | Fase 1 — geocode + ranking + XLSX; `adherence()` duplicada; SheetJS |
| `app/scripts/acm-honduras/04-merge-reverify.mjs` | Merge do resultado da Fase 2; `adherence()` duplicada; SheetJS |
| `app/scripts/acm-honduras/05-build-final-styled.mjs` | Planilha FINAL estilizada; gate Top-3 (l. 222); `adherence()` duplicada; exceljs |
| `app/scripts/acm-honduras/honduras-dataset.mjs:41-64` | 23 comparáveis com bairro rotulado incorretamente |
| `app/scripts/acm-honduras/reverify-web.workflow.mjs` | Pseudocódigo de Workflow Claude (não executável Node) |
| `docs/acm/honduras-629/WORKFLOW-revalidacao-web.md:64` | Promessa de merge-back não implementada |

### Código do app

| Arquivo | Conteúdo |
|---------|----------|
| `app/src/lib/acm/methodology.ts:181-198` | `adherenceIndex()` canônica (testada) |
| `app/src/lib/acm/methodology.test.ts` | Regressão da metodologia usando a fixture Honduras (suíte ACM: 132 testes) |
| `app/src/lib/acm/honduras.fixture.ts` | Dataset de referência para testes (schema diferente do script) |
| `app/src/lib/geocoding.ts` | Geocode Mapbox canônico (bbox Moema hardcoded) |
| `app/src/lib/fisbo/callListOrder.ts` | `haversineMeters` duplicada (instância 2/3; a 3ª está em `app/src/lib/apify.ts`) |

### ADRs e decisões técnicas

| Referência | Decisão |
|-----------|---------|
| ADR-EPIC8-001 | React-PDF nativo (em vez de toolkit Python externo) |
| Story 9.6 Done | Fontes Montserrat/Inter embutidas nos PDFs |
| Memória `project_lgpd-mvp-waiver` | Waiver LGPD para MVP local (24-Mai; re-avaliar antes de prod/multi-user/cloud) |

---

*Documento gerado em 03/07/2026 · Synkra AIOX · auditoria multi-agente*
*Não contém dados inventados — todas as afirmações rastreiam a artefatos listados na Seção 7.*

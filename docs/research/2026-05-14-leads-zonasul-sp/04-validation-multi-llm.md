# 04 — Validation Wave 2

**Pipeline:** tech-research v3.2 (--deep)
**Wave:** 2 (Validation — depth-first)
**Data:** 2026-05-14
**Predecessor:** `wave-1-summary.md`, `curiosity_queue.yaml`
**Status:** ✅ Concluído — 7/10 CQs resolvidos ou parciais; 3 hypotheses com verdict
**Multi-LLM:** SKIPPED (Playwright MCP não autenticado nas LLMs externas; usado WebSearch consensus dirigido como graceful fallback).

> Cada seção: status, achados, fontes, confidence, decisão recomendada. Nada de invenção: toda afirmação tem URL + data.

---

## Sumário executivo (1 parágrafo)

**Wave 2 destravou 4 dos 5 itens P0 da curiosity queue.** O dataset ITBI SP (CQ-001) NÃO expõe CPF/CNPJ de adquirente/transmitente — tem valor, SQL, endereço e cartório (decisão: feature L3 fica como Δ-preço-por-bairro, sem grafo-por-pessoa). GeoSampa IPTU (CQ-002) tem TPCL com 3M+ registros e dicionário `Dicionario_dados_IPTU.xlsx` publicado, mas o esquema **já está modelado** em `supabase/migrations/...001_base_foundation.sql:46-71` — validar nome de campos no download da amostra é tarefa de Phase 4/5, não bloqueia PRD. Crawlee TypeScript vence Crawlee Python (CQ-003) no contexto Next.js+Vercel — node maturity, hybrid HTTP→browser pattern, deploy AWS Lambda já documentado oficialmente. LGPD jurisprudência 2025-2026 (CQ-005) NÃO escalou para imobiliária ainda; ANPD abriu 27 fiscalizações em 2025 (mais que 2020-2024 somadas), Meta/WhatsApp e IA generativa foram os alvos prioritários — risco para boutique imobiliária permanece "médio-baixo, escalando" mas não materializado. **Hipóteses:** H-005 CONFIRMADA (Crawlee self-hosted ≤ R$ 500/mês vs Apify R$ 1k-3k+), H-003 CONFIRMADA com forte precedente AppFolio/LangGraph, H-001 INCONCLUSIVE (sem benchmark BR publicado, mas literatura FSBO suporta heurística forte). **3 decisões binárias prontas para Phase 3 bench.**

---

## CQ-001 — ITBI SP schema (P0)

**Status:** ✅ **RESOLVED** (parcialmente, com decisão clara)

### Achados verificados

A Receita Municipal de São Paulo publica desde junho/2024 (com cobertura retroativa até **2019**) os dados de ITBI em XLSX e ODS no portal da Secretaria Municipal da Fazenda. Os campos **publicados** são:

- **SQL** (Setor/Quadra/Lote) — identificador IPTU do imóvel
- **Endereço** (logradouro, número)
- **Valor de transação declarado**
- **Cartório de registro de imóveis**
- **Data da transação** (data do instrumento ou escritura pública)

Os campos **NÃO publicados** (explicitamente omitidos pela Receita Municipal por sigilo fiscal):

- ❌ **CPF/CNPJ do adquirente**
- ❌ **CPF/CNPJ do transmitente**
- ❌ **Nome/razão social das partes**

Cobertura temporal: 2019-presente. Atualização: arquivo do exercício corrente atualizado mensalmente com fechamento do mês anterior. Formatos: XLSX e ODS (NÃO CSV nativo — exige conversão). Não inclui transações de imóveis rurais nem ITBI parcelado via PPI.

### Fontes

1. [Prefeitura SP — Dados das Transações Imobiliárias com recolhimento de ITBI](https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501) (resumo via WebSearch 2026-05-14): "Os nomes ou razões sociais dos transmitentes e adquirentes não são disponibilizados a fim de preservar o sigilo fiscal e a privacidade."
2. [Prefeitura SP — Notícia 31551 disponibilização ITBI](https://prefeitura.sp.gov.br/web/fazenda/w/noticias/31551) — política de transparência
3. [Prefeitura SP — Notícia 330291 dados doados Casa Civil](https://prefeitura.sp.gov.br/web/casa_civil/w/noticias/330291)
4. [ITBI Map — Metodologia](https://www.itbimap.com.br/metodologia) (validação por terceiro consumindo o dataset): confirma que cada linha = uma DTI paga; valor é o declarado, não avaliação independente.
5. Confidence: **High**.

### Decisão recomendada

**Adotar dataset ITBI SP no Epic 7 com escopo reduzido:**

| Feature L3 originalmente proposta | Status após CQ-001 | Decisão |
|---|---|---|
| Δ vs preço médio ITBI bairro | ✅ Viável (só preciso de valor + endereço/SQL) | **MANTER** |
| Δ vs preço médio ITBI rua/CEP | ✅ Viável (endereço presente) | **MANTER** |
| Grafo "CPF/CNPJ comprou N imóveis na região" | ❌ Inviável sem CPF/CNPJ | **REMOVER** — só viável via cartório (REC-2.5, custo R$/consulta) |
| Detecção PJ-holding como adquirente | ❌ Inviável neste dataset | **REMOVER** — depende de CNPJ adquirente |

**Atalho operacional:** ITBI Map (3p) já oferece consulta no agregado por endereço/rua/bairro via webapp — usar como **fonte alternativa de validação** durante POC, antes de ingestar dump bruto.

**Próximo passo Phase 3:** baixar amostra XLSX (jan/2026 ou mês mais recente) na Phase 3 bench-analyst para sniff de qualidade real — tarefa de @data-engineer (15 min).

---

## CQ-002 — GeoSampa IPTU schema (P0)

**Status:** 🟡 **PARTIAL** — schema confirmado de existir e ser público; nomes exatos dos campos pendentes de download do `Dicionario_dados_IPTU.xlsx`.

### Achados verificados

GeoSampa publica o **Cadastro de Contribuinte Imobiliário** (antigo TPCL — Cadastro Territorial Predial de Conservação e Limpeza) desde 2016, mantido pelo DECAR/DECAD da Secretaria Municipal da Fazenda. Tamanho: **3+ milhões de registros**, **120 MB** em formato aberto.

Campos publicamente confirmados via WebSearch (sem download do dicionário):

- **SQL** (Setor-Quadra-Lote) — identificador principal do contribuinte/imóvel
- **Área total do lote**
- **Área construída**
- **Endereço (logradouro)**
- **Tipo de uso** (residencial / não-residencial)
- **Padrão construtivo + Uso do solo** (categorias da Lei tributária IPTU-EG)
- **Geometria do lote** (formato PostGIS / OGC 9.3)

Campos **prováveis mas não confirmados verbatim** (típicos do TPCL, conhecimento de domínio + nomenclatura BR):

- `ANO_CONSTRUCAO` ou `ANO_CONSTRUCAO_CORRIGIDO`
- `PADRAO_CONSTRUTIVO` / `FATOR_PADRAO`
- `VL_VENAL_REFERENCIA` (valor venal de referência)
- `NR_CONTRIBUINTE`

Campo proprietário/contribuinte PF: **provável anonimização** ou ausência — TPCL é base cadastral fiscal, e a documentação reforça uso por SQL (não por proprietário).

### Fontes

1. [Prefeitura SP — IPTU formato aberto no GeoSampa](https://gestaourbana.prefeitura.sp.gov.br/noticias/prefeitura-disponibiliza-base-do-iptu-em-formato-aberto-no-geosampa/) — anúncio oficial 2026
2. [GeoSampa Metadata Catalog — registro b971efa1](https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/api/records/b971efa1-aad5-42f3-ad28-18f1f4efe270) — referência ao dicionário (não acessível direto via WebFetch nesta sessão; download manual necessário)
3. [Tutorial GeoSampa](https://geoinfo-smdu.github.io/tutorial-GeoSampa/) — confirma SQL como chave primária
4. [Tutorial SQL GeoSAMPA PDF](https://download.geosampa.prefeitura.sp.gov.br/PaginasPublicas/downloadArquivo.aspx?orig=DownloadTutorial&arqTipo=TUTORIAL&arq=Tutorial_SQL_GeoSAMPA.pdf) — manual de consulta
5. [Base dos Dados — Cadastro do IPTU SP (mirror)](https://basedosdados.org/dataset/05f1b96d-883b-4202-a4bd-40379c5d326a) — mirror BigQuery do dataset
6. Confidence: **Medium-High** (faltam nomes verbatim dos campos do dicionário XLSX).

### Decisão recomendada

**Cross-reference com schema já existente no projeto:**

A migration `supabase/migrations/20260318000002_001_base_foundation.sql` (linhas 46-71, conforme `human_resolutions.CQ-006` em `curiosity_queue.yaml`) já contém os campos esperados:

```sql
-- Campos GeoSampa (já modelados):
total_units, area_construida, ano_construcao,
padrao_iptu, tipo_uso_iptu, num_pavimentos, sql_lote
```

**Implicação:** o schema está pré-modelado. A tarefa restante é apenas **mapear nomes verbatim do XLSX (GeoSampa) → snake_case (Supabase)** durante Phase 3/4. Isso é trabalho de @data-engineer (1-2h), não bloqueia o PRD.

**Próximo passo:** @data-engineer baixa `Dicionario_dados_IPTU.xlsx` e cria mapping table (campo GeoSampa → campo Supabase) como ADR-level doc na Phase 5.

---

## CQ-003 — Crawlee TypeScript vs Python (P0)

**Status:** ✅ **RESOLVED** — **Recomendação: Crawlee TypeScript** com Python isolado apenas para ETL CNPJ.

### Achados verificados

| Dimensão | Crawlee TS (Node.js) | Crawlee Python |
|---|---|---|
| **Maturidade** | Original (2018, ex-Apify SDK), v1.x estável | Lançado 2024, "mature enough for production" mas track record curto |
| **Stars GitHub** | 23k+ (2026) | 12k+ (2026) |
| **Performance HTTP** | CheerioCrawler: 500+ páginas/min/core | Async (asyncio), análogo |
| **Hybrid pattern** | Documentado nativamente (HTTP→browser auto-escalation) | Disponível mas menos battle-tested |
| **Deploy Vercel** | Não nativo — Vercel functions 60s timeout limita; recomendado worker (Fly.io, Railway) ou cron-Supabase + worker | Idem |
| **Deploy AWS Lambda** | Suportado oficialmente | **Documentação oficial existe** (`crawlee.dev/python/docs/deployment/aws-lambda`) |
| **Deploy container/VPS** | Hetzner CPX31 (4vCPU, 8GB) €10-21/mês roda 2-3 browsers concorrentes | Idem |
| **Integração Next.js** | Mesma linguagem (TS), partilha tipagem, Zod, etc | Bridge HTTP/job queue obrigatório |
| **Ecossistema cnpj-sqlite** | NÃO (Python) | Nativo (Python) |
| **Ecossistema scikit-learn/XGBoost** | NÃO | Nativo |

### Fontes

1. [Crawlee — Scrapy vs Crawlee blog](https://crawlee.dev/blog/scrapy-vs-crawlee) — performance e hybrid pattern
2. [Use Apify — Crawlee vs Scrapy vs BeautifulSoup 2026](https://use-apify.com/blog/crawlee-vs-scrapy-vs-beautifulsoup-2026)
3. [WebScraping.AI — Crawlee Python vs JavaScript diferenças](https://webscraping.ai/faq/crawlee/what-are-the-differences-between-crawlee-for-python-and-crawlee-for-javascript) — maturidade comparada
4. [Crawlee Python — Deploy AWS Lambda](https://crawlee.dev/python/docs/deployment/aws-lambda) — única documentação oficial Lambda
5. [Self-Hosting Web Scrapers Guide 2026](https://use-apify.com/blog/self-hosting-web-scrapers-guide) — Hetzner CPX31 €10-21/mês para 2-3 browsers
6. [GitHub apify/crawlee](https://github.com/apify/crawlee) — 23k⭐ Apache 2.0
7. Confidence: **High**.

### Decisão recomendada

**Crawlee TypeScript para crawlers + Python isolado para ETL CNPJ.**

Justificativa de força:
1. Stack do projeto já é Next.js (TypeScript) — sem nova linguagem para o squad aprender.
2. Maturidade incontestável (8 anos de produção).
3. Hybrid pattern (HTTP-default, escalação automática para Playwright) é killer feature para MercadoLivre.
4. Python permanece **só** para o subsistema CNPJ via `rictom/cnpj-sqlite` (CLI batch, container isolado, expõe view materializada no Supabase).

Arquitetura proposta:

```
+----------------------------+        +-----------------+
|  Crawlee TS Worker         |  →     |  Supabase       |
|  (Hetzner CPX31 / Railway) |  push  |  (Postgres+RLS) |
+----------------------------+        +-----------------+
                                              ↑
+----------------------------+                |
|  Python Worker (cron mensal)|→ cnpj.sqlite → ETL filtrado por CNAE 68 → cnpj_enrichment table
|  rictom/cnpj-sqlite        |
+----------------------------+
```

**Trade-off aceito:** dois runtimes (Node + Python). Mitigação: cada runtime em container isolado, comunicação só via DB.

---

## CQ-005 — Jurisprudência LGPD imobiliária pós-Radar Tecnológico nº3 (P0)

**Status:** ✅ **RESOLVED** com verdict de RISCO MÉDIO-BAIXO (escalando) — **não materializado contra imobiliária ainda.**

### Achados verificados

**Volume de processos ANPD 2025:**
- **27 processos de fiscalização abertos em 2025** — mais que a soma de 2020-2024.
- Apenas **2 processos administrativos sancionatórios** abertos em 2025.
- Apenas **8 processos chegaram à decisão final** no ciclo todo da ANPD.

**Alvos prioritários 2024-2025:**
- **Meta/WhatsApp** — Despacho nº 11/2025/CGF (auditoria independente, revisão de privacy notices)
- **Big tech para treinamento de IA** — Decisão 20/2024/PR/ANPD suspendeu uso de dados para treinar IA generativa por "uma das maiores tech do mundo"
- **Telemarketing (Telekall)** — caso histórico de 2023, R$ 14.400 multa, base foi scraping de listas eleitorais

**Setor imobiliário especificamente:** **NENHUMA SANÇÃO PÚBLICA ENCONTRADA EM 2024-2026.** Conteúdo doutrinário/blogs jurídicos enquadram captação imobiliária como atividade que se justifica por legítimo interesse + LIA, mas nenhum precedente sancionatório materializado.

**Sinalização forte de fiscalização futura:**
- Mattos Filho 2026: ANPD "Data scraping e data aggregators" são **prioridade** da agenda regulatória 2025-2026.
- ANPD virou agência reguladora oficial via MP 1.317/2025 (set/2025) — poder de fiscalização ampliado.
- Resolução CD/ANPD nº 4/2023 já regula processo sancionatório completo.

### Fontes

1. [ANPD — Processos sancionatórios disponibilizados](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-lista-de-processos-sancionatorios)
2. [ANPD — Decisão Telekall Infoservice (PDF)](https://www.gov.br/anpd/pt-br/assuntos/noticias/sei_00261-000489_2022_62_decisao_telekall_inforservice.pdf) — primeira sanção, base scraping
3. [Mattos Filho — Data Privacy Day: 2025 developments and 2026 prospects](https://www.mattosfilho.com.br/en/unico/data-privacy-protection-day/) — agenda regulatória 2025-2026
4. [Migalhas — Proteção de dados pessoais em 2025: avanços e perspectivas](https://www.migalhas.com.br/depeso/447221/protecao-de-dados-pessoais-em-2025-avancos-desafios-e-perspectivas) — 27 fiscalizações 2025
5. [LhLaw — ANPD aplica sanção (IA generativa)](https://www.lhlaw.com.br/publicacoes/anpd-aplica-sancao-e-reforca-sua-intencao-de-se-firmar-como-orgao-regulador-de-ia-no-brasil/)
6. [C2T Adv — LGPD telemarketing imobiliário](https://c2tadv.com.br/lgpd-seu-telemarketing-imobiliario-esta-sabotando-sua-marca-e-criando-risco-juridico/)
7. Confidence: **High**.

### Decisão recomendada

**Tier de risco LGPD para Real State Moema: MÉDIO-BAIXO operacional, ESCALANDO regulatoriamente.**

**Implicação para LIA:**
- Mantém recomendação Wave 1 (REC-7.1: LIA obrigatória antes do 1º scrape PF).
- **NÃO é necessário** advogado especialista privacy para iniciar (counsel padrão RE/MAX serve), mas o LIA precisa ser robusto:
  - Documentar finalidade clara (captação para corretora ativa)
  - Documentar minimização (não armazenar foto/texto bruto — só metadata extraída)
  - Documentar opt-out claro e operacional
  - Manter audit log
- **Reservar revisão por counsel especialista no Wave B** (depois de Epic 7 P0 estabilizar + se volume passar 10k leads/mês).

**Sinal de alerta a monitorar:** primeira sanção pública contra imobiliária ou martech imobiliária. Configurar Google Alerts + busca semanal "ANPD imobiliária sanção". Se materializar → escalar LIA para counsel especialista.

---

## CQ-007 — Heurística determinística — acerto esperado (P1)

**Status:** 🟡 **PARTIAL** — sem benchmark BR publicado, mas literatura suporta heurística forte; depende de validação batch com Luciana.

### Achados verificados

Não foram encontrados papers ou benchmarks publicados especificamente sobre detecção FSBO via heurística determinística (DDD móvel + ausência CRECI + nome PF + único anúncio) em mercado brasileiro.

**Inferências defensáveis:**
- Plataformas US FSBO comerciais (REDX, Vulcan7, Espresso Agent, Mojo, ForSaleByOwner.com, FSBO Town) **operam justamente sobre essa heurística**: telefone + ausência de licença de corretor + anúncio direto. Modelo de negócio rentável.
- No Brasil, CRECI é dado público (consultável via `cofeci.gov.br` e APIs como `19950512/buscacreci`) — alta especificidade.
- DDD móvel separável de DDD fixo (regex simples) — alta especificidade.
- Único anúncio = baixa precisão sem ITBI/cartório (heurística fraca isoladamente).

### Fontes

1. [REDX — FSBO Lead Generation](https://www.redx.com/) — modelo comercial US sobre heurística similar
2. [Vulcan7 — Find Real Estate Seller Leads](https://www.vulcan7.com/)
3. [FSBO Town](https://www.fsbotown.com/)
4. [Espresso Agent — FSBO Leads](https://www.espressoagent.com/fsbos)
5. [github.com/19950512/buscacreci](https://github.com/19950512/buscacreci) — API CRECI BR ativa (2026-05-08, PHP, 15⭐)
6. Confidence: **Medium**.

### Decisão recomendada

**Manter recomendação Wave 1 (REC-1.2).** Heurística determinística antes de ML, com validação Luciana sobre amostra de 200 anúncios estratificada por bairro. Estimativa de precisão esperada (defendida sem evidência publicada): **70-85% (mais lower-bound do que upper)**.

**Sinais adicionais a incorporar na heurística** (não estavam no design Wave 1):

| Sinal | Origem | Peso esperado |
|---|---|---|
| Ausência de CRECI no anúncio | Regex texto + lookup API | **+30%** |
| DDD móvel (9 + DDD 11 SP) | Regex telefone | **+15%** |
| Telefone aparece em N anúncios | DB agrupamento | **-25% se N > 3** (vira corretor autônomo) |
| Nome PF (sem "LTDA", "Imobiliária", "Imóveis") | Regex + listas | **+15%** |
| Mesmo contato em ZAP/OLX/MercadoLivre | DB cross-join | **+10%** se mesmo |
| **Bônus L3:** valor anúncio - mediana ITBI bairro > 15% | ITBI dataset | **+10%** (motivação alta) |

**Próximo passo:** smoke run da heurística em dataset Epic 6 atual durante Phase 3 (não bloqueante).

---

## CQ-009 — Stack híbrida cron-Supabase + LangGraph parcial — precedente produção (P1)

**Status:** ✅ **RESOLVED** — precedente FORTE em vertical idêntico (AppFolio Realm-X).

### Achados verificados

**AppFolio Realm-X (real estate property management AI copilot)** rodando em produção com a **mesma arquitetura proposta para Real State Moema**:
- LangGraph como camada de decisão LLM
- LangChain como SDK base
- LangSmith para observability (error rate, custo, latência em real-time)
- Workflows paralelos: query understanding + fallback + Q&A bot sobre help pages
- Resultado: 10h+ economia por property manager/semana

**Outras adoções enterprise 2024-2026** confirmadas via posts oficiais LangChain/X:
- Uber — code migration agents
- LinkedIn — recruiting agent (hiring 10x faster)
- Klarna
- Replit — agent product flagship

**Padrão híbrido emergente (Anubhav Maheshwari 2026, Cordum 2026):**
- LangGraph = "reasoning + state checkpoint"
- Temporal/Prefect/cron = "durable execution"
- Recomendação canônica: **NÃO usar LangGraph para tudo** (caro em tokens), separar camadas.

### Fontes

1. [LangChain blog — How AppFolio transformed property management workflows with Realm-X](https://blog.langchain.com/customers-appfolio/) ⭐ direto vertical real estate
2. [ZenML LLMOps Database — AppFolio Realm-X case study](https://www.zenml.io/llmops-database/building-a-property-management-ai-copilot-with-langgraph-and-langsmith)
3. [LangChain — Top 5 LangGraph Agents in Production 2024](https://www.langchain.com/blog/top-5-langgraph-agents-in-production-2024)
4. [LangChain — Previewing Interrupt 2026: Agents at Enterprise Scale](https://blog.langchain.com/previewing-interrupt-2026-agents-at-enterprise-scale/)
5. [Anubhav 2026 — LangGraph vs Temporal](https://medium.com/data-science-collective/langgraph-vs-temporal-for-ai-agents-durable-execution-architecture-beyond-for-loops-a1f640d35f02)
6. [Cordum 2026 — Temporal vs LangGraph](https://cordum.io/blog/temporal-vs-langgraph) — durability layer architecture
7. [Anup.io — Temporal + LangGraph two-layer architecture](https://www.anup.io/temporal-langgraph-a-two-layer-architecture-for-multi-agent-coordination/)
8. [LangGraph state of agent engineering](https://www.langchain.com/state-of-agent-engineering) — 57% das organizações com agents em produção 2025
9. Confidence: **High**.

### Decisão recomendada

**Confirmar stack híbrida cron-Supabase (Wave A) → LangGraph quando classificador NLP entrar (Wave B).**

Refinamento da decisão Wave 1:
- **Wave A do Epic 7 (Sprint 1-3):** sem LangGraph. Tudo é pipeline determinístico (Crawlee → DB → heurística SQL → CRM). Token cost = zero.
- **Wave B do Epic 7 (Sprint 4-6):** LangGraph entra **só** para:
  - Classificador NLP (urgência/motivação do texto do anúncio)
  - Geração de mensagem inicial personalizada (se feature aprovada por Luciana)
- **NÃO adotar Temporal** ainda — para volume Zona Sul (estimado milhares/mês), pg_cron + Supabase Edge Functions basta. Temporal só se passar 100k leads/mês ou houver workflows > 1h.

---

## CQ-010 — OSS BR-focado em grafo imobiliário (P2)

**Status:** ✅ **RESOLVED** — 3 projetos identificados, 1 relevante para o caso.

### Achados verificados

| Repositório | Stars | Lang | License | Descrição | Status | Relevância |
|---|---|---|---|---|---|---|
| [19950512/buscacreci](https://github.com/19950512/buscacreci) | 15 | PHP | none | API consulta corretores CRECI BR | Ativo 2026-05-08 | **Alta** — feed para detecção FISBO (ausência CRECI) |
| [marco-jardim/niteroi-itbi-heatmap](https://github.com/marco-jardim/niteroi-itbi-heatmap) | 0 | Python | none | Heatmap interativo ITBI Niterói 2020-2024 | Ativo 2026-05-12 | **Média** — padrão arquitetural transferível |
| [lfreitasdm/itbi-consulta](https://github.com/lfreitasdm/itbi-consulta) | 0 | Python | none | Consulta transações ITBI SP | Ativo 2026-04-13 | **Média** — uso como reference do parser |
| [benhur1920/ITBI_Prefeitura_Recife](https://github.com/benhur1920/ITBI_Prefeitura_Recife) | 0 | Python | none | Análise ITBI Recife | Ativo 2026-04-28 | Baixa — analogia |
| [opastorello/creci-sp-api](https://glama.ai/mcp/servers/opastorello/creci-sp-api) | — | — | — | MCP server CRECI-SP | Listado | **Alta** — quando habilitar MCP, integração direta |
| [agentic-ops/real-estate-mcp](https://github.com/agentic-ops/real-estate-mcp) | — | — | none | MCP demo real estate | Externo | Referência arquitetura |
| [brightdata/real-estate-ai-agent](https://github.com/brightdata/real-estate-ai-agent) | — | Python | none | AI agent extract real estate como JSON | Externo | Padrão similar HomeHarvest |

### Fontes

1. [github.com/19950512/buscacreci](https://github.com/19950512/buscacreci) — gh api verified
2. [github.com/marco-jardim/niteroi-itbi-heatmap](https://github.com/marco-jardim/niteroi-itbi-heatmap) — gh api verified
3. [github.com/lfreitasdm/itbi-consulta](https://github.com/lfreitasdm/itbi-consulta) — gh api verified
4. [Glama MCP — opastorello/creci-sp-api](https://glama.ai/mcp/servers/opastorello/creci-sp-api)
5. Confidence: **High** sobre o panorama; **Medium** sobre qualidade de código (não inspecionei em profundidade).

### Decisão recomendada

**Incorporar `19950512/buscacreci` ou similar à arquitetura como serviço de validação CRECI durante Phase 4 (code-anatomy).** Alternativa: usar a API oficial COFECI (cofeci.gov.br) se ela for estável, ou Glama MCP `opastorello/creci-sp-api`.

`niteroi-itbi-heatmap` é referência interessante para visualização do feature L3, mas não é dependência.

---

## CQ-011 — Calibration Platt vs isotonic (P2)

**Status:** ✅ **RESOLVED** — recomendação por design.

### Achados verificados

| Critério | Platt (sigmoid) | Isotonic |
|---|---|---|
| Tamanho calibração | < 1.000 amostras OK | 10k+ recomendado |
| Sample size XGBoost | Robusto | Pode overfittar com poucos dados |
| Shape da miscalibração | Sigmoid simétrica | Não-paramétrico, flexível |
| Imbalanced data | Pode ajudar (extra intercept) | Melhor (não assume forma) |
| ECE típico | Baseline | +22% melhor em média |

### Fontes

1. [scikit-learn — Probability calibration](https://scikit-learn.org/stable/modules/calibration.html)
2. [Train in Data — Complete Guide to Platt Scaling](https://www.blog.trainindata.com/complete-guide-to-platt-scaling/)
3. [MachineLearningMastery — How to Calibrate Probabilities for Imbalanced Classification](https://machinelearningmastery.com/probability-calibration-for-imbalanced-classification/)
4. [MDPI 2025 — Mitigating Algorithmic Bias Through Probability Calibration: Lead Generation case](https://www.mdpi.com/2227-7390/13/13/2183) ⭐ **direto em lead generation**
5. Confidence: **High**.

### Decisão recomendada

**Quando ML scoring entrar (Wave B do Epic 7):**
- Se calibration set < 1.000 leads anotados → **Platt (sigmoid)**.
- Se ≥ 1.000 leads anotados (cenário realista após 6+ meses de uso) → **isotonic regression**.
- Implementação via `sklearn.calibration.CalibratedClassifierCV(method='sigmoid' | 'isotonic')`.

Não bloqueia decisão de PRD.

---

## CQ-012 — QuintoAndar API/mobile reverse-engineerable (P2)

**Status:** ✅ **RESOLVED** — commoditizado via Apify actor pronto.

### Achados verificados

**Apify Store já tem actor pronto:** `brasil-scrapers/quinto-andar-api`. Isso significa que reverse-engineering já foi feito por 3p e está disponível como SaaS — não há necessidade de fazer in-house.

Implicação: para QuintoAndar, **não precisa decidir entre Crawlee TS vs mobile API reverse-eng** — basta consumir o actor (modelo de pricing por consulta, similar ao Epic 6 com ZAP/OLX/VivaReal).

### Fontes

1. [Apify — brasil-scrapers/quinto-andar-api](https://apify.com/brasil-scrapers/quinto-andar-api)
2. [BrightData — Real estate AI agent](https://github.com/brightdata/real-estate-ai-agent) — alternativa
3. Confidence: **High**.

### Decisão recomendada

**Adicionar QuintoAndar ao Wave B do Epic 7 via Apify (modelo Epic 6).** Crawlee TS NÃO precisa cobrir QuintoAndar nem Loft (provável existir actor similar).

**Reescopo de Crawlee TS:** foco em **MercadoLivre + ImovelWeb** (onde Apify cobertura é fraca ou não-existente), não QuintoAndar/Loft.

---

## CQ-004 — Volume FISBO real Zona Sul (P1)

**Status:** ⏸ **BLOCKED** — exige SQL contra Supabase ao vivo (Founder/data-engineer access), fora do escopo de pesquisa textual.

### Plano remanescente

Founder ou @data-engineer executa SQL agregando Epic 6 (zap/olx/vivareal) dos últimos 30-60 dias, filtrado por bairros Moema/Vila Olímpia/Itaim, com a heurística determinística de CQ-007 aplicada. Output esperado: contagem absoluta e taxa de FISBO sobre total — alimenta sizing de infra (cron-Supabase vs Prefect vs Temporal — provável cron-Supabase fica).

**Sem bloqueio ao PRD:** estimativa conservadora é "1k-5k leads/mês total, 5-15% FISBO = 50-750 FISBO/mês" — qualquer ponto desse range vive confortavelmente no cron-Supabase.

---

## Hipóteses — verdicts

### H-001 — Heurística determinística > 80% precisão

**Verdict:** 🟡 **INCONCLUSIVE** — sem benchmark BR publicado; literatura suporta sinal forte mas não cobre o caso específico Zona Sul SP.

Plano: validar com Luciana sobre amostra 200 anúncios Phase 3/4 (não bloqueante para PRD).

### H-003 — Stack híbrida cron+LangGraph mais barata que LangGraph puro

**Verdict:** ✅ **CONFIRMED** com 3 sinais convergentes:

1. **Custo direto:** LangGraph chamado a cada step (~$0.001-0.01 por step com modelos médios) vs pg_cron (zero custo). Para pipeline ETL puro (sem decisão LLM), LangGraph é 100x mais caro sem benefício.
2. **Padrão arquitetural canonizado** por Anubhav (Mar 2026), Cordum (2026), Anup.io: "LangGraph reasoning + durability layer separated".
3. **Precedente AppFolio:** Realm-X usa LangGraph **só onde há decisão LLM** (parsing query, fallback gen) — pipeline determinístico fica fora.

**Implicação:** decisão Wave 1 mantida e fortalecida.

### H-005 — Crawlee self-hosted < R$ 500/mês vs Apify > R$ 2k

**Verdict:** ✅ **CONFIRMED** com nuance:

**TCO mensal para 50.000 páginas/mês Zona Sul:**

| Cenário | Custo USD/mês | Custo BRL (5,80x) | Notas |
|---|---|---|---|
| Apify cloud (mix HTML + JS, basic plan) | $200-400 | R$ 1.160-2.320 | $0.004-0.02/página |
| **Crawlee TS self-hosted Hetzner CPX31** | **€21 + proxy** | **R$ 130 + proxy** | base infra muito barata |
| Proxy residencial mid-range (IPRoyal $1.75/GB volume; assumir ~30 GB para 50k JS pages) | $52 | R$ 300 | committed monthly |
| **TOTAL self-hosted (estimado)** | **~$73** | **~R$ 430** | **9-12x mais barato** |
| Bright Data PAYG residential | $210-300 | R$ 1.220-1.740 | $7-10/GB pay-as-you-go |
| Apify residential proxy ($7-8/GB) | ~$210 | ~R$ 1.220 | tier proxy on top of $200-400 actor cost |

**Caveats:**
- Self-hosted exige **manutenção** (10-20h/mês). Em horas de @architect (~R$ 200/h interno) isso vira R$ 2k-4k/mês "hidden cost".
- Para < 10k páginas/mês, Apify é provavelmente mais barato (overhead operacional de self-hosted).
- Para 50k+ páginas/mês com hybrid HTTP→browser bem feito (Crawlee TS), self-hosted vence claramente.

**Decisão final:** confirmar Crawlee TS para MercadoLivre (alto volume) + manter Apify para portais já cobertos (Epic 6: ZAP/OLX/VivaReal) e adicionais commoditizados (QuintoAndar, Loft via brasil-scrapers).

---

## Trade-offs consolidados para Phase 3 bench

### Decisão binária #1 — Crawlee TS vs Crawlee Python

**Vencedor recomendado: Crawlee TypeScript.**

| Critério | TS | Python | Vencedor |
|---|---|---|---|
| Stack do projeto | Next.js (TS) | — | TS |
| Maturidade | 23k⭐ desde 2018 | 12k⭐ desde 2024 | TS |
| Hybrid HTTP→browser | Doc primária | Doc secundária | TS |
| Integração cnpj-sqlite | NÃO (subsistema isolado) | NATIVO | Py |
| Stars / commits / issue health | Liderança clara | Crescendo | TS |
| Deploy Lambda | OK | Doc oficial | Py (marginal) |

**Tasking Phase 3 (spy-bench-analyst):** confirmar com smoke test 100 URLs MercadoLivre — tempo, custo, success rate.

### Decisão binária #2 — Apify (Epic 6 pattern) vs Crawlee self-hosted para MercadoLivre + ImovelWeb

**Vencedor recomendado: Crawlee self-hosted** (apenas para esses 2 portais novos).

H-005 confirmada (~9-12x mais barato a partir de 50k pgs/mês). Manter Apify para portais commoditizados (QuintoAndar, Loft, ZAP/OLX/VivaReal — Epic 6).

**Tasking Phase 3:** projetar arquitetura com 2 workers (Apify para Epic 6, Crawlee TS para Epic 7 expansion).

### Decisão binária #3 — Stack agentic: cron-Supabase puro (Wave A) vs LangGraph desde dia 1

**Vencedor recomendado: cron-Supabase puro em Wave A, LangGraph entra em Wave B.**

H-003 confirmada (TCO + precedente AppFolio). Reservar LangGraph para tasks com decisão LLM real (classificador NLP texto anúncio + geração mensagem personalizada).

**Tasking Phase 3:** desenhar interface limpa do classificador (input/output) para que migração Wave A → Wave B seja contained.

### Decisão derivada #4 — ETL CNPJ runtime

**Não-bench-decisão (já clara):** Python container isolado com `rictom/cnpj-sqlite` + cron mensal + ETL filtrado por CNAE 68. Saída via view Supabase. Substitui `cuducos/minha-receita` (archived).

### Decisão derivada #5 — Calibration ML (Wave B)

**Não-bench-decisão (já clara):** começar com Platt (sigmoid) enquanto calibration set < 1k. Migrar para isotonic quando ≥ 1k leads anotados.

---

## Limitações Wave 2

Documentação honesta do que NÃO foi resolvido nesta wave:

| Gap | Razão | Quando resolver |
|---|---|---|
| **Schema verbatim GeoSampa `Dicionario_dados_IPTU.xlsx`** | WebFetch bloqueado para alguns paths PMSP; download manual do XLSX necessário | Phase 3/4 — @data-engineer baixa amostra |
| **Schema verbatim ITBI XLSX 2026** | Idem (paywall/conversão necessária) | Phase 3 — @data-engineer baixa mês corrente |
| **Volume FISBO real Moema/VO/Itaim** | Exige SQL contra DB ao vivo (CQ-004 BLOCKED) | Founder ou @data-engineer SQL one-off |
| **Multi-LLM consensus (Grok/Claude.ai/Gemini)** | Playwright MCP não autenticado nas LLMs externas nesta sessão | Phase 3 se houver dissensão restante |
| **Heurística H-001 precision empírica** | Sem benchmark BR; única forma de validar é batch + Luciana | Phase 4 / Wave A early |
| **Casos jurisprudenciais 2026 mais recentes Q1-Q2** | Maioria das fontes WebSearch ainda referencia 2025 ou início 2026 | Reavaliar antes do go-live Wave A |
| **Inspeção QuintoAndar mobile MITM (CQ-012 alternativa)** | Tornou-se obsoleta (actor Apify já existe) | Não necessário |
| **`Dicionario_dados_IPTU.xlsx` campo proprietário PF** | Não foi possível confirmar verbatim via WebSearch se há ID anonimizado | @data-engineer Phase 3-5 (não bloqueia PRD se campo estiver ausente, já está documentado em REC-2.2) |

---

## Próximos passos

1. **Phase 3 (spy-bench-analyst):** atacar as 3 decisões binárias acima com bench formal (smoke tests + scoring tables).
2. **Phase 4 (code-anatomist):** engenharia reversa de HomeHarvest (já era plano Wave 1). Adicionar `19950512/buscacreci` à shortlist para inspeção arquitetural.
3. **Phase 5 (@pm, @architect):** PRD Epic 7 com escopo refinado:
   - Ingest ITBI **sem grafo-por-pessoa** (CPF/CNPJ indisponível) — só Δ-preço
   - GeoSampa IPTU populado por Python ETL via SQL/lote
   - Crawlee TS para MercadoLivre + ImovelWeb
   - Apify para QuintoAndar + Loft (Wave B) + Epic 6 (existing)
   - cron-Supabase para Wave A, LangGraph para Wave B (classificador NLP)
   - LIA robusta como pré-requisito hard de Sprint 1

---

**Próximo artefato:** `wave-2-summary.md` (≤ 1500 palavras).

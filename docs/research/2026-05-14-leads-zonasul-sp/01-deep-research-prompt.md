# Deep Research Prompt — Captação Leads Imobiliários Zona Sul SP

**Generated:** 2026-05-14
**Pipeline:** tech-research v3.2 (ultrathink em decompose)
**Waves planejadas:** 1 (Discovery) + 1 (Validation, --deep)
**Output dir:** `docs/research/2026-05-14-leads-zonasul-sp/`

---

## Query original (consolidada)

> Como construir uma feature de captação automatizada de leads imobiliários para a Zona Sul de São Paulo (Moema, Vila Olímpia, Itaim Bibi) — com foco prioritário em FISBO (For Sale By Owner) mas não excludente de anúncios de terceiros — usando **prioritariamente open source** e dados públicos. A feature deve ser integrável a um CRM Next.js + Supabase + Mapbox existente (Real State Moema, PRD v2.0, Epic 6 já implementado para zap/olx/vivareal via Apify), e produzir leads tipificados, enriquecidos, escorados e geo-segmentados por área circunscrita (círculos concêntricos 500m/1km/2km a partir da Rua Alvorada).

---

## Inferred context (Phase 0 Auto-Clarify)

| Atributo | Valor |
|---|---|
| Research focus | **Technical** (ferramentas, arquitetura, código) + **Comparison** (open source candidates) |
| Temporal intent | **Recente** (2025-2026 — dados Receita atualizados, projetos GitHub last 18 months) |
| Domínio | Real estate technology, lead generation, web scraping, government open data BR, ML for scoring |
| Geografia foco | Brasil (São Paulo capital), com referências internacionais quando aplicável |
| Audience | Founder técnico + PM/Architect/Dev squad (AIOX) |

---

## Decomposition — 7 sub-queries (ultrathink)

### SQ-1 — Tipologia + Segmentação de Leads Imobiliários

**Objetivo:** Mapear categorias de anunciantes (FISBO, imobiliária, construtora, administradora, PJ/holding), heurísticas de detecção automática, e mecanismos de captação além dos atuais.

**Termos-chave:** FSBO detection, real estate seller classification, anunciante imobiliário tipologia, lead segmentation real estate, FSBO vs broker listings, owner-listed properties Brazil

**Fontes preferenciais:** papers academic (SSRN, ResearchGate), blogs especializados, dados de mercado BR (Secovi-SP, ABRAINC)

**Devil's advocate:** "Por que segmentar FISBO se a abordagem comercial pode ser igual para qualquer tipo de lead?"

---

### SQ-2 — ETL Receita Federal + Bases CNPJ + Bases Públicas SP

**Objetivo:** Inventariar bases públicas open source para enriquecimento de leads — CNPJ atualizado, IPTU, ITBI, cartórios de registro de imóveis SP.

**Termos-chave:** Receita Federal CNPJ dump, rede CNPJ open source, dados.gov.br imóveis, IPTU São Paulo open data, ITBI prefeitura SP, GeoSampa API, cartório registro imóveis SP API, Brasil.IO CNPJ

**Fontes preferenciais:** docs oficiais (gov.br, prefeitura.sp.gov.br), repos GitHub (cuducos/brasilio, etc.), comunidades dados abertos BR

**Critério de avaliação:** frequência de atualização, formato, ToS, licença, facilidade de ingestão.

---

### SQ-3 — Scraping Ético Ampliado + Anti-bot para Portais BR

**Objetivo:** Estratégias de scraping ético e robusto para portais além dos atuais (MercadoLivre, Facebook Marketplace, ImovelWeb, QuintoAndar, Loft, grupos WhatsApp/Telegram públicos), incluindo defesas anti-bot.

**Termos-chave:** ethical web scraping real estate, anti-bot bypass 2026, residential proxy, Playwright stealth, Apify alternatives open source, Crawlee, Scrapy real estate, robots.txt compliance, facebook marketplace scraping, WhatsApp public groups scraping, Telegram channels scraping legal

**Fontes preferenciais:** docs Crawlee, Playwright, Apify; blogs (ScrapeOps, ScrapingBee — para benchmarks), discussions GitHub.

**Devil's advocate:** "Quando scraping deixa de ser ético e vira violação de ToS / LGPD?"

---

### SQ-4 — Top Open Source GitHub para Real Estate Lead Generation (last 18 months)

**Objetivo:** Identificar os 5-10 projetos open source mais relevantes, ativos e adequados ao caso de uso BR.

**Critérios:** stars > 100, último commit < 6 meses, license permissiva (MIT/Apache/BSD), documentação > "Hello World", fit Brasil (mesmo que precise localização).

**Termos-chave:** real estate scraper GitHub, lead generation pipeline open source, property listing aggregator open source, FSBO finder GitHub, real estate ETL pipeline open source, awesome-real-estate, awesome-leadgen

**Categorias a cobrir:**
- Scrapers/aggregators
- Pipelines ETL
- Frameworks de enrichment
- Dashboards/visualizadores
- Frameworks de scoring/qualificação

**Expert-level:** projetos com arquitetura multi-agente ou que usem LangGraph/CrewAI/AutoGen.

---

### SQ-5 — Arquitetura LangGraph (ou alternativa) para Pipeline Multi-source

**Objetivo:** Avaliar LangGraph como espinha dorsal de orquestração de agentes para coleta multi-fonte, deduplicação, enriquecimento e scoring — e comparar com alternativas (CrewAI, AutoGen, LlamaIndex Workflows, Temporal, Prefect, Dagster, raw async Python).

**Termos-chave:** LangGraph multi-agent pipeline, LangGraph vs CrewAI vs AutoGen, real estate data pipeline orchestration, agentic workflow lead generation, LangGraph production cases, durable execution agents

**Fontes preferenciais:** docs LangChain/LangGraph oficial, papers, casos de produção (Replit, Klarna, etc.)

**Devil's advocate:** "LangGraph é overkill para um pipeline ETL determinístico? Quando NÃO usar agentes?"

---

### SQ-6 — Lead Scoring Imobiliário FISBO

**Objetivo:** Definir features candidatas, abordagens (heurística simples → ML supervisionado → híbrido), validação cruzada com baseline humano.

**Features candidatas a investigar:**
- Tempo de anúncio (proxy de motivação)
- Histórico de reanúncios
- Variação de preço
- Qualidade de fotos
- Texto do anúncio (NLP — urgência, motivação)
- Localização (raio, densidade de concorrência)
- Perfil do anunciante (FISBO vs PJ)
- Sinais externos (CNPJ ativo, holding, idade média do proprietário)

**Termos-chave:** real estate lead scoring ML, FSBO lead qualification, property listing NLP features, motivated seller signals, lead scoring open source python

**Expert-level:** modelos de uplift, calibração de propensity scores.

---

### SQ-7 — LGPD Compliance para Captação + Enriquecimento de Dados de Proprietários

**Objetivo:** Nota documentada (não bloqueante) sobre base legal, riscos e mitigações.

**Tópicos a cobrir:**
- Base legal aplicável (legítimo interesse vs consentimento)
- Dados pessoais vs dados públicos (anúncio público = dado público?)
- Enriquecimento via CNPJ (PJ vs PF — limites)
- Direito ao esquecimento e opt-out
- Compartilhamento entre consultores (referrals cruzados FR-017)
- Casos jurisprudenciais BR relevantes (ANPD, MPF)
- Sanções e precedentes (Serasa, etc.)

**Termos-chave:** LGPD captação leads imobiliário, LGPD scraping legalidade, ANPD legítimo interesse, LGPD enriquecimento dados, real estate LGPD compliance Brasil

**Fontes preferenciais:** ANPD oficial, jurisprudência STJ/STF, papers JOTA/Conjur, livros LGPD (Bruno Bioni, Danilo Doneda).

---

## Output expectations

A pesquisa deve produzir, na pasta `docs/research/2026-05-14-leads-zonasul-sp/`:

1. `02-research-report.md` — Findings completos com seções por sub-query, citações inline (URL + data), confidence tags (High/Medium/Low)
2. `03-recommendations.md` — Recomendações priorizadas (P0/P1/P2), SEM código de produção
3. `wave-1-summary.md` — Compressão da wave 1 (memória ponte para wave 2)
4. `curiosity_queue.yaml` — Perguntas em aberto + lacunas de alto valor
5. `evolving_report.md` — Estado markoviano da pesquisa

E na wave 2 (`--deep`):

6. `04-validation-multi-llm.md` — Multi-LLM consensus (Grok + Claude.ai + Gemini) sobre top candidates da wave 1

---

## Coverage requirements

| Dimensão | Mínimo |
|---|---|
| Sub-queries cobertas | 7/7 |
| Fontes citadas | ≥ 20 com URL + data |
| Confidence tags | 100% das afirmações importantes |
| Open source candidates avaliados | ≥ 5 |
| Bases públicas avaliadas | ≥ 4 |
| Devil's advocate respondido | em SQ-1, SQ-3, SQ-5 |
| Coverage score Phase 3.5 | ≥ 70% para parar wave 1 |

---

## Stopping criteria (Phase 3.5)

Parar wave 1 quando coverage ≥ 70% E no mínimo 3 candidatos open source identificados E nota LGPD presente.
Disparar wave 2 (--deep) SEMPRE para validação multi-LLM, independente da coverage.

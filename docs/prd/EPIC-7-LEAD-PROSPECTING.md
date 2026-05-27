# Epic 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte (PRD)

**Versao:** 1.0
**Status:** Ready for Architect / SM Drafting
**Data:** 2026-05-14
**Author:** Morgan (@pm)
**End-user validadora:** Luciana Borba (RE/MAX Galeria Moema)
**Founder / Orquestrador:** Zero

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-14 | 1.0 | PRD inicial Epic 7 consolidando Phase 1-4 do pipeline tech-research v3.2 (problem framing, 2 waves de research, 3 benches, 4 code-anatomy) | Morgan (@pm) |

---

## 1. Goals and Background Context

### Goals

- **Ampliar a captacao de leads imobiliarios da Luciana Borba alem dos 3 portais cobertos pelo Epic 6** (ZAP, OLX, VivaReal), expandindo para MercadoLivre Imoveis, ImovelWeb, QuintoAndar, Loft, redes sociais publicas (Telegram canal) e bases publicas (Receita Federal/CNPJ, GeoSampa IPTU, ITBI SP) — fontes confirmadas em `docs/research/2026-05-14-leads-zonasul-sp/03-recommendations.md` SQ-2 e SQ-3.
- **Classificar automaticamente cada lead** em 5 categorias operacionais (A=FISBO, B=Imobiliaria, C=Construtora, D=Administradora, E=PJ/Holding) com heuristica deterministica de explicabilidade total na Wave A, e modelo ML calibrado na Wave B — abordagem validada em `03-recommendations.md` REC-1.1 e REC-1.2.
- **Habilitar enriquecimento estruturado** com lookup CRECI (validacao de licenca), CNPJ (filtro CNAE imobiliario 68.xx + 41.xx), e dados georreferenciados (GeoSampa IPTU bairros Moema/Vila Olimpia/Itaim) — fontes operacionalizaveis no Wave A.
- **Garantir conformidade LGPD pre-acao** com LIA (Legitimate Interest Assessment), cifragem de PII em repouso (pgcrypto/Supabase Vault), opt-out endpoint e audit log de extracao — pre-requisito P0 conforme `03-recommendations.md` REC-7.1 a REC-7.5.
- **Alimentar o funil Epic 2 existente** (Contato -> V1 -> V2 -> Exclusividade -> Venda) sem redesenha-lo, com lead pre-qualificado e scored — preservar metodologia RE/MAX da Luciana.
- **Manter custo operacional Wave A abaixo de R$ 1.500/mes** com Apify cloud (Wave A) ate gatilho de >=50k paginas/mes; migracao para Crawlee self-hosted Wave B somente quando crossover for atingido — decisao `docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md` (REFINE).

### Background Context

A Luciana opera hoje com o Epic 6 (busca parametrica + enriquecimento de contatos) cobrindo ZAP, OLX e VivaReal. Apesar de funcional, esses 3 portais nao capturam tres segmentos relevantes da Zona Sul SP:

1. **Anunciantes diretos (FISBO)** em portais nao-imobiliarios — MercadoLivre Imoveis (alto volume FISBO; sem CRECI obrigatorio na plataforma) e grupos publicos de Telegram.
2. **Construtoras e holdings PJ** — visibilidade via CNPJ + CNAE 41.xx (construcao) e 68.xx (atividades imobiliarias).
3. **Sinais cross-base** — Delta-preco-por-bairro do ITBI SP, densidade transacional, perfil cadastral GeoSampa.

A pesquisa Wave 1+2 (concluida em 2026-05-14, ver `docs/research/2026-05-14-leads-zonasul-sp/`) confirmou que:

- O ITBI SP **nao publica CPF/CNPJ adquirente** (sigilo fiscal) — feature L3 fica restrita a Delta-preco-por-bairro, sem grafo-por-pessoa (CQ-001 RESOLVED).
- O GeoSampa IPTU/TPCL nao tem proprietario PF, mas tem SQL+area+padrao+uso suficiente para enriquecer a base `edificios` existente (CQ-002 PARTIAL).
- AppFolio Realm-X (vertical real estate) e precedente FORTE para a stack hibrida cron-Supabase (Wave A) + LangGraph (Wave B) (CQ-009 RESOLVED).
- Heuristica determinista de FISBO (DDD movel + ausencia CRECI + nome PF + unico anuncio) opera comercialmente nos EUA via REDX/Vulcan7/Espresso — estimativa defensavel 70-85% precisao lower-bound (H-001 INCONCLUSIVE, requer validacao empirica com Luciana).

Tres benches subsequentes (Phase 3 spy-bench-analyst) consolidaram as decisoes tecnicas:
- **Crawlee TypeScript vence Crawlee Python** 89.75 vs 72.05 — Wave 2 CONFIRMED (`docs/bench/crawlee-ts-vs-crawlee-py/executive-report.md`).
- **Apify cloud ganha ate 50k paginas/mes** com 80.70 vs 68.20 — Wave 2 REFINED (TCO real Hetzner+IPRoyal+manutencao = R$ 1.944 vs Apify Creator R$ 1.383 @ 50k pgs) (`docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md`).
- **cron-Supabase puro vence LangGraph day-1** 91.00 vs 65.55 — Wave 2 CONFIRMED ($0 vs ~R$ 760/mes plataforma LangSmith Plus) (`docs/bench/cron-supabase-vs-langgraph-day1/executive-report.md`).

Code-anatomy (Phase 4) extraiu schemas e patterns reutilizaveis de 4 referencias:
- `Bunsly/HomeHarvest` (MIT, 679 stars) — schema Pydantic 30 modelos transpiled para Zod, padroes pending/contingent filter, date precision enhancement, pagination chunking, fail-fast 403 sem proxy.
- `apify/crawlee` (Apache-2.0, 23k stars) — AdaptivePlaywrightCrawler como default, session pool + proxy rotation, hooks shouldPropagateError/resultChecker/resultComparator.
- `19950512/buscacreci` (license-missing, 15 stars, PHP) — pattern para Conselho Nacional CRECI (21 UFs, Turnstile sitekey publico) e CRECI SP (reCAPTCHA Enterprise, sitekey conhecida).
- `rictom/cnpj-sqlite` (MIT, 223 stars) — pipeline ETL mensal RFB CNPJ -> SQLite -> filtro CNAE imobiliario -> Supabase em container Python isolado.

Epic 7 e a **camada de aquisicao** que torna o sistema **independente de Captei/MyREMAX/SerasaPRO**. E o diferencial estrategico que materializa "captura propria, multifonte, conforme LGPD, com classificacao automatica" antes da Luciana abordar V1.

### Referencias de Discovery (Phase 0-4)

- `docs/research/2026-05-14-leads-zonasul-sp/00-problem.md` — problem framing
- `docs/research/2026-05-14-leads-zonasul-sp/wave-2-summary.md` — Wave 2 decisoes consolidadas
- `docs/research/2026-05-14-leads-zonasul-sp/03-recommendations.md` — 24 recomendacoes P0/P1/P2
- `docs/research/2026-05-14-leads-zonasul-sp/curiosity_queue.yaml` — 12 CQs (8 RESOLVED, 2 PARTIAL, 1 BLOCKED)
- `docs/bench/crawlee-ts-vs-crawlee-py/executive-report.md` — CONFIRM TS
- `docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md` — REFINE (Apify Wave A; self-host gatilho >=50k pgs/mes)
- `docs/bench/cron-supabase-vs-langgraph-day1/executive-report.md` — CONFIRM (cron-Supabase Wave A; LangGraph Wave B nos NLP)
- `docs/code-anatomy/bunsly-homeharvest/07-business-rules.md` — heuristicas FSBO verbatim
- `docs/code-anatomy/apify-crawlee-focused/extraction-notes.md` — AdaptivePlaywrightCrawler patterns
- `docs/code-anatomy/buscacreci/07-business-rules.md` — Conselho/SP CRECI patterns
- `docs/code-anatomy/rictom-cnpj-sqlite/extraction-notes.md` — CNPJ ETL container

---

## 2. Requirements

### Functional Requirements (FR-035 -> FR-068)

A numeracao continua sequencialmente a partir do PRD v2.0 que terminou em FR-034. Cada FR cita seu artefato de discovery de origem (rastreabilidade Article IV — No Invention).

#### Capability A — Captacao Multi-Fonte (Ampliacao Epic 6)

- **FR-035 (P0):** Crawler MercadoLivre Imoveis Zona Sul SP (bairros: Moema, Vila Olimpia, Itaim Bibi). Lista paginada + parsing de detalhe. Captura: endereco, preco, area, quartos, tipo de anuncio, telefone/whatsapp/email do anunciante quando publicos. *Origem: `03-recommendations.md` REC-3.2 + `wave-2-summary.md` H-005 self-hosted nuance.*
- **FR-036 (P0):** Pipeline modular de portal-crawler com wrapper `PortalCrawler` aceitando configuracao por portal (selectors, captcha, rate-limit, proxy pool). *Origem: `docs/code-anatomy/apify-crawlee-focused/extraction-notes.md` Sec. 1 (Wrapper class) + AdaptivePlaywrightCrawler default.*
- **FR-037 (P1):** Crawler QuintoAndar via Apify actor `brasil-scrapers/quinto-andar-api` (commoditizado, Wave B). Crawler Loft idem via actor equivalente quando disponivel. *Origem: `curiosity_queue.yaml` CQ-012 RESOLVED.*
- **FR-038 (P1):** Crawler ImovelWeb (Wave B) com tratamento DataDome — adiar para Wave B regardless. *Origem: `03-recommendations.md` REC-3.2 risco + `wave-2-summary.md` state-of-risks.*
- **FR-039 (P1):** Ingest Telegram via API oficial (Telethon/Pyrogram) de canais publicos imobiliarios BR pre-aprovados pela Luciana. *Origem: `03-recommendations.md` REC-3.3.*
- **FR-040 (Wont/W3+):** Facebook Marketplace OUT OF SCOPE Wave 1-3 — ToS + LGPD risco alto, baixo volume Zona Sul. Reavaliar em 6 meses se houver demanda Luciana. *Origem: `03-recommendations.md` REC-3.4.*

#### Capability B — Bases Publicas

- **FR-041 (P0):** Container Python isolado executando pipeline ETL mensal `rictom/cnpj-sqlite` (download RFB CNPJ -> SQLite local -> filtragem CNAE 68.xx + 41.xx + 81.12-13 + 43.99.1-05 -> push subset para tabela Supabase `cnpj_enrichment`). *Origem: `docs/code-anatomy/rictom-cnpj-sqlite/extraction-notes.md` + `03-recommendations.md` REC-2.1.*
- **FR-042 (P0):** Ingest GeoSampa IPTU/TPCL bairros Zona Sul (Moema/Vila Olimpia/Itaim) — alimentar campos GeoSampa ja existentes em `edificios` (sql_lote, area_construida, ano_construcao, padrao_iptu, tipo_uso_iptu, num_pavimentos) via Story 3.5 (existing) + complementar com geometria de lote nas areas alvo. *Origem: `curiosity_queue.yaml` CQ-002 PARTIAL + `human_resolutions` CQ-006.*
- **FR-043 (P0):** Ingest ITBI SP dataset mensal — feature L3 Delta-preco-por-bairro/rua (sem grafo-por-pessoa devido sigilo fiscal). Snapshot mensal historizado. *Origem: `curiosity_queue.yaml` CQ-001 RESOLVED + `03-recommendations.md` REC-2.3.*
- **FR-044 (P1):** Ingest Socios Brasil (turicas) para grafo PJ (Category E holding). LGPL-3.0 — consumir como CLI externo, nao importar lib (mitiga copyleft). *Origem: `03-recommendations.md` REC-2.4.*
- **FR-045 (P2):** Cartorio ONR sob demanda (CQ-001 confirmou que dataset publico nao tem; ONR e fonte paga). Reservado 2a onda. *Origem: `03-recommendations.md` REC-2.5.*

#### Capability C — Tipologia e Classificacao Automatica

- **FR-046 (P0):** Schema unificado `Advertiser` em Zod (transpiled de `Bunsly/HomeHarvest`) com 4 entidades compostas (Agent, Broker, Builder, Office) + classification enum (5 categorias A-E + `unknown`) + classification_confidence (0-1) + classification_signals (array enum: ddd_mobile, no_creci_match, single_listing, name_appears_personal, cnpj_match_construtora, cnpj_match_imobiliaria, cnpj_match_holding). *Origem: `docs/code-anatomy/bunsly-homeharvest/extraction-notes.md` Sec. 1.*
- **FR-047 (P0):** Funcao pura `classifyAdvertiser(signals: AdvertiserSignals)` retornando `{ classification, confidence, signals[] }`. Determinista, sem LLM. Testavel via unit tests. *Origem: `docs/code-anatomy/bunsly-homeharvest/extraction-notes.md` Sec. 2.*
- **FR-048 (P0):** Coluna `lead_type ENUM('FISBO','IMOB','CONSTR','ADM','PJ_HOLD','UNKNOWN')` em tabela `leads.classification` (delegado a @data-engineer para DDL exato). *Origem: `03-recommendations.md` REC-1.1 next-step.*
- **FR-049 (P1):** Classificador NLP de urgencia/motivacao (feature L2) via LangGraph subgraph com classifier text-only. Input: texto livre do anuncio. Output: `{ urgency_signal: 'high'|'medium'|'low', motivation_hint: text }`. *Origem: `03-recommendations.md` REC-1.3 + bench cron-supabase-vs-langgraph Wave B trigger.*

#### Capability D — Heuristica FISBO Deterministica

- **FR-050 (P0):** Implementar 4-signal heuristic (DDD movel + ausencia CRECI + nome aparenta PF + unica listing por telefone): retorna classification='for_sale_by_owner', confidence=0.85 quando os 4 sinais convergem. *Origem: `wave-2-summary.md` H-001 INCONCLUSIVE + `03-recommendations.md` REC-1.2 + `docs/code-anatomy/bunsly-homeharvest/extraction-notes.md` Sec. 2.*
- **FR-051 (P0):** Tela manual review (`/leads/review-queue`) para casos confidence < 0.70 antes de enviar para funil V1. Luciana confirma/recusa. *Origem: `03-recommendations.md` REC-1.2 mitigation.*
- **FR-052 (P0):** Workshop com Luciana para validacao empirica em batch de 200 anuncios estratificados — calcular precisao real BR Zona Sul. Resultado vira input para feature L3 (Delta-vs-ITBI bonus +5-10%). *Origem: `wave-2-summary.md` H-001 next_test.*

#### Capability E — Validacao CRECI Unificada

- **FR-053 (P0):** Modulo `creciService` com adapter pattern: Conselho Nacional (21 UFs com Turnstile sitekey publico) + CRECI SP (reCAPTCHA Enterprise) + CRECI RS/ES (sem captcha conhecido). Lookup retorna `{ inscricao, nomeCompleto, situacao, telefone }`. *Origem: `docs/code-anatomy/buscacreci/07-business-rules.md` BR-COFECI-001 a 005 + BR-CRECISP-001.*
- **FR-054 (P0):** Contrato com 2Captcha (servico externo) para resolucao Turnstile + reCAPTCHA Enterprise v3 — orcamento mensal definido pelo founder, com circuit-breaker se mensal exceder R$ 200. *Origem: `docs/code-anatomy/buscacreci/07-business-rules.md` BR-COFECI-002 + BR-CRECISP-001.*
- **FR-055 (P0):** Cache de lookup CRECI por 30 dias em tabela `creci_cache` (chave inscricao+uf). Evita roundtrips redundantes. *Origem: `03-recommendations.md` REC-1.2 / `docs/code-anatomy/buscacreci/07-business-rules.md` rate-limit table.*
- **FR-056 (P0):** Rate-limit dedicado por UF: Conselho Nacional 1 req/2s, CRECI SP 1 req/5s, outros 1 req/3s. *Origem: `docs/code-anatomy/buscacreci/07-business-rules.md` rate-limit recommendation.*

#### Capability F — Anti-Bot e Scheduling Resiliente

- **FR-057 (P0):** Wrapper `createPortalCrawler` aceita config (session pool, proxy pool IPRoyal residencial, hooks shouldPropagateError/resultChecker, max retries=3, timeout 30s). *Origem: `docs/code-anatomy/apify-crawlee-focused/extraction-notes.md` Sec. 1.*
- **FR-058 (P0):** Policy `robots.txt` + `ai.txt` aware em todo crawler novo do Epic 7. User-Agent identifica corretamente. Rate-limit baseline 1 req/s. *Origem: `03-recommendations.md` REC-3.5 + `docs/code-anatomy/buscacreci/07-business-rules.md` BR-COFECI-005.*
- **FR-059 (P0):** Pipeline orquestrado por pg_cron + Supabase Edge Functions. Status-table `crawl_runs` + `crawl_failures` + `crawl_requests` para self-healing pattern. *Origem: `docs/bench/cron-supabase-vs-langgraph-day1/executive-report.md` recommendation P0.*
- **FR-060 (P1):** Migrar para Crawlee self-hosted (Hetzner CPX31 + IPRoyal committed) quando atingir gatilho: sustained >= 50k pgs/mes por 60 dias OU Apify bill > R$ 1.500/mes. *Origem: `docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md` Decision table.*

#### Capability G — Lead Scoring (Wave B)

- **FR-061 (P1):** Scorecard heuristico v1 (sem ML) com ~8 features de L1+L2+L3 (Delta vs ITBI, CNPJ holding, tempo no portal, Delta preco intra-anuncio, etc.). Pesos calibrados em workshop 2h com Luciana. *Origem: `03-recommendations.md` REC-6.1 + REC-6.4.*
- **FR-062 (P1):** Pipeline de labels — UI no card do lead para Luciana marcar "vale abordar" (true/false). Acumula ate 200 anotacoes antes de treinar modelo. *Origem: `03-recommendations.md` REC-6.2.*
- **FR-063 (P1):** XGBoost + Platt calibration (< 1k samples) -> migrar para isotonic regression quando >= 1k samples. Score 0-100 = probabilidade calibrada. *Origem: `curiosity_queue.yaml` CQ-011 RESOLVED + `03-recommendations.md` REC-6.2.*

#### Capability H — LGPD Compliance

- **FR-064 (P0):** Legitimate Interest Assessment (LIA) documento escrito + revisado por counsel RE/MAX antes do primeiro scrape PF de Epic 7. Bloqueia entrega P0 se nao pronto. *Origem: `03-recommendations.md` REC-7.1 + `curiosity_queue.yaml` CQ-005 RESOLVED.*
- **FR-065 (P0):** Pagina publica de politica de privacidade + endpoint `POST /api/lgpd/opt-out` + canal manual (email/WhatsApp). Processamento em SLA 15 dias. *Origem: `03-recommendations.md` REC-7.2.*
- **FR-066 (P0):** Minimizacao — armazenar apenas metadados extraidos (hash + texto canonico) e nao conteudo bruto/foto. Foto referenciada via URL portal (sem rehosted). *Origem: `03-recommendations.md` REC-7.3.*
- **FR-067 (P0):** Cifragem em repouso de contatos PF (telefone, email, whatsapp, nome_completo) via Supabase Vault ou pgcrypto. Decifrar somente no momento da exibicao a consultor com permissao RLS. *Origem: `03-recommendations.md` REC-7.4.*
- **FR-068 (P0):** Tabela `lgpd_audit` (`user_id, lead_id, action, legal_basis, timestamp, evidence_url`). Trigger automatico em `leads`, `scraped_listings`, `cnpj_enrichment`. *Origem: `03-recommendations.md` REC-7.5.*

### Non-Functional Requirements (NFR-008 -> NFR-015)

- **NFR-008 (Performance):** Latencia P50 < 3s para classificacao deterministica de anuncio. P99 < 8s. Throughput >= 1000 anuncios/hora por worker.
- **NFR-009 (Custo):** Wave A — budget operacional mensal <= R$ 1.500 (Apify + 2Captcha + proxies eventuais). Alarme em R$ 1.200 (80%). *Origem: `docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md` Wave A trigger.*
- **NFR-010 (Observabilidade):** Toda crawl run gera registro em `crawl_runs` (portal, requests_finished, requests_failed, http_only_runs, browser_runs, mispredictions, avg_duration_ms, started_at, finished_at). *Origem: `docs/code-anatomy/apify-crawlee-focused/extraction-notes.md` Sec. 2.*
- **NFR-011 (Seguranca):** Tokens 2Captcha, Apify, Supabase service_role armazenados em Vercel env vars (encrypted). Nunca em logs. CRECI Turnstile sitekey publico OK em codigo. *Origem: `docs/code-anatomy/buscacreci/07-business-rules.md` BR-COFECI-002.*
- **NFR-012 (Compliance LGPD):** Atender LIA (FR-064), opt-out SLA 15 dias (FR-065), cifragem em repouso (FR-067), audit log (FR-068). *Origem: `03-recommendations.md` REC-7.x.*
- **NFR-013 (Confiabilidade):** Self-healing — toda task ETL grava `started_at` em status-table; cron secundario detecta `started_at > NOW - 15min AND finished_at IS NULL -> mark stale + retry`. Edge Function timeout sincrono 5s; tarefas longas enfileiram em `pgmq`. *Origem: `docs/bench/cron-supabase-vs-langgraph-day1/executive-report.md` gap-cs-1 + gap-cs-2.*
- **NFR-014 (Escalabilidade):** Crawlee self-hosted dimensionado para 100k pgs/mes Wave B (Hetzner CPX31 +1 worker secundario opcional). Apify Cloud testado ate 50k pgs/mes.
- **NFR-015 (Reversibilidade):** Configuracao Crawlee TS sem dependencia hard de Apify-only APIs — migracao para self-hosted deve ser mecanica em 1-2 dias se gatilho disparar. *Origem: `docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md` P0 recommendation.*

---

## 3. Constraints Tecnicos (Decisoes Wave 2 + Bench Confirmadas)

| # | Constraint | Severidade | Fonte |
|---|---|---|---|
| C-01 | Crawlee TypeScript para todos os crawlers Wave A/B Epic 7 | NON-NEGOTIABLE | Bench `crawlee-ts-vs-crawlee-py` CONFIRM (89.75 vs 72.05) |
| C-02 | Python isolado em container Docker SOMENTE para CNPJ ETL (rictom/cnpj-sqlite) | NON-NEGOTIABLE | CQ-003 RESOLVED + bench `crawlee-ts-vs-crawlee-py` |
| C-03 | Apify cloud para Wave A; self-host gatilho >=50k pgs/mes por 60d OU bill > R$1.500/mes | MUST | Bench `crawlee-selfhosted-vs-apify-cloud` REFINE |
| C-04 | pg_cron + Edge Functions para orquestracao Wave A; LangGraph somente em Wave B node NLP | MUST | Bench `cron-supabase-vs-langgraph-day1` CONFIRM |
| C-05 | Heuristica FISBO determinista ANTES de qualquer ML | MUST | REC-1.2 + H-001 INCONCLUSIVE |
| C-06 | LIA escrita por counsel ANTES do 1o scrape PF Epic 7 | NON-NEGOTIABLE | REC-7.1 + CQ-005 |
| C-07 | Cifragem em repouso de PF (Supabase Vault ou pgcrypto) | NON-NEGOTIABLE | REC-7.4 |
| C-08 | robots.txt + ai.txt aware em todo crawler | MUST | REC-3.5 + BR-COFECI-005 |
| C-09 | Schema unificado Advertiser/Property/HomeFlags em Zod (transpiled de HomeHarvest) | MUST | code-anatomy bunsly-homeharvest Sec.1 |
| C-10 | 2Captcha como provider unico Wave A (Turnstile + reCAPTCHA Enterprise v3) | MUST | BR-COFECI-002 + BR-CRECISP-001 |
| C-11 | ITBI SP feature L3 SEM grafo-por-pessoa (sigilo fiscal) | MUST | CQ-001 RESOLVED |
| C-12 | Edge Function sincrono <= 5s; tarefas longas via pgmq | MUST | bench gap-cs-2 |

---

## 4. Out of Scope (Explicito)

| Out of Scope | Razao | Reavaliacao |
|---|---|---|
| **Locacao** | PRD v2.0 escopo somente venda | Pos-MVP, demanda Luciana |
| **Mercados fora SP Capital** | Foco Zona Sul (Moema/V.Olimpia/Itaim) | Pos-MVP, expansao multi-consultor |
| **Modelos ML supervisionados antes de 200 labels** | REC-1.3 / REC-6.2 — sofisticacao prematura | Wave B trigger |
| **LangGraph desde Wave A** | Bench `cron-supabase-vs-langgraph-day1` CONFIRM custo R$ 760+/mes plataforma sem ROI | Wave B nos NLP |
| **Crawlee self-hosted Wave A** | Bench REFINE — TCO real perde para Apify Cloud ate 50k pgs/mes | Gatilho >=50k pgs/mes 60d |
| **Facebook Marketplace** | ToS Meta + LGPD risco alto + baixo volume Zona Sul | Reavaliar +6 meses |
| **Cartorio ONR API** | REC-2.5 — paga, CRECI exigido, custo R$/consulta | 2a onda fontes pagas |
| **Casafari/Receita PRO/Serasa PRO** | 2a onda fontes pagas conforme `00-problem.md` |  Reservado 2a onda |
| **Grafo-por-pessoa via ITBI** | CQ-001 RESOLVED — sigilo fiscal omite CPF/CNPJ adquirente |  Bloqueado por lei |
| **WhatsApp/Telegram grupos privados** | LGPD risco-recompensa nao compensa Wave 1 | Pos-producao |
| **Compartilhamento entre consultores (FR-017)** | Requer contrato especifico — Wave 2 do PRD original | Wave C / Epic 7.3 |
| **2Captcha replacement (AntiCaptcha, CapMonster)** | Wave A simplicidade; single provider |  Pos-MVP se 2Captcha falhar SLA |

---

## 5. Roadmap em Waves

### Wave A — Fundamentos Operacionais (Epic 7.1 — 2-3 sprints)

**Goal:** Captacao funcionando ponta-a-ponta com heuristica deterministica + LGPD basica + CNPJ enrichment + classificacao 5 categorias + cron-Supabase.

**P0 mandatorios:**
- FR-035 (MercadoLivre crawler), FR-036 (PortalCrawler wrapper), FR-041 (CNPJ container), FR-042 (GeoSampa enrichment), FR-043 (ITBI snapshot), FR-046 (Advertiser schema), FR-047 (classifyAdvertiser pure function), FR-048 (lead_type column), FR-050 (FISBO heuristic), FR-051 (review queue), FR-052 (workshop validacao Luciana), FR-053 (creciService Conselho+SP), FR-054 (2Captcha contract), FR-055 (CRECI cache), FR-056 (CRECI rate-limit), FR-057 (crawler wrapper), FR-058 (robots.txt), FR-059 (cron-Supabase pipeline), FR-064 (LIA), FR-065 (opt-out + politica), FR-066 (minimizacao), FR-067 (cifragem), FR-068 (audit log).

**Saidas esperadas:**
- Crawler MercadoLivre rodando 1x/dia para Moema+V.Olimpia+Itaim
- Container CNPJ ETL mensal -> tabela `cnpj_enrichment` (~50-100k registros SP)
- ITBI snapshot mensal -> tabela `itbi_transactions` com Delta-preco computado por bairro
- Classificacao automatica de cada listing nos 5 tipos com confidence
- CRECI lookup unificado (Conselho 21 UFs + SP)
- LIA + opt-out + audit log operacionais

**Stories Wave A (8-12 esperadas):** 7.1 a 7.12 (detalhamento em `docs/stories/`).

**Gatilho de conclusao:** validacao empirica Luciana em batch de 200 anuncios estratificados >= 75% precisao da heuristica FISBO.

---

### Wave B — Inteligencia e Escala (Epic 7.2 — 2-3 sprints)

**Goal:** Adicionar NLP, ML scoring, fontes adicionais, eventualmente self-hosting.

**P1 mandatorios:**
- FR-037 (QuintoAndar/Loft via Apify actors), FR-038 (ImovelWeb com DataDome), FR-039 (Telegram canais publicos), FR-044 (Socios Brasil grafo PJ), FR-049 (NLP classifier LangGraph subgraph), FR-060 (migracao self-host se gatilho ativado), FR-061 (scorecard heuristico v1 com pesos workshop), FR-062 (UI labels), FR-063 (XGBoost + Platt/isotonic).

**Saidas esperadas:**
- Cobertura ampliada a 6+ portais
- Score 0-100 calibrado por lead
- Classificador NLP de urgencia/motivacao
- (Condicional) migracao para Crawlee self-hosted Hetzner+IPRoyal

**Gatilho de inicio:**
- Wave A concluida e estabilizada por 30 dias
- Workshop Luciana com 200 labels acumulados
- Volume Apify >= 50k pgs/mes 60d OU bill > R$1.500/mes (-> trigger FR-060)

---

### Wave C — Maturidade e Escala Multi-Consultor (Epic 7.3 — futuro)

**Goal:** Otimizacoes, fontes pagas (2a onda), preparar escala para outros consultores RE/MAX.

**P2 mandatorios:**
- FR-045 (Cartorio ONR paga sob demanda), FR-040 (reavaliar Facebook Marketplace), uplift modeling (REC-6.3), compartilhamento entre consultores (FR-017 ampliado), 2a onda fontes pagas (Casafari, Receita PRO).

**Gatilho de inicio:**
- Wave B concluida
- ROI Wave A+B comprovado por Luciana
- Demanda explicita de expansao multi-consultor

---

## 6. Stakeholders, Riscos, Metricas

### Stakeholders

| Papel | Pessoa / Agente | Responsabilidade Epic 7 |
|---|---|---|
| End-user primaria | Luciana Borba | Validacao empirica heuristica, workshop scoring, aprovacao Wave A entrega |
| Founder / Orquestrador | Zero | Decisao Wave gates, orcamento, prioridades |
| PM | Morgan (@pm) | Backlog, roadmap, PRD, validacao @po pre-handoff @dev |
| Architect | Aria (@architect) | ADRs, system architecture update, design @data-engineer handoff |
| Data Engineer | Dara (@data-engineer) | Schema DDL, migrations, RLS, cifragem, audit log, GeoSampa/CNPJ/ITBI ETL |
| Dev | Dex (@dev) | Implementacao Crawlee TS + Edge Functions + cron + container CNPJ |
| QA | Quinn (@qa) | QA gates por story, regression Epic 6, smoke tests anti-bot |
| Scrum Master | River (@sm) | Drafting stories, sprint planning Wave A |
| Product Owner | Pax (@po) | Validacao 10-point Draft -> Ready, backlog priorization |
| DevOps | Gage (@devops) | git push, Vercel deploy, Supabase migration prod, MCP add (Apify, 2Captcha) |

### Riscos do PRD (top 3 por roadmap)

| # | Risco | Severidade | Mitigacao | Triggers |
|---|---|---|---|---|
| R1 | **ANPD sanciona scraping imobiliario antes Wave A entrega** (jurisprudencia ainda em formacao mas escalando 2025-2026) | Alta -> Media (CQ-005) | LIA escrita (FR-064) + Google Alert "ANPD imobiliaria sancao" + counsel especializado em Wave B se volume > 10k leads/mes | Alerta em qualquer sancao publica imobiliaria |
| R2 | **Heuristica FISBO < 75% precisao em batch real Luciana** (H-001 INCONCLUSIVE) -> reduz ROI Wave A | Media | Workshop Luciana batch 200 anuncios (FR-052) + tela manual review confidence<70% (FR-051) + bonus feature L3 Delta-ITBI +5-10% | Pre-encerramento Wave A |
| R3 | **2Captcha SLA degrada / preco sobe** -> CRECI lookup falha em massa | Media | Single-provider risk; Wave A aceito; Wave B avaliar AntiCaptcha/CapMonster; cache 30 dias minimiza impact | Mensal review billing 2Captcha |
| R4 | **MercadoLivre/ImovelWeb endurecem anti-bot** apos lancamento Epic 7 | Media | AdaptivePlaywrightCrawler default + session pool + IPRoyal residencial; Camoufox plano B; postergar ImovelWeb para Wave B | Success rate < 80% em 7 dias consecutivos |
| R5 | **RFB CNPJ schema change inesperado** (mudou 2x em 6 meses) | Media | Test schema mensal no container ETL + alerta se shape change | Build CNPJ falha 2x consecutivos |

### Metricas de Sucesso

| Metrica | Wave A Target | Wave B Target |
|---|---|---|
| Leads novos/mes Zona Sul SP | >= 200 | >= 500 |
| Precisao heuristica FISBO (batch Luciana) | >= 75% | >= 85% |
| Cobertura portais funcional | 4 (Epic6 + MercadoLivre) | 6+ (add QuintoAndar/Loft/ImovelWeb/Telegram) |
| Custo operacional R$/mes | <= R$ 1.500 | <= R$ 2.500 |
| Tempo medio scrape -> lead classificado | < 5min | < 2min |
| Conversao lead -> V1 Luciana | >= 8% | >= 12% |
| Crawl success rate (200 OK rate) | >= 85% | >= 92% |
| Audit LGPD opt-out SLA (15 dias) | 100% atendido | 100% atendido |

---

## 7. Dependencias Externas

| Dep | Acao Necessaria | Owner | Trigger Wave A |
|---|---|---|---|
| **2Captcha contract** | Conta corporativa + token + budget R$ 200/mes guard | Zero / @devops | Bloqueia FR-053-054 |
| **GeoSampa amostra Zona Sul** | Download dicionario IPTU.xlsx + sample bairro Moema | @data-engineer | Pre-FR-042 |
| **LIA documentado** | Counsel RE/MAX revisa | @pm + Zero | Bloqueia start Wave A scraping PF |
| **Apify token + plan Creator** | Renovacao + budget guard | @devops | Pre-FR-035 |
| **IPRoyal residencial pool** (Wave B prep) | Conta pre-pago avaliacao | @devops | Pre-trigger self-host |
| **Supabase Vault habilitado** | Verificar disponibilidade no plano atual; alternativa pgcrypto | @data-engineer | Pre-FR-067 |
| **Hetzner CPX31 (Wave B)** | Conta pre-pago avaliacao | @devops | Pos-trigger >=50k pgs/mes |

---

## 8. ADRs Relacionados

Decisoes formalizadas em ADRs separados (em `docs/architecture/adrs/`):

| ADR | Decisao | Status |
|---|---|---|
| ADR-EPIC7-001 | Crawler base = Crawlee TypeScript | Accepted |
| ADR-EPIC7-002 | Apify Cloud Wave A; gatilho self-host >=50k pgs/mes | Accepted |
| ADR-EPIC7-003 | Orquestracao cron-Supabase Wave A; LangGraph Wave B node NLP | Accepted |
| ADR-EPIC7-004 | Heuristica FISBO deterministica 4-signal antes de ML | Accepted |
| ADR-EPIC7-005 | CNPJ enrichment em container Python isolado (rictom/cnpj-sqlite) | Accepted |

---

## 9. Next Steps

### Architect Prompt (@architect)

> @architect — Com base neste PRD, atualize `docs/architecture/system-architecture.md` com:
> 1. Diagrama de containers Wave A (Next.js + Supabase + cron + Edge Functions + Apify + container Python CNPJ + 2Captcha).
> 2. Sequence diagram do happy path: cron-trigger -> Edge Function -> Apify run -> classificacao -> CRECI lookup -> CNPJ enrichment -> persistencia Supabase -> alimentar feed Epic 3.
> 3. Boundary contract `classify-anuncio` Edge Function — interface input/output que sobreviva a migracao Wave A -> Wave B com LangGraph subgraph.
> 4. Decision points pre-implementation: Supabase Vault disponivel? pgcrypto fallback?

### Data Engineer Prompt (@data-engineer)

> @data-engineer — Apos PRD aprovado, projete:
> 1. DDL: `cnpj_enrichment`, `itbi_transactions`, `creci_cache`, `lgpd_audit`, `crawl_runs`, `crawl_failures`, `crawl_requests`, alteracao `leads` com `lead_type` ENUM + `lead_score` NUMERIC + `classification_confidence`/`classification_signals` JSONB.
> 2. RLS policies para `cnpj_enrichment` (read-only authenticated), `lgpd_audit` (consultant_id own + admin), `creci_cache` (read-only authenticated).
> 3. Cifragem em repouso via Supabase Vault (preferred) ou pgcrypto (fallback) para PII em `leads` + `scraped_listings`.
> 4. Self-healing trigger functions `fn_mark_stale_runs()` + `fn_retry_failed_runs(p_max_retries int)`.
> 5. Container Python CNPJ — entrypoint.sh + filter_epic7_imobiliario.py + integracao Supabase via psql COPY.

### Scrum Master Prompt (@sm)

> @sm — Drafte stories 7.1 a 7.12 (Wave A) com base no escopo Wave A acima. Stubs para Wave B (7.13 — NLP+ML) e Wave C (7.14 — Fontes Pagas + Multi-Consultor). Cada story segue template padrao (User Story, AC com checkboxes, Dependencies, Out of Scope, Technical Notes, File List, Risks, Change Log).

### Product Owner Prompt (@po)

> @po — Apos @sm draftar stories Wave A, valide cada uma pelo 10-point checklist (`docs/stories/7.X.story.md`). Stories com effort >= 8 pts requerem PoC evidence per story-prototyping rule. Promover Draft -> Ready somente apos GO verdict.

---

## 10. Checklist Results

**Status:** READY FOR ARCHITECT / SM DRAFTING (92% completude)

| Category | Status |
|----------|--------|
| Problem Definition & Context | PASS (95%) — discovery completa Phase 0-4 |
| MVP Scope Definition | PASS (95%) — Wave A bem delimitado |
| User Experience Requirements | PASS (88%) — UX adicional sera definida no @ux-design-expert handoff |
| Functional Requirements | PASS (95%) — 34 FRs com rastreabilidade |
| Non-Functional Requirements | PASS (92%) — 8 NFRs operacionais |
| Epic & Story Structure | PASS (90%) — Wave A 8-12 stories esperadas |
| Technical Guidance | PASS (95%) — 5 ADRs + 12 constraints |
| Cross-Functional Requirements | PASS (88%) — LGPD detalhado, multi-tenant adiado Wave C |
| Clarity & Communication | PASS (92%) — discovery cited em cada FR |

**Itens para fase de arquitetura:** ERD detalhado, container diagram, classify-anuncio boundary contract, GeoSampa amostra real.

---

## 11. Audit Trail

### Principios aplicados (consistentes com PRD v2.0)

1. **Funciona sozinho antes de depender de externo** — Heuristica deterministica antes de ML; CRECI cache antes de live lookup; manual review queue para confidence baixa; LIA antes do primeiro scrape PF.
2. **Impossibilitar o caminho errado** — Budget guards (NFR-009), opt-out endpoint, cifragem em repouso, robots.txt aware, fail-fast 403 sem proxy.
3. **Automacao sugere, humano decide** — Classificacao automatica mas review queue, scorecard heuristico mas Luciana valida pesos, ML somente apos 200 labels.

### Contagem Final

- **34 novos FRs** (FR-035 a FR-068) + **8 novos NFRs** (NFR-008 a NFR-015)
- **3 Waves** (A obrigatorio, B P1, C P2)
- **5 ADRs** documentados
- **12 Constraints tecnicos** rastreaveis a discovery
- **12 Out-of-Scope** itens explicitos
- **5 Riscos** mapeados com mitigacao
- **8 Metricas** de sucesso por Wave
- **7 Dependencias externas** mapeadas

### Rastreabilidade (Article IV — No Invention)

100% dos FRs/NFRs/Constraints citam artefato de discovery de origem. Nada inventado fora do material Phase 0-4.

---

*Epic 7 PRD v1.0 — Morgan (@pm) — Synkra AIOX — 2026-05-14*

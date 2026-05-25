# Evolving Report — Markov state

**Pipeline:** tech-research v3.2 (--deep)
**Last update:** 2026-05-14 (end of Wave 2)
**Format:** Markov-style ledger — present state only, no history fork.

---

## State of knowledge — what we KNOW (high confidence)

### Domínio do problema
- Mercado de leads imobiliários Zona Sul SP é predominantemente coberto por 5-7 portais (ZAP/OLX/VivaReal já no Epic 6 + MercadoLivre + ImovelWeb + QuintoAndar + Loft).
- Tipologia operacional defensável tem 5 categorias: A=FISBO, B=Imobiliária, C=Construtora, D=Administradora, E=Holding/PJ.
- "FISBO" é semântica do projeto (== FSBO US); literatura BR usa "proprietário direto".
- FISBO US é 5-7% do mercado, com 92% convertendo para listing → janela de captação curta e identificável.
- Plataformas FSBO US (REDX, Vulcan7, Espresso, Mojo) operam comercialmente sobre heurística similar à proposta — modelo rentável.

### Tecnologia
- **Crawlee TypeScript** vence Crawlee Python no contexto Next.js+Supabase deste projeto (decisão CQ-003).
- **Crawlee** (23k⭐, Apache 2.0, ativo 2026-05) é o padrão de fato para scraping production-grade open source.
- **Playwright + stealth** continua sendo a opção JS-render-friendly mais robusta para portais com anti-bot leve.
- **Camoufox** (Firefox patchado) é a melhor opção para DataDome (que protege ImovelWeb).
- **LangGraph** (32k⭐, MIT) é padrão enterprise 2026 — Uber, LinkedIn, Replit, Klarna, AppFolio em produção.
- **AppFolio Realm-X** é precedente IDÊNTICO vertical real estate property tech rodando LangGraph + LangChain + LangSmith em produção (CQ-009 resolvido).
- **Stack híbrida** (cron-Supabase + LangGraph apenas para tasks LLM) é canonizada em 2026 — H-003 CONFIRMED.
- **Crawlee self-hosted Hetzner CPX31** para 50k pgs/mês custa ~R$ 430 vs Apify cloud R$ 1.160-2.320 — H-005 CONFIRMED com nuance (< 10k pgs Apify ainda vence).

### Dados públicos BR
- Receita Federal CNPJ dump mensal está disponível em dados.gov.br; schema mudou jan/2026.
- `rictom/cnpj-sqlite` (223⭐, MIT, ativo 2026-04) é o ETL mais leve para uso pessoal.
- `cuducos/minha-receita` (1.5k⭐) está ARCHIVED 2026-01 — não usar como runtime.
- GeoSampa expõe IPTU cadastral (3M+ registros, 120MB) em formato aberto via WMS/WFS (CQ-002 PARTIAL).
- **TPCL (Cadastro de Contribuinte Imobiliário)** mantido por DECAR/DECAD da Secretaria Municipal Fazenda SP desde 2016.
- **ITBI dataset SP cobre 2019-presente** com SQL, endereço, valor declarado, data, cartório — MAS **NÃO publica CPF/CNPJ adquirente/transmitente** por sigilo fiscal (CQ-001 RESOLVED).
- Brasil.IO (turicas) tem socios-brasil ativo (LGPL-3.0 — usar como CLI externo).
- **`19950512/buscacreci`** (15⭐, ativo 2026-05-08, PHP) é OSS BR ativo para lookup CRECI.
- **`brasil-scrapers/quinto-andar-api`** existe como actor Apify pronto (CQ-012 RESOLVED).

### LGPD
- ANPD Radar Tecnológico nº3 (nov/2024) classifica scraping como tratamento de dado pessoal sujeito à LGPD mesmo de dado público.
- Base legal recomendada: **legítimo interesse** (art. 7º, IX), com LIA documentada em 3 fases.
- Primeira multa ANPD por scraping foi em 2023 (telemarketing Telekall — R$ 14.400).
- Sanção máxima: 2% receita ou R$ 50M por infração.
- PJ (CNPJ) tem proteção LGPD mais frouxa que PF; sócios PF voltam a ter proteção plena.
- **MP 1.317/2025 (set/2025) transformou ANPD em agência reguladora oficial.**
- **27 fiscalizações abertas em 2025 (mais que 2020-2024 somadas).** Alvos prioritários: Meta/WhatsApp + big tech IA generativa.
- **Setor imobiliário NÃO foi alvo público de sanção em 2024-2026.** Risco médio-baixo, escalando regulatoriamente.

---

## State of knowledge — what we BELIEVE (medium confidence)

- Heurística determinística identifica FISBO com precisão entre **70-85%** em Zona Sul SP — bonus +5-10% adicionando feature Δ vs ITBI (H-001 INCONCLUSIVE, validação Phase 3/4).
- Feature "Δ preço (% redução)" é a mais preditiva single de motivação — pendente validação H-002 (Wave B).
- Volume estimado FISBO Zona Sul 50-750/mês (conservador, cabe em cron-Supabase qualquer modo) — CQ-004 BLOCKED até SQL real.
- LIA bem-feita + cifragem + opt-out + audit log é compliance suficiente para boutique imobiliária — H-004 pendente revisão counsel (Wave 5).

---

## State of knowledge — what we DON'T KNOW

- Schema verbatim dos campos do XLSX `Dicionario_dados_IPTU.xlsx` GeoSampa (CQ-002 PARTIAL — não bloqueia PRD)
- Schema verbatim dos campos do XLSX ITBI 2026 (não bloqueia PRD — campos já listados acima)
- Volume FISBO REAL Moema/VO/Itaim últimos 60 dias (CQ-004 BLOCKED)
- Comportamento da heurística determinística em batch real Zona Sul (CQ-007 / H-001 — Phase 3/4)
- Se existe sanção ANPD contra imobiliária especificamente em Q1-Q2 2026 (low-prob, monitorar)

---

## State of decisions — what we DECIDED already

| Decisão | Quando | Status | Reversibilidade |
|---|---|---|---|
| Adotar taxonomia 5-categorias A-E | Wave 1 | Lock-in soft | Alta (rename ENUM ok) |
| Heurística determinística antes de ML | Wave 1 | Lock-in firm | Alta |
| Manter Apify para ZAP/OLX/VivaReal (Epic 6) | Wave 1 | Lock-in firm | Alta |
| **Crawlee TypeScript** para crawlers Wave A/B Epic 7 | Wave 2 (CQ-003) | Lock-in soft | Média (refatoração custosa) |
| **Python isolado em container** só para subsistema CNPJ | Wave 2 (CQ-003) | Lock-in soft | Alta |
| Não fazer Facebook Marketplace Wave 1 | Wave 1 | Lock-in firm | Alta (reavaliar 6m) |
| Não fazer WhatsApp/Telegram privados Wave 1 | Wave 1 | Lock-in firm | Média |
| LIA obrigatória antes 1º scrape PF | Wave 1 | Lock-in firm | Baixa (compliance) |
| **Counsel padrão RE/MAX para Wave A; especialista só Wave B se passar 10k/mês** | Wave 2 (CQ-005) | Lock-in soft | Alta |
| **Stack híbrida cron-Supabase (Wave A) + LangGraph (Wave B só NLP)** | Wave 1 + Wave 2 (CQ-009 + H-003) | Lock-in soft | Alta |
| **Crawlee self-hosted Hetzner CPX31 para MercadoLivre+ImovelWeb** | Wave 2 (H-005) | Lock-in soft | Alta |
| **Apify cloud para QuintoAndar + Loft (Wave B)** | Wave 2 (CQ-012) | Lock-in firm | Alta |
| **ITBI feature L3 sem grafo-por-pessoa (só Δ-preço)** | Wave 2 (CQ-001) | Lock-in firm | Média (depende cartório futuro) |
| Top 3 OSS bench Phase 3: Crawlee, cnpj-sqlite, HomeHarvest | Wave 1 | Encaminhado | Alta |
| **Adicionar `19950512/buscacreci` à shortlist code-anatomy** | Wave 2 (CQ-010) | Lock-in soft | Alta |
| **Calibration ML: Platt < 1k labels, isotonic ≥ 1k** | Wave 2 (CQ-011) | Lock-in soft | Alta |

---

## State of risks — what could go wrong

| Risco | Severidade | Probabilidade | Mitigação atual | Owner |
|---|---|---|---|---|
| ANPD sanção LGPD por scraping sem LIA | Alta | **Baixa-Média** (escalou regulação, mas não materializou em imobiliária) | LIA antes 1º scrape + opt-out + cifragem + Google Alert escalation trigger | @pm |
| ImovelWeb DataDome bloqueia Crawlee vanilla | Média | Alta | Camoufox plano B; postergar p/ Wave B | @architect |
| Schema RFB CNPJ mudar de novo (já mudou jan/2026) | Média | Média | Tests de schema + alerting | @data-engineer |
| QuintoAndar/Loft inacessíveis | **Baixa** | Baixa (actor Apify pronto) | Usar brasil-scrapers/quinto-andar-api | @architect |
| Política RE/MAX corporativa bloquear scraping | (resolvido pre-W2: liberado) | — | — | — |
| `cuducos/minha-receita` archived → ecossistema pode estagnar | Baixa | Média | rictom/cnpj-sqlite ativo é plano A | @data-engineer |
| Volume FISBO muito baixo (< 50/mês) → ROI Epic 7 ruim | **Baixa** | Baixa (estimativa conservadora 50-750/mês) | Validar CQ-004 antes commit full Epic | @pm |
| **NOVO:** ITBI grafo-por-pessoa inviável (CPF/CNPJ ausente) | Média | 100% (confirmado) | Aceitar; reescopar L3 só Δ-preço | @architect |
| **NOVO:** Crawlee self-hosted hidden cost manutenção (~R$ 2-4k/mês interno) | Média | Média | Aceitar para volumes > 10k pgs/mês; abaixo, Apify | @devops |

---

## State of progress — Wave 2 deliverables

- ✅ `00-problem.md` — Fase 0
- ✅ `01-deep-research-prompt.md` — Fase 0
- ✅ `02-research-report.md` — Wave 1
- ✅ `03-recommendations.md` — Wave 1
- ✅ `wave-1-summary.md` — Wave 1
- ✅ `04-validation-multi-llm.md` — Wave 2
- ✅ `wave-2-summary.md` — Wave 2
- ✅ `curiosity_queue.yaml` — Wave 2 closed (v2)
- ✅ `evolving_report.md` — this file
- ✅ `execution-log.jsonl` — Wave 2 appended
- ⏳ Phase 3: `docs/bench/crawlee-ts-vs-python/`, `docs/bench/apify-vs-crawlee-self-hosted/`, `docs/bench/cron-supabase-vs-langgraph/`
- ⏳ Phase 4: `docs/code-anatomy/homeharvest/` + `docs/code-anatomy/buscacreci/`
- ⏳ Phase 5: `docs/prd/EPIC-7-LEAD-PROSPECTING.md` + `docs/stories/7.*.story.md`

---

## Next moves (Phase 3 — spy-bench-analyst)

1. Atacar 3 decisões binárias do `04-validation-multi-llm.md`:
   - Crawlee TS vs Python (smoke 100 URLs MercadoLivre)
   - Apify cloud vs Crawlee self-hosted (TCO modelagem 50k pgs/mês)
   - cron-Supabase vs LangGraph (pricing model classificador NLP)
2. Adicionar `19950512/buscacreci` a shortlist code-anatomy (junto com HomeHarvest).
3. @data-engineer baixa amostra Dicionario_dados_IPTU.xlsx + amostra XLSX ITBI jan/2026 para confirmar nomes verbatim de campos (1-2h, paralelo).

---

## State of agent handoff

**Incoming agent for Phase 3 (`spy-bench-analyst`):**

- Read this file + `04-validation-multi-llm.md` §"Trade-offs consolidados".
- Do NOT re-read `00-problem.md`, `01-deep-research-prompt.md`, `02-research-report.md` (compactados em wave-1-summary + 04-validation).
- Focus: 3 benches binários (Crawlee TS vs PY, Apify vs Crawlee self-hosted, cron-Supabase vs LangGraph).
- Output: 3 pastas `docs/bench/{a}-vs-{b}/` com scoring tables + recomendação fundamentada.

**Incoming agent for Phase 4 (`code-anatomist`):**

- Read `wave-2-summary.md` + `04-validation-multi-llm.md` §CQ-010.
- Engenharia reversa de HomeHarvest + buscacreci.
- Output: `docs/code-anatomy/homeharvest/` + `docs/code-anatomy/buscacreci/`.

**Incoming agent for Phase 5 (`@pm`, `@architect`):**

- Read `wave-2-summary.md` + `04-validation-multi-llm.md` §"Próximos passos" + relatórios bench Phase 3 + code-anatomy Phase 4.
- PRD Epic 7 com escopo refinado: ITBI sem grafo-por-pessoa, GeoSampa via Python ETL, Crawlee TS + Apify dual, cron→LangGraph migration, LIA pre-Sprint-1.
- Output: `docs/prd/EPIC-7-LEAD-PROSPECTING.md` + `docs/stories/7.*.story.md`.

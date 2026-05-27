# Wave 1 — Executive Summary

**Pipeline:** tech-research v3.2
**Wave:** 1 (Discovery — breadth-first)
**Data:** 2026-05-14
**Coverage Phase 3.5:** 78% — STOP-AND-PROCEED-TO-WAVE-2
**Tamanho:** ~1.350 palavras (target ≤ 1500)

---

## Decisão

**STOP Wave 1, CONTINUE Wave 2 (multi-LLM validation).** Coverage ≥ 70% atingido, 10 OSS candidates avaliados com `gh api` verification, nota LGPD presente com 3+ referências regulatórias ANPD/jurisprudência.

---

## TL;DR (3 frases)

1. **Open source first é viável** — Crawlee + rictom/cnpj-sqlite + GeoSampa + dataset ITBI PMSP cobrem 80% das necessidades de ingest sem custo de licença.
2. **Tipologia 5-categorias (A-E) + heurística determinística** é o caminho responsável para Wave A — ML entra apenas após Luciana validar 200+ leads anotados.
3. **LGPD não bloqueia mas exige LIA + cifragem + opt-out + audit log antes do primeiro scrape em PF** — risco materializado (primeira multa ANPD por scraping em 2023, MPF v Serasa R$200M, Radar Tecnológico nov/2024).

---

## Key findings (com fontes)

### Achados de alto valor

1. **`cuducos/minha-receita` está ARCHIVED desde 2026-01-04** — referência arquitetural permanece útil, mas runtime morto. [`gh api repos/cuducos/minha-receita`](https://github.com/cuducos/minha-receita). Substituto P0: [rictom/cnpj-sqlite](https://github.com/rictom/cnpj-sqlite) (223⭐, MIT, ativo 2026-04-12). Confidence: **High**.

2. **ImovelWeb usa DataDome confirmadamente** — não é portal trivial. [Scrapfly — How to Scrape Imovelweb](https://scrapfly.io/blog/posts/how-to-scrape-imovelweb). Recomendação operacional: começar pelo MercadoLivre (mais fácil), postergar ImovelWeb. Confidence: **High**.

3. **ANPD Radar Tecnológico nº3 (nov/2024)** firmou tese: scraping é tratamento de dado pessoal mesmo de dado público, exige base legal autônoma. [ANPD PDF](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/publicacao_radar_tecnologico_jan_2024.pdf). Implicação: LIA obrigatória, "dado público" não é defesa. Confidence: **High**.

4. **LangGraph cresceu para 32k⭐, CrewAI para 51k⭐, AutoGen entrou em manutenção** (MSFT pivotou para Agent Framework). 2026 deixou claro que stacks híbridos (durable execution + agentic) são padrão enterprise. Confidence: **High** ([Anubhav 2026](https://medium.com/data-science-collective/langgraph-vs-temporal-for-ai-agents-durable-execution-architecture-beyond-for-loops-a1f640d35f02), [OpenAgents 2026-02](https://openagents.org/blog/posts/2026-02-23-open-source-ai-agent-frameworks-compared)).

5. **ITBI SP dataset existe desde 2019** com histórico de transações reais — feature de scoring "Δ vs preço médio ITBI bairro" é o **diferencial L3 mais alto**. [PMSP Fazenda](https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda/noticias/index.php?p=31551). Confidence: **High**.

### Achados de média prioridade

6. **HomeHarvest (Bunsly)** com 680⭐ tem arquitetura referência (Zillow/Realtor/Redfin) — não usar direto (US-only), mas reverse-engineer na Fase 4 (code-anatomy). Confidence: **High**.

7. **Padrão ai.txt** complementa robots.txt em 2026 — política de scraping precisa parsear ambos. Confidence: **Medium**.

8. **xBooster (57⭐)** oferece scorecards explicáveis sobre XGBoost — boa P1 quando ML entrar. Pequeno demais (single contributor) para P0. Confidence: **Medium**.

---

## Top 3 OSS candidates (para Phase 3 bench)

| # | Repo | Stars | License | Por quê |
|---|---|---|---|---|
| 1 | [apify/crawlee](https://github.com/apify/crawlee) | 23.257 | Apache 2.0 | Fundação técnica scraping ampliado, maturidade incontestável |
| 2 | [rictom/cnpj-sqlite](https://github.com/rictom/cnpj-sqlite) | 223 | MIT | Enriquecimento CNPJ pronto, ativo, escopo limpo |
| 3 | [Bunsly/HomeHarvest](https://github.com/Bunsly/HomeHarvest) | 680 | MIT | Engenharia reversa de arquitetura (Fase 4 code-anatomy) |

---

## Best source list

### Top 5 fontes (qualidade × relevância)

1. [ANPD Guia Legítimo Interesse](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse) — autoridade regulatória primária
2. [LangGraph vs Temporal — Anubhav 2026](https://medium.com/data-science-collective/langgraph-vs-temporal-for-ai-agents-durable-execution-architecture-beyond-for-loops-a1f640d35f02) — arquitetura de produção
3. [Scrapfly Imovelweb Guide](https://scrapfly.io/blog/posts/how-to-scrape-imovelweb) — técnica + confirmação DataDome
4. [GeoSampa IPTU oficial PMSP](https://gestaourbana.prefeitura.sp.gov.br/noticias/prefeitura-disponibiliza-base-do-iptu-em-formato-aberto-no-geosampa/) — fonte primária BR
5. [Firecrawl Best Open-Source Web Crawlers 2026](https://www.firecrawl.dev/blog/best-open-source-web-crawler) — benchmark recente OSS

---

## Decisões arquiteturais já tomadas (alta convicção)

| Decisão | Justificativa | Confidence |
|---|---|---|
| **Manter Apify para portais já cobertos (ZAP/OLX/VivaReal)** | Epic 6 funciona, custo aceitável, não reinventar | High |
| **Crawlee TS para expansão (MercadoLivre primeiro)** | Stack Next.js convive bem com TS; Crawlee é padrão de fato | High |
| **Tipologia 5-categorias (A=FISBO, B=Imob, C=Constr, D=Adm, E=Holding)** | Mínimo defensável; mais granular vira overengineering | High |
| **Heurística determinística antes de ML** | Constituição Article IV (no invention), validação humana first | High |
| **Stack híbrida: cron+Supabase ETL → LangGraph só onde tem LLM** | Token cost; LangGraph overkill se ETL puro | High |
| **WhatsApp/Telegram grupos privados FORA Wave 1** | LGPD risk-reward ruim | High |
| **LIA obrigatória antes do primeiro scrape PF** | Precedent ANPD 2023 | High |

---

## Dilemas / decisões pendentes para Wave 2

1. **Crawlee TS vs Crawlee Python?** Depende de qual linguagem o squad domina + integração com cnpj-sqlite (Python nativo).
2. **Quais campos exatos o dataset ITBI 2026 expõe?** Confirmar se CPF/CNPJ do adquirente ainda está público.
3. **GeoSampa IPTU contém ano construção e padrão construtivo?** Critical para feature L3.
4. **Volume estimado real de leads/mês Zona Sul?** Determina se Prefect vs cron-Supabase é suficiente.
5. **Política RE/MAX corporativa permite scraping de portais concorrentes (QuintoAndar, Loft)?** Não-técnica, mas pode bloquear.

(Detalhes em `curiosity_queue.yaml`.)

---

## Gaps remanescentes (para Wave 2 atacar)

| Gap | Por quê não foi resolvido Wave 1 | Wave 2 attack plan |
|---|---|---|
| **Schema exato ITBI SP 2026** | Acesso direto ao dataset não verificado | WebFetch + se necessário download de amostra |
| **Performance real Crawlee vs Apify** | Não há benchmark BR público | Spy-bench-analyst Fase 3 |
| **Volume FISBO real Moema/VO/Itaim** | Sem amostra coletada | Smoke crawl da pasta zap atual + filtro heurístico |
| **Casos jurisprudenciais ANPD 2025-2026 específicos imobiliário** | Maioria de 2023 | Search dirigido em JOTA/Conjur |
| **Critérios "edifício listed" — como Luciana já mantém?** | Question interna não respondida | Conversa com Luciana ou docs RE/MAX |

---

## Cobertura por sub-query (Phase 3.5 score)

| SQ | Coverage estimada | Confidence overall | Status |
|---|---|---|---|
| SQ-1 Tipologia | 85% | High | ✅ Devil's advocate respondido |
| SQ-2 Bases públicas | 80% | High | ✅ 7 bases avaliadas, gap em campos ITBI |
| SQ-3 Scraping anti-bot | 80% | High | ✅ Devil's advocate respondido |
| SQ-4 OSS GitHub | 85% | High | ✅ 10 candidates ranqueados, `gh api` validados |
| SQ-5 Arquitetura | 75% | Medium-High | ✅ Devil's advocate respondido, decisão híbrida |
| SQ-6 Scoring | 65% | Medium | ⚠️ Open source ML scoring espacial não exaustivamente coberto |
| SQ-7 LGPD | 85% | High | ✅ Nota completa com base legal e mitigações |
| **Média** | **78%** | **High** | ✅ Stop Wave 1 |

---

## Recomendação para Wave 2

1. **Multi-LLM consensus** (Grok + Claude.ai + Gemini) sobre:
   - LangGraph vs CrewAI para o caso específico Real State Moema
   - Crawlee TS vs Crawlee Python no contexto Next.js + Supabase + cnpj-sqlite Python
   - Validação da taxonomia 5-categorias com Luciana via persona-simulação
2. **Spot research** dos 5 gaps remanescentes (ITBI schema, jurisprudência 2025-2026, volume FISBO real, política RE/MAX, edifício-listed).
3. **Code anatomy preview** do HomeHarvest (Fase 4) para extrair padrões de design transferíveis.

---

## Artefatos produzidos nesta wave

- ✅ `02-research-report.md` (38 fontes, 7/7 sub-queries, 3/3 devil's advocate)
- ✅ `03-recommendations.md` (24 recomendações, P0/P1/P2)
- ✅ `wave-1-summary.md` (este arquivo)
- ✅ `curiosity_queue.yaml`
- ✅ `evolving_report.md`
- ✅ `execution-log.jsonl`

**Total token cost estimado Wave 1:** ~95k tokens (research + writes). Bem dentro do budget Phase 1.

# Code Anatomy — Bunsly / HomeHarvest (Realtor.com scraper)

**Priority:** P0 (máxima alavancagem da Phase 4 — heurísticas de **broker vs builder vs anunciante-particular** transferíveis para portais BR)
**Mission scope:** Como detectar FSBO/anunciante PF, schema de saída e padrões anti-bot para Epic 7 Wave A (Captação Zona Sul SP).

## TL;DR

`HomeHarvest` é uma biblioteca Python que faz **scraping da API GraphQL interna do Realtor.com** e retorna registros estilo MLS em Pandas/Pydantic/Raw. **Não usa Playwright nem browser** — é HTTP `requests` direto sobre o endpoint `https://www.realtor.com/frontdoor/graphql`, autenticado via token mobile (`graph.realtor.com/auth/token`). Versão 0.8.18 (dez/2025) **removeu Zillow e RedFin** e foca só em Realtor.com.

**Aprendizado dominante para Epic 7:** o repo NÃO faz "FSBO detection" via heurística — Realtor.com **já entrega** o campo `advertiser.type` (`"seller"` = agente / `"community"` = builder). Para portais brasileiros (Zap/OLX/VivaReal), que NÃO tipam o anunciante na API, a heurística FISBO da Wave 2 (DDD móvel + ausência CRECI + nome PF + único anúncio) **permanece a melhor opção**. O valor transferível do HomeHarvest está em: (a) o **schema de dados** de `Advertisers/Agent/Broker/Builder/Office`, (b) o **padrão de pagination + retry**, (c) o **flow de auth via token mobile**, (d) os campos `flags.is_*` (is_pending, is_contingent, is_new_construction, is_foreclosure).

## Identidade do repo

| Métrica | Valor |
|---|---|
| Repo canônico | https://github.com/ZacharyHampton/HomeHarvest (Bunsly redireciona) |
| Estrelas | 679 |
| Forks | 158 |
| Linguagem | Python (100%) |
| Default branch | `master` |
| Último push | 2025-12-26 |
| Última versão | 0.8.18 |
| License | **MIT** (verificada via `LICENSE`) |
| Maintainers | Zachary Hampton, Cullen Watson (Bunsly) |
| Dependências runtime | `requests ^2.32`, `pandas ^2.3`, `pydantic ^2.11`, `tenacity ^9.1` |
| Risco abandono | **Baixo** — commit em 2025-12-26 (refactor + bump 0.8.18), 158 forks ativos |

## Por que é P0 para Epic 7

1. **Schema de Advertiser (agent/broker/builder/office) é canônico em MLS** — espelha NAR (USA). Para BR, nosso schema interno deve manter as 4 entidades + CRECI + CNPJ para alinhamento com modelo internacional.
2. **`flags.is_foreclosure`** + **`flags.is_new_construction`** são **flags discriminantes** equivalentes ao que precisamos para detectar **leilões / lançamentos** em zonasul-SP.
3. **Padrão GraphQL POST com `operationName` + `query` minificado** — bom modelo para crawler de portais BR que usem GraphQL (Zap, alguns custom CMS).
4. **Token auth pelo endpoint mobile** `graph.realtor.com/auth/token` é um pattern interessante para portais BR que tenham app mobile com endpoint público.
5. **Retry exponencial** via `tenacity` (`stop_after_attempt(3)` + `wait_exponential(multiplier=1, min=1, max=4)`).

## O QUE este repo NÃO é

- Não é browser automation (sem Playwright/Puppeteer/Crawlee).
- Não tem heurística FSBO probabilística — depende da API entregar `advertiser.type`.
- Não escala para sites que exigem JS render (SPA).
- Não tem distributed/queue — só roda single-process, paginação paralela via `ThreadPoolExecutor` (`NUM_PROPERTY_WORKERS = 20`).

## Mapa de artefatos nesta pasta

- `01-architecture.md` — diagrama do flow: input → scraper → Realtor GraphQL → parsers → Pydantic
- `02-domain-model.md` — schema completo de `Property/Address/Advertisers/Agent/Broker/Office/Builder`
- `03-data-flow.md` — sequência completa de uma chamada `scrape_property(...)`
- `04-api-surface.md` — função `scrape_property()` + parâmetros, exemplos minimal
- `07-business-rules.md` — **CRÍTICO** — heurísticas de classificação broker/agent/builder + dedução FSBO + estratégia transferível para BR
- `extraction-notes.md` — o que aproveitar/adaptar/descartar para Epic 7
- `provenance.json` — repo URL, commit SHA, license, files analyzed

## Decisões para o handoff de Phase 5

- **NÃO portar código Python** — Epic 7 é Crawlee/TS. Portar **apenas o schema** (Pydantic → Zod) e **a estratégia de Advertiser typing**.
- **Heurística FISBO BR** (definida na Wave 2) **PERMANECE** — não há equivalente ao `advertiser.type` em Zap/OLX/VivaReal.
- **Implementar field `advertiser_classification`** no schema unificado do Epic 7 com 4 valores: `agent | broker | builder | for_sale_by_owner`.
- **Importar `flags.is_*` pattern** — campos booleanos no schema Epic 7: `is_pending`, `is_new_construction`, `is_foreclosure`, `is_coming_soon` (mapear cada portal BR para esses 4).

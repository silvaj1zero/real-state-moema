# ADR-EPIC7-001: Crawler Base = Crawlee TypeScript

**Date:** 2026-05-14
**Status:** Accepted
**Epic:** 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte

## Context

Epic 7 requer expandir a captacao de leads alem dos 3 portais cobertos pelo Epic 6 (ZAP/OLX/VivaReal via Apify actors). Os portais Wave A (MercadoLivre Imoveis) e Wave B (ImovelWeb, QuintoAndar, Loft, Telegram) demandam um framework de crawling unificado, com suporte a:

- Hybrid HTTP-first/browser-fallback (portais BR sao majoritariamente SSR mas anti-bot pode forcar browser)
- Session pool + proxy rotation residencial
- Retry com backoff exponencial
- Tipagem compartilhada com domain models (Zod schemas)
- Deploy em Apify Cloud (Wave A) e self-hosted (Wave B se gatilho)

A stack atual do projeto e Next.js 15 + Supabase + TypeScript. Introducao de um runtime adicional (Python para crawlers, por exemplo) adicionaria complexidade operacional e quebraria a tipagem ponta-a-ponta.

## Decision

**Adotar Crawlee TypeScript 3.x como framework base para todos os crawlers do Epic 7 (Wave A e Wave B).**

Detalhes:
- `AdaptivePlaywrightCrawler` como default — HTTP-first com fallback Playwright.
- Wrapper `createPortalCrawler(opts: PortalCrawlerOptions)` em `packages/scrapers/lib/` forca defaults consistentes (session pool 50, proxy IPRoyal, max retries=3, timeout 30s, hooks shouldPropagateError/resultChecker).
- Python isolado em container Docker **somente** para CNPJ ETL (rictom/cnpj-sqlite). Os dois runtimes nao se cruzam em codigo — comunicacao via tabelas/views Supabase.

## Alternatives Considered

| Alternativa | Avaliada como | Por que rejeitada |
|---|---|---|
| **Crawlee Python** | 72.05/100 no bench | Stack mismatch com Next.js TS; menor maturidade (v1.0 GA set/2025); Apify recomenda JS para max throughput |
| **Playwright puro (sem Crawlee)** | Possivel | Reimplementar AutoscaledPool, session pool, queue, retry = 2 sprints de overhead |
| **Scrapy (Python)** | Possivel | Stack mismatch; nao tem adaptive HTTP/browser nativo; ecossistema Python no projeto so para CNPJ ETL |
| **Apify Actors sem SDK Crawlee** | Possivel | Vendor lock-in mais profundo; SDK Crawlee e "off-the-shelf" reusavel em qualquer runtime |
| **Bright Data Web Unlocker** | Avaliada | Custo elevado + black box; Crawlee + residential proxy mais flexivel |
| **Puppeteer (sem Crawlee)** | Possivel | Mesmo problema do Playwright puro |

## Consequences

**Positive:**
- Stack alignment total (TS end-to-end): tipagem Zod compartilhada entre crawlers e Next.js API routes
- Maturidade incontestavel: 23k stars Apache-2.0, desde 2018, mantido por Apify
- AdaptivePlaywrightCrawler experimental mas ja em producao em multiplos clientes Apify; ratio 3-4x speedup esperado em portais SSR
- Session pool + proxy rotation nativos — nao reimplementar
- Hooks shouldPropagateError / resultChecker / resultComparator cobrem 90% das customizacoes
- Deploy uniforme: Apify Cloud Wave A; mecanico migrar para self-hosted Wave B (ADR-EPIC7-002)
- License Apache-2.0 permissiva para uso comercial

**Negative:**
- `AdaptivePlaywrightCrawler` ainda marcado `@experimental` em algumas docs Apify — risco de breaking API. **Mitigacao:** pinar versao em package.json, smoke E2E weekly.
- Predictor de rendering type aprende por worker (stateful) — em multi-worker Apify nao ha sync nativo. **Mitigacao:** detectionRatio 10% default; aceitavel.
- Crawlee TS nao tem AWS Lambda deployment docs (so Crawlee Python tem). Para Wave B self-hosted, Hetzner CPX31 e o caminho. **Mitigacao:** decisao ja tomada em ADR-EPIC7-002.
- Tipagem nao cobre 100% dos hooks experimentais — necessario adicionar tipos custom em alguns pontos.

## Evidence

- **`docs/bench/crawlee-ts-vs-crawlee-py/executive-report.md`** — Verdict CONFIRM, score 89.75 vs 72.05, +17.7 pts, 9 dimensoes ponderadas.
- **`docs/research/2026-05-14-leads-zonasul-sp/curiosity_queue.yaml`** CQ-003 RESOLVED confidence High.
- **`docs/code-anatomy/apify-crawlee-focused/extraction-notes.md`** — patterns canonicos (AdaptivePlaywrightCrawler, session pool, hooks, router).
- **`docs/research/2026-05-14-leads-zonasul-sp/wave-2-summary.md`** Sec. "Top 3 decisoes binarias".

---

*ADR-EPIC7-001 — Aria (@architect) + Morgan (@pm) — 2026-05-14*

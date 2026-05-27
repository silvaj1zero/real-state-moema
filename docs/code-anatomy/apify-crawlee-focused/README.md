# Code Anatomy — apify/crawlee (FOCUSED)

**Priority:** P1
**Mission scope:** Análise focada em 3 áreas que vão alimentar o scaffold do Epic 7 Crawlee TS: (a) PlaywrightCrawler class hierarchy + options, (b) AutoscaledPool pattern, (c) AdaptivePlaywrightCrawler (HTTP↔Browser dual-mode).

## TL;DR

Crawlee é um framework de web scraping em Node.js que **opera como abstração em cima de Playwright/Puppeteer/Cheerio/HTTP**, com 3 pilares fundamentais para Epic 7:

1. **`AutoscaledPool`** — adapta concorrência automaticamente baseado em CPU/memória/event-loop snapshots. Em vez de fixar "20 workers", o sistema escala dinamicamente entre `minConcurrency=1` e `maxConcurrency=200`, recuando se o servidor responde com 429/503 ou se o host fica sobrecarregado.
2. **`PlaywrightCrawler`** — herda de `BrowserCrawler`, gerencia `BrowserPool` (instâncias de browser reutilizáveis), expõe `requestHandler({ page, request, ... })` e ciclos `preNavigationHooks` / `postNavigationHooks`. Cada request roda em uma `Page` (tab) nova.
3. **`AdaptivePlaywrightCrawler`** (experimental, ativo em 2026) — herda de `PlaywrightCrawler` e adiciona **detecção automática de rendering type** (static HTML vs. client-side JS) via `RenderingTypePredictor` (regressão logística). Quando detecta site estático, **bypass do browser** e roda só HTTP — economia massiva de RAM/tempo. Reverte a browser se HTTP falha ou resultado é "suspeito".

**Por que P1 (não P0):** Crawlee é a **base do scaffold Epic 7** (decisão Wave 2). Não precisamos extrair regras de negócio dele — precisamos aprender os **patterns de configuração** para reproduzir corretamente no nosso código.

## Identidade do repo

| Métrica | Valor |
|---|---|
| Repo | https://github.com/apify/crawlee |
| Estrelas | 23.260 |
| Forks | 1.366 |
| Linguagem | TypeScript |
| Default branch | `master` |
| Último push | 2026-05-13 (HOJE) — projeto extremamente ativo |
| Último commit | `d3a29d96` (feat: adaptive-crawler shouldPropagateError) |
| License | **Apache-2.0** (verificada) |
| Maintainers | Apify Technologies s.r.o. — produto comercial open-source |
| Maintenance risk | **Muito baixo** — Apify monetiza Crawlee como SDK do Apify Platform |

## Pacotes analisados (escopo focado)

| Pacote | Caminho | Foco |
|---|---|---|
| `@crawlee/playwright` | `packages/playwright-crawler/src/` | `PlaywrightCrawler`, `AdaptivePlaywrightCrawler` |
| `@crawlee/core` | `packages/core/src/autoscaling/` | `AutoscaledPool`, `Snapshotter`, `SystemStatus`, load signals |
| `@crawlee/utils` | `packages/utils/src/internals/` | Helpers (`gotScraping`, `social`, `robots`, `sitemap`, `extract-urls`) — não usam fingerprints (vivem em pacote `browser-pool`) |

## Pacotes NÃO analisados (fora do escopo focado)

- `@crawlee/browser-pool` — usa fingerprint-suite (`fingerprint-generator`, `fingerprint-injector`) — está em outro repo, não em `apify/crawlee`.
- `@crawlee/cheerio` — substituível por `AdaptivePlaywrightCrawler` em static mode.
- `@crawlee/puppeteer` — equivalente a Playwright, redundante para Epic 7.
- `@crawlee/jsdom`, `@crawlee/linkedom`, `@crawlee/http` — usados por adaptive crawler em modo HTTP.
- `@crawlee/memory-storage` — só para dev/test; produção usa Apify Platform Storage ou implementação custom.

## Por que adotamos Crawlee no Epic 7 (decisão Wave 2)

1. **AutoscaledPool > ThreadPoolExecutor** — adapta dinamicamente vs. fixar workers.
2. **AdaptivePlaywrightCrawler** — Zap/OLX/VivaReal têm páginas mistas (algumas SSR, outras CSR). Modo adaptativo escolhe melhor caminho por URL.
3. **TypeScript native** — match com stack do Epic 7 (`packages/shared/schemas` em Zod, `packages/api` em Next.js).
4. **Apache-2.0** — permissivo para uso comercial sem restrições.
5. **Manutenção ativa** — push em 2026-05-13 (dia da análise).
6. **Community-tested em escala** — Apify usa Crawlee como SDK do seu produto comercial (milhões de runs/mês).
7. **Suporte nativo a sessões/proxies/cookies/cancel** — não temos que reimplementar.

## Mapa de artefatos nesta pasta

- `01-architecture.md` — hierarchy `BrowserCrawler` → `PlaywrightCrawler` → `AdaptivePlaywrightCrawler` + `AutoscaledPool`
- `03-data-flow.md` — request lifecycle do `AdaptivePlaywrightCrawler` (HTTP first → fallback browser)
- `04-api-surface.md` — patterns prontos para Epic 7 (snippets `new PlaywrightCrawler({...})`, `new AutoscaledPool({...})`)
- `extraction-notes.md` — decisões de adoção/adaptação para Epic 7
- `provenance.json` — commits SHA, license, files analyzed

## Decisões para o handoff de Phase 5

- **Adotar `AdaptivePlaywrightCrawler` como crawler base** para Zap/OLX/VivaReal — bypass browser quando possível, fallback automático.
- **Configurar `AutoscaledPool` com `minConcurrency=2`, `maxConcurrency=20`** — conservador para evitar bloqueio anti-bot.
- **`renderingTypeDetectionRatio = 0.1`** (default) na primeira semana, depois reduzir para `0.05` quando o predictor estabilizar.
- **`maxRequestRetries: 3`** + **`requestHandlerTimeoutSecs: 60`** como defaults.
- **`maxTasksPerMinute`** explícito (ex: 60 = 1/seg) para portais sensíveis a rate-limit.
- **Implementar `shouldPropagateError`** para 403/429 — não fallback a browser se HTTP já falhou por anti-bot.

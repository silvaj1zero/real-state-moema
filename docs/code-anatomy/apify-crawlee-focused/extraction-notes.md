# Extraction Notes — apify/crawlee → Epic 7

Decisão por componente: **APROVEITAR / ADAPTAR / DESCARTAR** para o scaffold Crawlee TS do Epic 7.

## Mapa de extração

| Item | Decisão | Justificativa |
|---|---|---|
| **`AdaptivePlaywrightCrawler`** | **APROVEITAR como crawler base** | HTTP-first com fallback browser. Speedup 3-4x esperado em portais BR maioritariamente SSR. Inerentemente reduz consumo de Apify cloud. |
| **`PlaywrightCrawler` (sem Adaptive)** | **APROVEITAR como fallback** | Para portais 100% client-rendered (raro em BR — VivaReal mobile pode ter). |
| **`AutoscaledPool`** | **APROVEITAR (implícito via crawler)** | Já vem no Crawlee. **NÃO** instanciar manualmente — só configurar via opções do crawler. |
| **`RenderingTypePredictor`** | **APROVEITAR default** | Não construir custom. Confiar no modelo logístico baseado em URL features. |
| **`shouldPropagateError` hook** | **APROVEITAR e implementar** | Propagar 403/429/Cloudflare; cair em retry com novo proxy em vez de browser fallback. |
| **`resultChecker` hook** | **APROVEITAR e implementar** | Validar cada result tem `property_id` + `list_price` — sinal forte de anti-bot fake page. |
| **`resultComparator` hook** | **APROVEITAR default** | Default (`isEqual` profundo) é OK para começar. Custom comparator só se precision do predictor for ruim. |
| **`Router` (createPlaywrightRouter)** | **APROVEITAR** | Multi-page-type é nossa realidade (listing pages → detail pages). |
| **Session pool + Proxy rotation** | **APROVEITAR (essencial)** | `useSessionPool: true`, `persistCookiesPerSession: true`, ProxyConfiguration com pool residencial. |
| **`preNavigationHooks`** | **APROVEITAR** | Set cookies de consentimento LGPD, referer simulando search engine. |
| **`postNavigationHooks`** | **APROVEITAR** | CAPTCHA / Cloudflare / login wall detection. |
| **`Statistics` custom** | **APROVEITAR (subclass)** | `AdaptivePlaywrightCrawlerStatistics` já adiciona `httpOnlyRequestHandlerRuns`, `browserRequestHandlerRuns`, `renderingTypeMispredictions`. Capturar via event listener. |
| **`ow` para validação shape** | **DESCARTAR no nosso código** | Zod já é stack do Epic 7. Não introduzir 2 libs de validation. |
| **Memory storage** | **DESCARTAR em prod** | `Configuration.set('storageClientType', 'memory')` só em dev/test. Em prod, usar Apify Platform Storage OR custom Supabase storage adapter. |
| **`PuppeteerCrawler`** | **DESCARTAR** | Playwright é superior. |
| **`CheerioCrawler` (separado)** | **DESCARTAR** | Adaptive já cobre HTTP-mode. |
| **`logistic-regression.d.ts` model** | **APROVEITAR (transparente)** | Não temos que treinar; modelo Crawlee é production-tested. |

## Sugestões de hardening para Epic 7

### 1. Wrapper class `PortalCrawler` por portal

Em vez de instanciar `AdaptivePlaywrightCrawler` diretamente em cada portal scraper, criar wrapper que **força defaults consistentes**:

```typescript
// packages/scrapers/lib/portal-crawler.ts
import { AdaptivePlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { PROXY_POOL } from './proxy-config';

interface PortalCrawlerOptions {
  portal: 'zap' | 'olx' | 'vivareal';
  startUrls: string[];
  router: any;
  maxConcurrency?: number;   // default 20
  maxTasksPerMinute?: number; // default 120
}

export function createPortalCrawler(opts: PortalCrawlerOptions) {
  return new AdaptivePlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: PROXY_POOL }),
    requestHandler: opts.router,

    minConcurrency: 2,
    maxConcurrency: opts.maxConcurrency ?? 20,
    maxTasksPerMinute: opts.maxTasksPerMinute ?? 120,
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 30,

    renderingTypeDetectionRatio: 0.1,

    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 50,
      sessionOptions: { maxUsageCount: 50, maxErrorScore: 3 },
    },

    shouldPropagateError: defaultShouldPropagateError,
    resultChecker: makeDefaultResultChecker(opts.portal),
    resultComparator: defaultResultComparator,

    preNavigationHooks: [
      makeConsentCookieHook(opts.portal),
      makeRefererHook(),
    ],
    postNavigationHooks: [
      antiBotDetectionHook,
      loginWallDetectionHook,
    ],

    failedRequestHandler: async ({ request, error }) => {
      await Telemetry.recordFailure(opts.portal, request.url, error);
    },
  });
}
```

### 2. Telemetry layer obrigatório

```typescript
// packages/scrapers/lib/telemetry.ts
import { supabase } from '@shared/supabase';

export const Telemetry = {
  async recordRequest(portal: string, url: string, durationMs: number, status: number, retries: number) {
    await supabase.from('crawl_requests').insert({
      portal, url,
      duration_ms: durationMs,
      status_code: status,
      retries,
      created_at: new Date(),
    });
  },

  async recordFailure(portal: string, url: string, error: Error) {
    await supabase.from('crawl_failures').insert({
      portal, url,
      error_message: error.message,
      error_stack: error.stack,
      created_at: new Date(),
    });
  },

  async snapshot(portal: string, stats: any) {
    await supabase.from('crawl_runs').insert({
      portal,
      requests_finished: stats.requestsFinished,
      requests_failed: stats.requestsFailed,
      http_only_runs: stats.httpOnlyRequestHandlerRuns,
      browser_runs: stats.browserRequestHandlerRuns,
      mispredictions: stats.renderingTypeMispredictions,
      avg_duration_ms: stats.requestAvgFinishedDurationMillis,
      created_at: new Date(),
    });
  },
};
```

### 3. State persistence via Apify Platform OR Supabase

Crawlee precisa de `KeyValueStore` + `RequestQueue` + `Dataset` para state. Em Apify Platform isso é grátis. Em Vercel/self-hosted, precisamos custom adapter:

**Opção A:** rodar crawlers no Apify Platform (decisão Wave 2 — Wave A Apify cloud + cron-Supabase).
- ✓ State grátis e gerenciado
- ✓ Logs/screenshots integrados
- ✓ Scaling automático
- ✗ Custo por run (~ $0.05/1000 results)

**Opção B:** Supabase storage adapter custom (mais trabalho).
- ✓ Sem custo Apify
- ✗ Implementar interface `StorageClient` do Crawlee
- ✗ Manutenção própria

**Wave 2 escolheu Opção A (Apify cloud).**

### 4. Rendering type predictor warm-up

Default Crawlee usa modelo logístico baseado em **features estatísticas de URL**. Para Epic 7, podemos warm-up com hints:

```typescript
// Em ZapImoveisCrawler init
const predictor = new RenderingTypePredictor({
  detectionRatio: 0.1,
});

// Pre-seed: sabemos que listing pages são estáticas (SSR)
await predictor.storeResult({ url: 'https://zapimoveis.com.br/venda/imoveis/...' } as any, 'static');
await predictor.storeResult({ url: 'https://zapimoveis.com.br/venda/imoveis/sp+sao-paulo...' } as any, 'static');
// Detail pages são client-rendered
await predictor.storeResult({ url: 'https://zapimoveis.com.br/imovel/...' } as any, 'clientOnly');
```

> **Caveat:** o predictor é stateful **por worker**. Em multi-worker (Apify), cada worker re-aprende. Não há sync nativo. **Aceitável** para o ratio default 10%.

### 5. License — Apache 2.0

- **Crawlee é Apache-2.0** — permissivo para uso comercial
- Atribuição via NOTICE file requerido se redistribuirmos código
- **Não vamos redistribuir Crawlee** — só consumir via `npm install crawlee`. Atribuição via `package.json` (license auto-listed) é suficiente.

## Risco — comunidade

| Vetor | Probabilidade | Mitigação |
|---|---|---|
| Apify abandona Crawlee | **Muito baixa** | Crawlee é o SDK do produto comercial Apify. Push em 2026-05-13. |
| AdaptivePlaywrightCrawler quebra (@experimental flag) | **Média** | Pinar versão exato em `package.json`. Test E2E weekly. |
| `RenderingTypePredictor` má precisão para portais BR | **Média** | Capturar métricas `renderingTypeMispredictions`. Se > 20%, switch para `PlaywrightCrawler` puro. |
| Playwright breaking changes | **Baixa** | Crawlee fixa version range; pinar via lockfile. |
| Mudança schema Apify Platform Storage | **Baixa** | Apify mantém backwards compat por padrão. |

## Alternativas avaliadas pré-Wave 2

| Alternativa | Por que NÃO escolhida |
|---|---|
| **Playwright puro (sem Crawlee)** | Reimplementar AutoscaledPool, session pool, queue, retry... 2 sprints. |
| **Scrapy (Python)** | Stack mismatch (Epic 7 é TS). Não tem adaptive HTTP/browser nativo. |
| **Apify Actors (sem SDK Crawlee)** | Vendor lock-in mais profundo. SDK Crawlee é "off-the-shelf" reusável. |
| **Bright Data Web Unlocker** | $$$ + black box. Crawlee + residential proxy é mais flexível. |
| **Puppeteer (sem Crawlee)** | Mesmo problema do Playwright puro. |

## Recomendação final

**ADOTAR Crawlee 3.x como framework base do Epic 7.** Justificativa:

1. **AdaptivePlaywrightCrawler é diferencial técnico** ✓ — speedup 3-4x esperado vs sempre-browser.
2. **AutoscaledPool é production-grade** ✓ — escala dinamica baseada em CPU/memória/event-loop.
3. **License Apache 2.0** ✓ — sem ônus.
4. **TypeScript native** ✓ — match com stack Epic 7.
5. **Comunidade saudável** ✓ — 23k stars, Apify-maintained, push hoje (2026-05-13).
6. **Session pool + proxy rotation built-in** ✓ — não reimplementar.
7. **Router pattern** ✓ — match com multi-page-type crawling.
8. **Hooks de extensibilidade** ✓ — `shouldPropagateError`, `resultChecker`, `resultComparator` cobrem 90% das customizações.

**Adicionar à Phase 5:** story Epic 7 "Scaffold do Crawler base (portal-crawler.ts + telemetria)" com responsável `@dev`, custo estimado 1 sprint (5 dias) — wrapper class + Supabase tables `crawl_*` + tests.

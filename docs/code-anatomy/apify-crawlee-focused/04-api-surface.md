# API Surface — Crawlee patterns for Epic 7

Patterns extraíveis e snippets minimal prontos para o scaffold do Epic 7. Todos os snippets são **válidos como ponto de partida** — adaptar a portal específico em implementation phase.

## 1. PlaywrightCrawler — pattern básico

```typescript
import { PlaywrightCrawler, Dataset } from 'crawlee';

const crawler = new PlaywrightCrawler({
  // Concorrência (override defaults para portais BR)
  minConcurrency: 2,
  maxConcurrency: 20,         // default 200 — muito alto para BR
  maxTasksPerMinute: 120,     // 2/seg max para evitar rate-limit

  // Retries
  maxRequestRetries: 3,
  requestHandlerTimeoutSecs: 60,
  navigationTimeoutSecs: 30,

  // Headless mode (default true em prod)
  headless: true,

  // Request handler
  async requestHandler({ page, request, log, enqueueLinks, pushData, session }) {
    log.info(`Scraping ${request.url}`);

    // Aguarda elemento crítico
    await page.waitForSelector('[data-cy="rp-property-card"]', { timeout: 10000 });

    // Extrai property cards
    const properties = await page.$$eval('[data-cy="rp-property-card"]', (cards) =>
      cards.map((card) => ({
        property_id: card.getAttribute('data-property-id'),
        list_price: card.querySelector('[data-cy="rp-cardProperty-price-txt"]')?.textContent?.trim(),
        address: card.querySelector('[data-cy="rp-cardProperty-location-txt"]')?.textContent?.trim(),
        url: (card.querySelector('a') as HTMLAnchorElement)?.href,
      })),
    );

    await pushData(properties);

    // Enqueue pagination
    await enqueueLinks({
      selector: 'a.pagination-next:not(.disabled)',
      label: 'LIST_PAGE',
    });
  },

  async failedRequestHandler({ request, log, error }) {
    log.error(`Request ${request.url} failed permanently: ${error.message}`);
    await Dataset.pushData({ url: request.url, error: error.message, failed: true });
  },
});

await crawler.run(['https://www.zapimoveis.com.br/...']);
```

## 2. AdaptivePlaywrightCrawler — pattern recomendado para Epic 7

```typescript
import { AdaptivePlaywrightCrawler, Dataset } from 'crawlee';

const crawler = new AdaptivePlaywrightCrawler({
  minConcurrency: 2,
  maxConcurrency: 20,
  maxTasksPerMinute: 120,
  maxRequestRetries: 3,
  requestHandlerTimeoutSecs: 60,

  // % de requests em que faz dual-run para treinar predictor
  renderingTypeDetectionRatio: 0.1,  // 10%

  // Decide se um erro deve ser propagado (sem fallback browser)
  shouldPropagateError: async (error, ctx) => {
    if (error.message.match(/40[39]/)) return true;       // 403/409 → anti-bot
    if (error.message.match(/429/)) return true;          // rate-limit → tentar proxy
    if (error.message.match(/cloudflare|cf-/i)) return true; // CF challenge
    return false;  // outros: tenta browser
  },

  // Valida result do HTTP-run — se inválido, tenta browser
  resultChecker: (result) => {
    if (result.datasetItems.length === 0) return false;
    return result.datasetItems.every(
      (item) => item.property_id && item.list_price,
    );
  },

  // Compara HTTP vs Browser result para treinar predictor
  resultComparator: (a, b) => {
    if (Math.abs(a.datasetItems.length - b.datasetItems.length) > 2) return 'different';
    const aIds = a.datasetItems.slice(0, 5).map((i) => i.property_id).sort();
    const bIds = b.datasetItems.slice(0, 5).map((i) => i.property_id).sort();
    return JSON.stringify(aIds) === JSON.stringify(bIds) ? 'equal' : 'inconclusive';
  },

  // requestHandler usa abstração comum (querySelector / parseWithCheerio)
  async requestHandler({ querySelector, parseWithCheerio, request, pushData, enqueueLinks }) {
    // Funciona idêntico em HTTP-mode e Browser-mode
    const $ = await parseWithCheerio('[data-cy="rp-property-card"]');

    const properties = $('[data-cy="rp-property-card"]').map((_, el) => ({
      property_id: $(el).attr('data-property-id'),
      list_price: $(el).find('[data-cy="rp-cardProperty-price-txt"]').text().trim(),
      address: $(el).find('[data-cy="rp-cardProperty-location-txt"]').text().trim(),
      url: $(el).find('a').attr('href'),
    })).get();

    await pushData(properties);
    await enqueueLinks({ selector: 'a.pagination-next:not(.disabled)' });
  },
});

await crawler.run(['https://www.zapimoveis.com.br/...']);
```

## 3. AutoscaledPool — uso direto (raro, mas útil)

> Em quase todos os casos você usa o pool implícito do crawler. Uso direto é para **pipelines custom** sem URLs (ex: processamento batch de CNPJs).

```typescript
import { AutoscaledPool } from 'crawlee';

const cnpjsToProcess = [...];
let index = 0;

const pool = new AutoscaledPool({
  minConcurrency: 1,
  maxConcurrency: 10,
  maxTasksPerMinute: 60,
  taskTimeoutSecs: 30,         // OVERRIDE default 0 (Infinity)!

  async runTaskFunction() {
    const cnpj = cnpjsToProcess[index++];
    await processCNPJ(cnpj);
  },

  async isTaskReadyFunction() {
    return index < cnpjsToProcess.length;
  },

  async isFinishedFunction() {
    return index >= cnpjsToProcess.length;
  },
});

await pool.run();
```

## 4. Pre/post navigation hooks

```typescript
const crawler = new AdaptivePlaywrightCrawler({
  preNavigationHooks: [
    // Cookie de consentimento (LGPD / GDPR banner)
    async ({ page, session }, gotoOpts) => {
      if (page) {
        await page.context().addCookies([
          { name: 'consent', value: 'accepted', domain: '.zapimoveis.com.br', path: '/' },
        ]);
      }
    },

    // Set custom headers via session
    async ({ session }, gotoOpts) => {
      gotoOpts.referer = 'https://www.google.com/';
    },
  ],

  postNavigationHooks: [
    // CAPTCHA / Cloudflare detection
    async ({ page, request, session }) => {
      if (!page) return;
      const title = (await page.title()).toLowerCase();
      if (title.includes('challenge') || title.includes('cloudflare')) {
        session?.markBad();
        throw new Error('Cloudflare challenge detected — retry with different session');
      }
    },

    // Detect login walls
    async ({ page }) => {
      if (!page) return;
      const url = page.url();
      if (url.includes('/login') || url.includes('/signin')) {
        throw new Error('Redirected to login wall');
      }
    },
  ],
});
```

## 5. Router pattern (multi-page-type crawlers)

```typescript
import { AdaptivePlaywrightCrawler, createPlaywrightRouter } from 'crawlee';

const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ request, enqueueLinks, log }) => {
  log.info(`Default handler for ${request.url}`);
  // Página inicial — enfileira todas as listing pages
  await enqueueLinks({
    selector: 'a[href*="/imoveis/"]',
    label: 'LIST_PAGE',
  });
});

router.addHandler('LIST_PAGE', async ({ parseWithCheerio, pushData, enqueueLinks }) => {
  const $ = await parseWithCheerio();
  const properties = $('[data-cy="rp-property-card"]').map((_, el) => ({ ... })).get();
  await pushData(properties);

  // Enfileira detail pages
  await enqueueLinks({
    selector: '[data-cy="rp-property-card"] a',
    label: 'DETAIL_PAGE',
  });

  // Próxima página de listing
  await enqueueLinks({
    selector: 'a.pagination-next',
    label: 'LIST_PAGE',
  });
});

router.addHandler('DETAIL_PAGE', async ({ parseWithCheerio, pushData, request }) => {
  const $ = await parseWithCheerio();
  await pushData({
    url: request.url,
    title: $('h1').text(),
    description: $('.property-description').text(),
    // ... full property details
  });
});

const crawler = new AdaptivePlaywrightCrawler({
  requestHandler: router,
  // ... outras opções
});
```

## 6. Session + Proxy configuration

```typescript
import { ProxyConfiguration, AdaptivePlaywrightCrawler } from 'crawlee';

const proxyConfiguration = new ProxyConfiguration({
  proxyUrls: [
    'http://user:pass@residential1.proxy.com:8000',
    'http://user:pass@residential2.proxy.com:8000',
    // ...
  ],
});

const crawler = new AdaptivePlaywrightCrawler({
  proxyConfiguration,

  // Session pool — cada session retém cookies + proxy + fingerprint
  useSessionPool: true,
  persistCookiesPerSession: true,

  sessionPoolOptions: {
    maxPoolSize: 50,
    sessionOptions: {
      maxUsageCount: 50,        // após 50 requests, descarta session
      maxErrorScore: 3,         // após 3 erros consecutivos, descarta
    },
  },

  async requestHandler({ session, page, request }) {
    // ... use session if needed
    // session.userData.someState = 'foo';
  },
});
```

## 7. Statistics customizadas (extender)

```typescript
// Em vez de re-implementar Statistics, capture as métricas via events
crawler.on('requestFinished', ({ request, response, durationMillis }) => {
  // Push para Vercel Analytics / Datadog / Supabase telemetry table
  void telemetry.recordRequest({
    portal: 'zap',
    url: request.url,
    status: response.statusCode,
    duration_ms: durationMillis,
    retries: request.retryCount,
  });
});

// E após cada run:
const stats = await crawler.stats.getCurrent();
console.log({
  totalRequests: stats.requestsFinished + stats.requestsFailed,
  successRate: stats.requestsFinished / (stats.requestsFinished + stats.requestsFailed),
  avgDuration: stats.requestAvgFinishedDurationMillis,
  // Adaptive-specific:
  httpOnlyRuns: (stats as any).httpOnlyRequestHandlerRuns,
  browserRuns: (stats as any).browserRequestHandlerRuns,
  mispredictions: (stats as any).renderingTypeMispredictions,
});
```

## 8. Configuration global

```typescript
import { Configuration } from 'crawlee';

// Definir storage path local (em dev)
Configuration.set('storageClientType', 'memory');
Configuration.set('disableBrowserSandbox', true);    // CI/Docker
Configuration.set('headlessBrowser', true);
Configuration.set('logLevel', 'INFO');
Configuration.set('purgeOnStart', false);            // mantém datasets entre runs
Configuration.set('persistStateIntervalMillis', 5_000);  // estatísticas a cada 5s
```

## Constantes operacionais críticas — defaults para Epic 7

| Setting | Default Crawlee | Recomendação Epic 7 | Justificativa |
|---|---|---|---|
| `minConcurrency` | 1 | **2** | Manter pelo menos 2 paralelo |
| `maxConcurrency` | 200 | **20** | Portais BR sensíveis |
| `maxRequestRetries` | 3 | **3** | OK |
| `requestHandlerTimeoutSecs` | 60 | **60** | OK |
| `navigationTimeoutSecs` | 60 | **30** | Falhar rápido em network slow |
| `taskTimeoutSecs` (AutoscaledPool) | 0 (Infinity) | **60** | SEMPRE override |
| `maxTasksPerMinute` | Infinity | **120** | 2/seg explícito |
| `renderingTypeDetectionRatio` | 0.1 | **0.1** primeiro mês, depois **0.05** | Aprender mais rápido inicialmente |
| `headless` | true | **true** | Prod |
| `useSessionPool` | false | **true** | Cookies + proxy persistence |
| `persistCookiesPerSession` | false | **true** | Reduz challenges anti-bot |
| `sessionPoolOptions.maxPoolSize` | 1000 | **50** | Conservador |
| `sessionOptions.maxUsageCount` | 50 | **50** | OK |
| `sessionOptions.maxErrorScore` | 3 | **3** | OK |

## Surface NÃO usada (skip)

- `PuppeteerCrawler` — Playwright é superior em compat browser e API
- `JSDOMCrawler` / `LinkedomCrawler` — use `parseWithCheerio()` no AdaptiveCrawler em vez disso
- `CheerioCrawler` separado — substituído pelo HTTP mode do Adaptive
- `HttpCrawler` — useful em casos puros, mas Adaptive cobre superset

## Anti-patterns observados (NÃO copiar)

- **Não use `page.evaluate()` para extrair muitos elementos** — Cheerio (`parseWithCheerio`) é 10x mais rápido para parse estático
- **Não set `headless: false` em CI/Docker** — recursos explodem
- **Não ignore `failedRequestHandler`** — sem ele, requests perdidos somem silenciosamente
- **Não use `Configuration.set` dentro do handler** — config é runtime-immutable após `crawler.run()`
- **Não persista state via `globalThis`** — use `crawler.useState()` ou `KeyValueStore`

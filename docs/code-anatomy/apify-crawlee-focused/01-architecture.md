# Architecture — apify/crawlee (FOCUSED)

## Hierarchy das classes

```
BasicCrawler  (packages/basic-crawler/src/internals/basic-crawler.ts)
  │
  ▼
BrowserCrawler<...>  (packages/browser-crawler/src/internals/browser-crawler.ts)
  │      gerencia: BrowserPool, sessões, cookies, proxy
  │
  ▼
PlaywrightCrawler   (packages/playwright-crawler/src/internals/playwright-crawler.ts:177)
  │      adiciona: Playwright launcher, pre/post navigation hooks
  │
  ▼
AdaptivePlaywrightCrawler  (packages/playwright-crawler/src/internals/adaptive-playwright-crawler.ts)
       adiciona: RenderingTypePredictor, fallback HTTP↔Browser
```

## Signature class `PlaywrightCrawler` (playwright-crawler.ts:177-191)

```typescript
export class PlaywrightCrawler extends BrowserCrawler<
    { browserPlugins: [PlaywrightPlugin] },
    LaunchOptions,
    PlaywrightCrawlingContext
> {
    protected static override optionsShape = {
        ...BrowserCrawler.optionsShape,
        browserPoolOptions: ow.optional.object,
        launcher: ow.optional.object,
    };
    // constructor herdado de BrowserCrawler
}
```

## Signature class `AdaptivePlaywrightCrawler` (adaptive-playwright-crawler.ts:248-264)

```typescript
export class AdaptivePlaywrightCrawler extends PlaywrightCrawler {
    private adaptiveRequestHandler: AdaptivePlaywrightCrawlerOptions['requestHandler'] & {};
    private renderingTypePredictor: NonNullable<AdaptivePlaywrightCrawlerOptions['renderingTypePredictor']>;
    private resultChecker: NonNullable<AdaptivePlaywrightCrawlerOptions['resultChecker']>;
    private shouldPropagateError: NonNullable<AdaptivePlaywrightCrawlerOptions['shouldPropagateError']>;
    private resultComparator: NonNullable<AdaptivePlaywrightCrawlerOptions['resultComparator']>;
    private preventDirectStorageAccess: boolean;
    declare readonly stats: AdaptivePlaywrightCrawlerStatistics;
    private inFlightRenderingTypeDetections = 0;

    override readonly router: RouterHandler<AdaptivePlaywrightCrawlerContext> =
        Router.create<AdaptivePlaywrightCrawlerContext>();

    constructor(
        options: AdaptivePlaywrightCrawlerOptions = {},
        override readonly config = Configuration.getGlobalConfig(),
    ) { ... }
}
```

## Options interface (extrato relevante)

```typescript
// playwright-crawler.ts:28-145 (resumido)
export interface PlaywrightCrawlerOptions
    extends BrowserCrawlerOptions<PlaywrightCrawlingContext, { browserPlugins: [PlaywrightPlugin] }> {
    launchContext?: PlaywrightLaunchContext;
    requestHandler?: PlaywrightRequestHandler;
    preNavigationHooks?: PlaywrightHook[];
    postNavigationHooks?: PlaywrightHook[];
}

// adaptive-playwright-crawler.ts:142-216 (resumido)
export interface AdaptivePlaywrightCrawlerOptions
    extends Omit<PlaywrightCrawlerOptions,
        'requestHandler' | 'handlePageFunction' | 'preNavigationHooks' | 'postNavigationHooks'> {
    requestHandler?: (context: LoadedContext<AdaptivePlaywrightCrawlerContext>) => Awaitable<void>;
    preNavigationHooks?: AdaptiveHook[];
    postNavigationHooks?: AdaptiveHook[];
    renderingTypeDetectionRatio?: number;      // default 0.1 (10% das requisições)
    resultChecker?: (result: RequestHandlerResult) => boolean;
    shouldPropagateError?: (error: Error, context: PlaywrightCrawlingContext) => Awaitable<boolean>;
    resultComparator?: (a: RequestHandlerResult, b: RequestHandlerResult)
        => boolean | 'equal' | 'different' | 'inconclusive';
    renderingTypePredictor?: Pick<RenderingTypePredictor, 'predict' | 'storeResult' | 'initialize'>;
    preventDirectStorageAccess?: boolean;       // default true
}
```

## CrawlingContext (interface herdada pelo user)

```typescript
// adaptive-playwright-crawler.ts:99-140
export interface AdaptivePlaywrightCrawlerContext<UserData extends Dictionary = Dictionary>
    extends RestrictedCrawlingContext<UserData> {
    response: BaseHttpResponseData;       // HTTP response (mesmo em modo browser)
    page: Page;                            // Playwright Page — lança erro se acessado em HTTP-only mode
    querySelector(selector: string, timeoutMs?: number): Promise<Cheerio<Element>>;
    waitForSelector(selector: string, timeoutMs?: number): Promise<void>;
    parseWithCheerio(selector?: string, timeoutMs?: number): Promise<CheerioRoot>;
}
```

**Insight chave:** `parseWithCheerio()` é a ponte que faz seu `requestHandler` funcionar **identicamente em HTTP e em browser mode** — o Adaptive crawler troca a fonte transparente.

## AutoscaledPool — arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│  AutoscaledPool  (core/src/autoscaling/autoscaled_pool.ts:163)   │
│                                                                   │
│  Configurable:                                                    │
│   • minConcurrency      = 1                                       │
│   • maxConcurrency      = 200    ← upper bound                    │
│   • desiredConcurrency  = (min)  ← arranque                       │
│   • desiredConcurrencyRatio = 0.90  ← gatilho de scale-up        │
│   • scaleUpStepRatio    = 0.05   ← +5% por scale-up              │
│   • scaleDownStepRatio  = 0.05   ← -5% por scale-down            │
│   • maybeRunIntervalSecs = 0.5   ← polling de novas tasks         │
│   • autoscaleIntervalSecs = 10   ← reavaliação                   │
│   • taskTimeoutSecs     = 0      ← Infinito (configurar!)         │
│   • maxTasksPerMinute   = Infinity                               │
│                                                                   │
│  Internal:                                                        │
│   • _currentConcurrency  ← tasks em flight                        │
│   • _tasksPerMinute[60]  ← rolling window                         │
│                                                                   │
└──────────────────────────────────────┬───────────────────────────┘
                                       │ "tem capacidade?"
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  SystemStatus  (core/src/autoscaling/system_status.ts)            │
│   Consulta `Snapshotter.getSnapshots()` e responde:                │
│   • isCurrentStateOk() — instante atual                            │
│   • isOkNow()          — janela curta (currentHistorySecs)         │
│   • isOkRecently()     — janela longa (maxHistorySecs)            │
└──────────────────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Snapshotter (core/src/autoscaling/snapshotter.ts)                │
│   Coleta a cada N ms snapshots de:                                 │
│   • CPU load                                                       │
│   • Memory usage                                                   │
│   • Event loop delay                                               │
│   • Client (Apify Platform) — sinal de throttle do storage         │
└──────────────────────────────────────┬───────────────────────────┘
                                       │ delega para
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Load Signals (interface LoadSignal)                              │
│   • CpuLoadSignal      — cpu_load_signal.ts                       │
│   • MemoryLoadSignal   — memory_load_signal.ts                    │
│   • EventLoopLoadSignal — event_loop_load_signal.ts               │
│   • ClientLoadSignal   — client_load_signal.ts                    │
└──────────────────────────────────────────────────────────────────┘
```

### Lógica de scaling (loop em `AutoscaledPool._autoscale()`)

```
A cada autoscaleIntervalSecs:
  status = systemStatus.isOkRecently()
  IF status.isOk:
     IF _currentConcurrency / _desiredConcurrency >= desiredConcurrencyRatio:
        _desiredConcurrency = floor(_desiredConcurrency * (1 + scaleUpStepRatio))
        _desiredConcurrency = min(_desiredConcurrency, _maxConcurrency)
  ELSE:
     _desiredConcurrency = ceil(_desiredConcurrency * (1 - scaleDownStepRatio))
     _desiredConcurrency = max(_desiredConcurrency, _minConcurrency)
```

> **Insight chave:** o pool **não escala se já não está saturado** — `desiredConcurrencyRatio=0.9` significa que só sobe se 90%+ dos slots estão sendo usados ativamente. Isso evita oversaturate em períodos de pouca demanda.

## Camadas lógicas — entrada → saída

```
User code
    │
    ▼  new PlaywrightCrawler({ requestHandler, ... })
PlaywrightCrawler (extends BrowserCrawler)
    │
    ▼  .run([urls...])
BasicCrawler.run()
    │
    ▼  Cria AutoscaledPool internamente
AutoscaledPool.run()  ← loop principal
    │
    ▼  Para cada slot livre:
    │     isTaskReadyFunction()  ← consulta RequestQueue
    │     runTaskFunction()       ← BasicCrawler._runRequestHandler()
    │                                  ↓
    │     BrowserCrawler._runRequestHandler()
    │                                  ↓
    │     PlaywrightCrawler._runRequestHandler()
    │                                  ↓
    │     [preNavigationHooks]
    │                                  ↓
    │     page.goto(request.url) via gotoExtended()
    │                                  ↓
    │     [postNavigationHooks]
    │                                  ↓
    │     user requestHandler({ page, request, log, session, ... })
    │                                  ↓
    │     await user callbacks (enqueueLinks, pushData, ...)
    ▼
Final stats
```

## AdaptivePlaywrightCrawler — fluxo interno

```
Para cada request:
  1. predictor.predict(request) → { renderingType: 'static'|'clientOnly', detectionProbabilityRecommendation }
  2. shouldDetect = Math.random() < detectionProbabilityRecommendation  // ~10% por default

  3. IF predicted='static' AND NOT shouldDetect:
       try plainHTTPRun = runRequestHandlerWithPlainHTTP(context)
       IF plainHTTPRun.ok AND resultChecker(plainHTTPRun.result):
            commit result → DONE (browser bypassed!)
       IF plainHTTPRun.error:
            IF shouldPropagateError(error) → throw (retry pipeline)
            ELSE → fallback to browser navigation

  4. IF predicted='clientOnly' OR shouldDetect OR HTTP failed:
       browserRun = runRequestHandlerWithBrowser(context)
       commit result

  5. IF shouldDetect:
       Compare plainHTTPRun.result vs browserRun.result via resultComparator
       IF equal → predictor.storeResult(request, 'static')
       IF different → predictor.storeResult(request, 'clientOnly')
       IF inconclusive → no update
```

## Componentes auxiliares relevantes

### `RenderingTypePredictor` (referenced in adaptive-playwright-crawler.ts:7)
- Implementação: `packages/playwright-crawler/src/internals/utils/rendering-type-prediction.ts`
- Usa **regressão logística** (modelo serializado em `logistic-regression.d.ts`)
- Features: URL pattern, hostname, path depth, query string presence
- Output: probabilidade `[0,1]` de "static rendering"

### `Statistics` / `AdaptivePlaywrightCrawlerStatistics` (adaptive-playwright-crawler.ts:54-92)

Métricas custom adicionadas:
- `httpOnlyRequestHandlerRuns` — quantas requisições foram resolvidas HTTP-only
- `browserRequestHandlerRuns` — quantas precisaram de browser
- `renderingTypeMispredictions` — quantas vezes o predictor errou

> **Insight chave:** essas métricas servem **diretamente** para SLO/observability em Epic 7. Adicionar essas 3 contadores em painel Grafana/Vercel Analytics.

## Stack interno (dependencies relevantes)

| Dependency | Função |
|---|---|
| `playwright` | Browser automation |
| `cheerio` | Server-side DOM parsing (HTTP-only mode) |
| `ow` | Runtime type validation (parameter shapes) |
| `lodash.isequal` | Deep comparison no resultComparator |
| `type-fest` | Helper types (SetRequired) |
| `@apify/log` | Logging com prefixes hierárquicos |
| `@apify/timeout` | `addTimeoutToPromise` — timeout wrapping |
| `@apify/utilities` | `betterSetInterval` — interval com cleanup confiável |

## Risk surface (do ponto de vista Epic 7)

- **`taskTimeoutSecs: 0` é default (no timeout)** — em produção, **sempre setar** (`60` segundos recomendado).
- **`maxConcurrency: 200` é default** — muito alto para portais BR sensíveis. Definir explicitamente `maxConcurrency: 20` para Zap/OLX/VivaReal.
- **`browserPoolOptions` defaults** podem manter browsers indefinidamente — investigar `closeInactiveBrowserAfterSecs`.
- **AdaptivePlaywrightCrawler é `@experimental`** — pode ter breaking changes em minor versions. Pinar versão em `package.json`.
- **Sem retry no `runTaskFunction` do AutoscaledPool** — retry é responsabilidade do `BasicCrawler` (via `maxRequestRetries`). Verificar que isso está setado.
- **`renderingTypePredictor` é stateful** — em runs distribuídos, **não há sync entre instâncias**. Cada worker re-aprende. Considerar persistir estado em KeyValueStore.

## Pontos fortes para Epic 7

- ✓ **Adaptive HTTP/Browser** poupa 60-80% do tempo em sites estáticos (esperado em listing pages de portais).
- ✓ **AutoscaledPool é production-grade** — usado em milhares de crawlers Apify Platform.
- ✓ **Session pool integrado** — cada session leva um conjunto de cookies + proxy + fingerprint, reduzindo bloqueio.
- ✓ **Built-in retry with exponential backoff** — config simples em `maxRequestRetries`.
- ✓ **TypeScript first-class** — types completos, sem `any` em paths críticos.

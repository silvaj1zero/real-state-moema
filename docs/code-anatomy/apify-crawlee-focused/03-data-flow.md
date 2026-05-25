# Data Flow — AdaptivePlaywrightCrawler request lifecycle

## Request lifecycle completo (do enqueue ao commit)

```
═══════════════════════════════════════════════════════════════════════════════
PHASE 1 — User enqueue
═══════════════════════════════════════════════════════════════════════════════
  await crawler.run(['https://zapimoveis.com.br/...', ...])
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 2 — BasicCrawler.run() → AutoscaledPool.run()
═══════════════════════════════════════════════════════════════════════════════
  AutoscaledPool loops:
    Para cada slot livre (até desiredConcurrency):
      • isTaskReadyFunction() → consulta RequestQueue
      • runTaskFunction() → AdaptivePlaywrightCrawler._runRequestHandler()
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 3 — _runRequestHandler em AdaptivePlaywrightCrawler
(adaptive-playwright-crawler.ts:_runRequestHandler override)
═══════════════════════════════════════════════════════════════════════════════
  1. renderingTypePrediction = renderingTypePredictor.predict(request)
     → { renderingType: 'static' | 'clientOnly',
         detectionProbabilityRecommendation: number ∈ [0,1] }

  2. shouldDetectRenderingType = Math.random() < detectionProbabilityRecommendation
     // Default detection ratio = 0.1 → 10% das requests fazem dual-run

  3. IF shouldDetectRenderingType:
        inFlightRenderingTypeDetections++
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 4 — Decision tree (HTTP-only vs Browser)
═══════════════════════════════════════════════════════════════════════════════

  ┌──────────────────────────────────────────────────────────────┐
  │ PATH A — Predicted "static" AND NOT detecting                │
  │                                                                │
  │   stats.trackHttpOnlyRequestHandlerRun()                       │
  │   plainHTTPRun = runRequestHandlerWithPlainHTTP(crawlingCtx)   │
  │                                                                │
  │   IF plainHTTPRun.ok AND resultChecker(plainHTTPRun.result):   │
  │       commitResult(crawlingCtx, plainHTTPRun.result)           │
  │       return  ✓ DONE — browser BYPASSED                        │
  │                                                                │
  │   IF NOT plainHTTPRun.ok:                                      │
  │       error = plainHTTPRun.error                               │
  │       IF shouldPropagateError(error, crawlingCtx):             │
  │           throw error  ← propaga para retry handler            │
  │       ELSE:                                                    │
  │           log.exception(error)                                 │
  │           [fall-through para PATH B]                           │
  │                                                                │
  │   IF plainHTTPRun.ok BUT NOT resultChecker passed:             │
  │       log.warning("suspicious result")                         │
  │       stats.trackRenderingTypeMisprediction()                  │
  │       [fall-through para PATH B]                               │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │ PATH B — Predicted "clientOnly" OR detecting OR HTTP failed   │
  │                                                                │
  │   stats.trackBrowserRequestHandlerRun()                        │
  │   browserRun = runRequestHandlerWithBrowser(crawlingCtx)       │
  │                                                                │
  │   IF shouldDetectRenderingType AND plainHTTPRun exists:        │
  │       comparison = resultComparator(plainHTTPRun.result,        │
  │                                     browserRun.result)         │
  │       IF comparison === true OR === 'equal':                   │
  │           predictor.storeResult(request, 'static')             │
  │           // Próxima request similar usará HTTP-only            │
  │       ELIF comparison === false OR === 'different':            │
  │           predictor.storeResult(request, 'clientOnly')         │
  │       ELIF comparison === 'inconclusive':                      │
  │           // No update                                          │
  │                                                                │
  │   commitResult(crawlingCtx, browserRun.result)                 │
  └──────────────────────────────────────────────────────────────┘

  4. inFlightRenderingTypeDetections-- (se incrementado)
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 5 — Inside runRequestHandlerWithPlainHTTP (HTTP-only mode)
═══════════════════════════════════════════════════════════════════════════════

  1. Faz `fetch(request.url)` via @crawlee/http (got-scraping)
     • Inclui headers do session (cookies + UA fingerprint)
     • Aplica proxy se configurado
     • Aplica retries (got-scraping internal)

  2. Parseia response com cheerio (load(html))

  3. Constrói RestrictedCrawlingContext:
     • request, response, log, session, id
     • querySelector(selector) → await cheerio find
     • waitForSelector(selector) → cheerio sync (no real wait)
     • parseWithCheerio(selector) → cheerio root
     • page = throwOnAccess()  ← acessar `page` lança erro

  4. Captura logs via proxy (LogProxyCall[])
     • Permite "rewind" dos logs se HTTP run for descartado

  5. try {
        await user requestHandler(restrictedCtx)
        return { ok: true, result: requestHandlerResult, logs }
     } catch (err) {
        return { ok: false, error: err, logs }
     }
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 6 — Inside runRequestHandlerWithBrowser (Playwright mode)
═══════════════════════════════════════════════════════════════════════════════

  1. Acquire Page from BrowserPool
     • Reusa browser context se compatível (mesmo proxy/session)
     • Cria new tab (Page)

  2. Execute preNavigationHooks (sequencial)
     • Set cookies, additional headers

  3. page.goto(request.url, gotoOptions)
     • Default: waitUntil='load', timeout=30s

  4. Execute postNavigationHooks
     • Check for CAPTCHA, anti-bot challenges

  5. Construct PlaywrightCrawlingContext:
     • request, response, log, session, id
     • page (Playwright Page)
     • browserController (BrowserController)
     • querySelector(sel) → cheerio of page.content() filtered
     • waitForSelector(sel) → page.waitForSelector(sel)
     • parseWithCheerio(sel?) → cheerio of page.content()

  6. try {
        await user requestHandler(playwrightCtx)
        return { ok: true, result, logs }
     } catch (err) {
        return { ok: false, error: err, logs }
     }

  7. Release Page back to BrowserPool (closes tab; browser stays alive)
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 7 — commitResult (transactional finalization)
═══════════════════════════════════════════════════════════════════════════════

  withCheckedStorageAccess(async () => {
    // Replay logs to actual logger (now we know which run "won")
    for (const [log, method, ...args] of logs) {
      log[method](...args);
    }

    // Persist enqueued links
    for (const link of result.enqueueLinks) {
      await requestQueue.addRequest(link);
    }

    // Persist dataset items
    for (const item of result.datasetItems) {
      await dataset.pushData(item);
    }

    // Persist key-value pairs
    for (const kv of result.keyValueStore) {
      await keyValueStore.setValue(kv.key, kv.value);
    }
  })
                                    │
                                    ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 8 — Statistics update
═══════════════════════════════════════════════════════════════════════════════

  stats.persistState()  // se intervalo de persist atingido
  emit('requestFinished', { request, response, durationMillis })
```

## Trecho-chave do _runRequestHandler (adaptive-playwright-crawler.ts)

```typescript
// _runRequestHandler decision logic
protected override async _runRequestHandler(crawlingContext: PlaywrightCrawlingContext): Promise<void> {
    const renderingTypePrediction = this.renderingTypePredictor.predict(crawlingContext.request);
    const shouldDetectRenderingType = Math.random() < renderingTypePrediction.detectionProbabilityRecommendation;

    if (shouldDetectRenderingType) {
        this.inFlightRenderingTypeDetections++;
    }

    try {
        if (renderingTypePrediction.renderingType === 'static' && !shouldDetectRenderingType) {
            this.stats.trackHttpOnlyRequestHandlerRun();
            const plainHTTPRun = await this.runRequestHandlerWithPlainHTTP(crawlingContext);

            if (plainHTTPRun.ok && this.resultChecker(plainHTTPRun.result)) {
                plainHTTPRun.logs?.forEach(([log, method, ...args]) => log[method](...args));
                await this.commitResult(crawlingContext, plainHTTPRun.result);
                return;
            }
            if (!plainHTTPRun.ok) {
                const error = plainHTTPRun.error as Error;
                if (await this.shouldPropagateError(error, crawlingContext)) {
                    throw error;
                }
                crawlingContext.log.exception(error, `HTTP-only request handler failed for ${crawlingContext.request.url}`);
            } else {
                crawlingContext.log.warning(`HTTP-only request handler returned a suspicious result for ${crawlingContext.request.url}`);
                this.stats.trackRenderingTypeMisprediction();
            }
        }
        // ... fallback to browser run (mesma lógica + comparator)
    } finally {
        if (shouldDetectRenderingType) {
            this.inFlightRenderingTypeDetections--;
        }
    }
}
```

## Timing benchmarks aproximados (extraídos de docs upstream + commits recentes)

| Cenário | Tempo médio por request |
|---|---|
| HTTP-only (static site) | 200-500ms |
| Browser navigation (cold) | 2-5s (boot do browser) |
| Browser navigation (warm) | 800ms-2s (page já no pool) |
| HTTP attempt + browser fallback | HTTP-only + browser sequencial (custo somado) |

> **Estratégia Epic 7:** se 70% dos URLs do Zap são statically rendered, o speedup esperado é ~3-4x (vs full Playwright sempre).

## Pontos de extensão críticos para Epic 7

### Hook 1: `shouldPropagateError`

```typescript
shouldPropagateError: async (error, ctx) => {
  // 403/429 → propagar (não tentar browser, é anti-bot, já vai falhar)
  if (error.message.includes('403') || error.message.includes('429')) return true;
  // Captcha → propagar (já falhamos identificando, retry com proxy diferente)
  if (error.message.includes('captcha')) return true;
  // Network errors → false (fallback to browser, talvez JS-based fix)
  return false;
}
```

### Hook 2: `resultChecker`

```typescript
// "Result parece suspeito?" — se sim, tenta browser
resultChecker: (result) => {
  // Aceitamos só se temos pelo menos 1 imóvel
  if (result.datasetItems.length === 0) return false;
  // Aceitamos só se primeiro item tem campos obrigatórios
  const first = result.datasetItems[0];
  return Boolean(first.property_id && first.list_price);
}
```

### Hook 3: `resultComparator` (para detecção)

```typescript
resultComparator: (plainResult, browserResult) => {
  // Compara count de listings extraídos
  if (Math.abs(plainResult.datasetItems.length - browserResult.datasetItems.length) > 2) {
    return 'different';  // Diferença significativa
  }
  // Compara primeiros 5 property_ids
  const plainIds = plainResult.datasetItems.slice(0, 5).map(i => i.property_id);
  const browserIds = browserResult.datasetItems.slice(0, 5).map(i => i.property_id);
  if (JSON.stringify(plainIds) === JSON.stringify(browserIds)) return 'equal';
  return 'inconclusive';
}
```

### Hook 4: `preNavigationHooks` (cookies/headers)

```typescript
preNavigationHooks: [
  async (ctx, gotoOpts) => {
    if (ctx.page) {
      await ctx.page.context().addCookies([
        { name: 'consent', value: 'accepted', domain: '.zapimoveis.com.br', path: '/' },
      ]);
    }
  },
]
```

### Hook 5: `postNavigationHooks` (CAPTCHA detection)

```typescript
postNavigationHooks: [
  async (ctx) => {
    if (ctx.page) {
      const title = await ctx.page.title();
      if (title.toLowerCase().includes('cloudflare') || title.includes('cf-')) {
        throw new Error('Cloudflare challenge — retry with different proxy');
      }
    }
  },
]
```

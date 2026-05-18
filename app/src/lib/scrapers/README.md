# `app/src/lib/scrapers/` — Epic 7 Portal Crawler Wrapper

**Story:** 7.2 — Wrapper PortalCrawler + Telemetry Layer
**Path canonico:** definido em `ADR-EPIC7-006-workspace-layout.md` (in-app monolith)

## Visao geral

Wrapper minimalista sobre `AdaptivePlaywrightCrawler` (Crawlee 3.16+) que padroniza:

- Concurrency, retries, session pool, rate limits (defaults Wave A)
- Hooks anti-bot (Cloudflare, CAPTCHA, login wall)
- Hooks pre-navigation (cookies LGPD consent, referer plausivel)
- Telemetria automatica em `crawl_runs` / `crawl_requests` / `crawl_failures`

Cada portal especifico (MercadoLivre — Story 7.4, QuintoAndar — Wave B, etc.) consome este wrapper e fornece apenas:

1. `requestHandler` (logica de extracao do portal)
2. `portal` slug
3. `proxyConfiguration`
4. URLs iniciais (`crawler.run([...])`)

## Pureza TS (ADR-EPIC7-006)

Todo o codigo em `app/src/lib/scrapers/` e **TS puro**:

- Nenhum import de `next/*` ou helpers Next-server
- Cliente Supabase via `@supabase/supabase-js` puro, env vars no constructor
- Apto para copy-on-build em `apps/crawlers/{portal}/` (Apify Actors — sync script Story 7.4)

## Como criar um novo portal crawler

```ts
// apps/crawlers/mercadolivre/src/main.ts (ou route handler Wave A)
import { createPortalCrawler, Telemetry } from '@/lib/scrapers'
import { ProxyConfiguration } from 'crawlee'

async function main() {
  const tel = new Telemetry({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  })

  await tel.startRun('mercadolivre')

  const crawler = createPortalCrawler({
    portal: 'mercadolivre',
    telemetry: tel,
    proxyConfiguration: await ProxyConfiguration.open({
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
    }),
    requestHandler: async ({ page, request, pushData }) => {
      // ... parsers especificos do MercadoLivre
      await pushData({
        portal_listing_id: 'MLB-12345',
        list_price: 850_000_00, // centavos
        // ...
      })
    },
  })

  try {
    await crawler.run([
      'https://lista.mercadolivre.com.br/imoveis/sao-paulo/zona-sul/',
    ])
    await tel.finishRun('completed')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await tel.finishRun('failed', msg)
    throw err
  }
}
```

## Defaults Wave A

Constante exportada como `PORTAL_CRAWLER_DEFAULTS` em `portal-crawler.ts`:

| Default | Valor | Justificativa |
|---|---|---|
| `minConcurrency` | 2 | Warm-up rapido sem martelar portal |
| `maxConcurrency` | 20 | Limite Apify-proxy RESIDENTIAL Wave A |
| `maxTasksPerMinute` | 120 | Polite ~2 req/s |
| `maxRequestRetries` | 3 | Suficiente para 5xx/timeout transitorio |
| `requestHandlerTimeoutSecs` | 60 | Listings com lazy-load demoram |
| `navigationTimeoutSecs` | 30 | goto isolado |
| `renderingTypeDetectionRatio` | 0.1 | 10% Playwright, 90% HTTP (custo) |
| `useSessionPool` | true | Cookies persistentes por sessao |
| `persistCookiesPerSession` | true | LGPD banners exigem |
| `sessionPoolOptions.maxPoolSize` | 50 | Suficiente Wave A |

Overrides via `overrides: Partial<AdaptivePlaywrightCrawlerOptions>` — justificar em ADR antes de divergir.

## Hooks default (5 total)

| Hook | Tipo | Funcao |
|---|---|---|
| `makeConsentCookieHook(portal)` | preNavigation | Injeta cookies LGPD consent |
| `makeRefererHook()` | preNavigation | Referer `google.com.br` + `Accept-Language: pt-BR` |
| `antiBotDetectionHook` | postNavigation | Throw `AntiBotDetectedError` em Cloudflare 503 / CAPTCHA |
| `loginWallDetectionHook` | postNavigation | Throw `LoginWallDetectedError` em pagina de login |
| `makeDefaultResultChecker(portal)` | resultChecker | Valida `portal_listing_id` + `list_price > 0` |

`shouldPropagateError` decide se um erro propaga (request marcado `noRetry`) ou deve ser tentado novamente.

## Telemetria

Cada `Telemetry` mantem contadores in-memory (`snapshot()` O(1)) e persiste fire-and-forget em:

- `crawl_runs` (1 row por run, com counters agregados em `finishRun`)
- `crawl_requests` (1 row por URL completada)
- `crawl_failures` (1 row por falha definitiva apos retries esgotados)

Schema criado pela migration `supabase/migrations/20260514000002_009_epic7_telemetry.sql`.

**AC5:** Story 7.6 cron job consome `crawl_runs` via `fn_mark_stale_runs()` (definida em migration 013, NAO aqui). Schema-compat garantido: colunas `status`, `started_at`, `finished_at`, `error_message` com semantica esperada.

## Anti-bot strategy

| Sinal detectado | Acao |
|---|---|
| HTTP 401/403/451 | `noRetry` — provavel block geo/IP banido |
| HTTP 429 | `noRetry` (sessao queimou) — AutoscaledPool reduz concurrency |
| Cloudflare 503 + `Server: cloudflare` | Propaga, descarta sessao |
| `<title>Just a moment...</title>` | Propaga |
| `class="g-recaptcha"` no HTML | Propaga |
| HTTP 5xx generico | Retry com novo proxy |
| `ECONNRESET` / timeout | Retry com novo proxy |
| `<title>Login</title>` | `LoginWallDetectedError` — URL requer auth |

## Proxy pool

- **Wave A:** Apify-managed `RESIDENTIAL` group (`useApifyProxy: true`)
- **Wave B (>= 50k pgs/mes):** IPRoyal URLs explicitas (decisao `ADR-EPIC7-002`)

Trocar e passar nova `proxyConfiguration` no `createPortalCrawler({ proxyConfiguration })` — codigo do wrapper nao muda.

## Limitacoes conhecidas

- `AdaptivePlaywrightCrawler` e marcado `@experimental` no Crawlee — versao pinada em `package.json` (`crawlee@^3.16.0`)
- Edge Function timeout 5s: NUNCA executar `.run()` dentro de Edge Function — Edge dispara webhook Apify e retorna; Actor executa o crawl asincronamente
- `pgmq` opcional Wave A; obrigatorio Wave B se decompor steps longos

## Referencia primaria

- `docs/code-anatomy/apify-crawlee-focused/extraction-notes.md` Sec. 1 (Wrapper class) + Sec. 2 (Telemetry)
- `docs/architecture/adrs/ADR-EPIC7-006-workspace-layout.md` (pureza TS + copy-on-build)
- `docs/architecture/adrs/ADR-EPIC7-002-proxy-pool.md` (Wave A→B proxy strategy)

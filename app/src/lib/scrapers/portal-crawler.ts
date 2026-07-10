/**
 * Epic 7 — PortalCrawler wrapper (Story 7.2 AC1).
 *
 * Encapsula `AdaptivePlaywrightCrawler` do Crawlee com defaults Wave A
 * (concurrency, retries, session pool, hooks anti-bot + LGPD consent).
 * Cada portal especifico (MercadoLivre Wave A — Story 7.4, QuintoAndar
 * Wave B etc.) consome este wrapper e fornece apenas:
 *  - requestHandler (logica de extracao)
 *  - portal slug
 *  - proxyConfiguration (Apify | IPRoyal)
 *  - startUrls
 *
 * PUREZA TS: ZERO import de `next/*`. Codigo deve poder ser copiado
 * para `apps/crawlers/{portal}/` em Apify Actors (ADR-EPIC7-006,
 * sync script — Story 7.4).
 *
 * Ref: docs/code-anatomy/apify-crawlee-focused/extraction-notes.md Sec. 1
 */

import {
  AdaptivePlaywrightCrawler,
  type AdaptivePlaywrightCrawlerOptions,
  type ProxyConfiguration,
} from 'crawlee'

import type { Portal } from '@/lib/schemas/epic7'

import {
  makeConsentCookieHook,
  makeRefererHook,
  type PreNavHook,
} from './hooks/preNavigationHooks'
import {
  antiBotDetectionHook,
  loginWallDetectionHook,
  AntiBotDetectedError,
  type PostNavHook,
} from './hooks/postNavigationHooks'
import {
  makeDefaultResultChecker,
  type ResultChecker,
} from './hooks/resultChecker'
import { defaultResultComparator } from './hooks/resultComparator'
import { shouldPropagateError } from './hooks/shouldPropagateError'
import type { Telemetry } from './telemetry'

// ---------------------------------------------------------------------------
// Defaults (Wave A — extraction-notes.md Sec. 1)
// ---------------------------------------------------------------------------

export const PORTAL_CRAWLER_DEFAULTS = {
  minConcurrency: 2,
  maxConcurrency: 20,
  maxTasksPerMinute: 120,
  maxRequestRetries: 3,
  requestHandlerTimeoutSecs: 60,
  navigationTimeoutSecs: 30,
  renderingTypeDetectionRatio: 0.1,
  useSessionPool: true,
  persistCookiesPerSession: true,
  sessionPoolMaxSize: 50,
} as const

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface PortalCrawlerOptions {
  /** Portal slug (zap | olx | vivareal | mercadolivre). */
  portal: Portal

  /**
   * Telemetria opcional. Quando passada, recordRequest/recordFailure
   * sao chamados automaticamente a partir dos hooks.
   */
  telemetry?: Telemetry

  /**
   * Request handler especifico do portal. Recebe ctx do Crawlee.
   * Tipamos como `unknown` aqui para nao forcar import de Playwright
   * em consumidores HTTP-only — cada portal cast para o tipo correto.
   */
  requestHandler: NonNullable<AdaptivePlaywrightCrawlerOptions['requestHandler']>

  /** Proxy pool (Apify-managed Wave A; IPRoyal Wave B). */
  proxyConfiguration?: ProxyConfiguration

  /** Override de defaults — usar com parsimonia, justificar em ADR. */
  overrides?: Partial<AdaptivePlaywrightCrawlerOptions>

  /** Validador custom de result (default: portal_listing_id + list_price). */
  resultChecker?: ResultChecker

  /** Hooks extras pre-navigation (executam apos os defaults). */
  preNavigationHooks?: PreNavHook[]

  /** Hooks extras post-navigation (executam apos os defaults). */
  postNavigationHooks?: PostNavHook[]
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Constroi um AdaptivePlaywrightCrawler com defaults Wave A + hooks
 * standard. Retorna instance pronta para `.run(startUrls)`.
 *
 * A funcao NAO inicia o crawler — caller controla lifecycle.
 *
 * @example
 * ```ts
 * const tel = new Telemetry({ supabaseUrl, supabaseServiceRoleKey })
 * await tel.startRun('mercadolivre')
 * const crawler = createPortalCrawler({
 *   portal: 'mercadolivre',
 *   telemetry: tel,
 *   requestHandler: async ({ page, request, pushData }) => { ... },
 * })
 * await crawler.run(['https://lista.mercadolivre.com.br/imoveis/'])
 * await tel.finishRun('completed')
 * ```
 */
export function createPortalCrawler(
  opts: PortalCrawlerOptions,
): AdaptivePlaywrightCrawler {
  const checker = opts.resultChecker ?? makeDefaultResultChecker(opts.portal)

  const defaultPreNav: PreNavHook[] = [
    makeConsentCookieHook(opts.portal),
    makeRefererHook(),
  ]
  const defaultPostNav: PostNavHook[] = [
    antiBotDetectionHook,
    loginWallDetectionHook,
  ]

  const preNavHooks = [...defaultPreNav, ...(opts.preNavigationHooks ?? [])]
  const postNavHooks = [...defaultPostNav, ...(opts.postNavigationHooks ?? [])]

  // Wrap requestHandler para capturar telemetria automaticamente.
  const tel = opts.telemetry
  const wrappedHandler: AdaptivePlaywrightCrawlerOptions['requestHandler'] =
    async (ctx) => {
      const url = ctx.request.url
      const start = Date.now()
      try {
        await opts.requestHandler(ctx)
        if (tel) {
          // status code real vem do response do Crawlee context
          const statusCode = readStatusCode(ctx)
          tel.recordRequest(url, statusCode, Date.now() - start, 0)
        }
      } catch (err) {
        if (tel) {
          const msg = err instanceof Error ? err.message : String(err)
          const stack = err instanceof Error ? err.stack ?? null : null
          // Story 7.12 AC4 — anti-bot (Cloudflare) conta como bloqueio.
          tel.recordFailure(url, msg, stack, { blocked: isBlockError(err) })
        }
        throw err
      }
    }

  const config: AdaptivePlaywrightCrawlerOptions = {
    minConcurrency: PORTAL_CRAWLER_DEFAULTS.minConcurrency,
    maxConcurrency: PORTAL_CRAWLER_DEFAULTS.maxConcurrency,
    maxRequestsPerMinute: PORTAL_CRAWLER_DEFAULTS.maxTasksPerMinute,
    maxRequestRetries: PORTAL_CRAWLER_DEFAULTS.maxRequestRetries,
    requestHandlerTimeoutSecs:
      PORTAL_CRAWLER_DEFAULTS.requestHandlerTimeoutSecs,
    navigationTimeoutSecs: PORTAL_CRAWLER_DEFAULTS.navigationTimeoutSecs,
    renderingTypeDetectionRatio:
      PORTAL_CRAWLER_DEFAULTS.renderingTypeDetectionRatio,
    useSessionPool: PORTAL_CRAWLER_DEFAULTS.useSessionPool,
    persistCookiesPerSession:
      PORTAL_CRAWLER_DEFAULTS.persistCookiesPerSession,
    sessionPoolOptions: {
      maxPoolSize: PORTAL_CRAWLER_DEFAULTS.sessionPoolMaxSize,
    },
    proxyConfiguration: opts.proxyConfiguration,
    requestHandler: wrappedHandler,
    preNavigationHooks: preNavHooks as unknown as AdaptivePlaywrightCrawlerOptions['preNavigationHooks'],
    postNavigationHooks: postNavHooks as unknown as AdaptivePlaywrightCrawlerOptions['postNavigationHooks'],
    resultChecker: ((r: unknown) =>
      checker(r as Parameters<ResultChecker>[0])) as unknown as AdaptivePlaywrightCrawlerOptions['resultChecker'],
    resultComparator:
      defaultResultComparator as unknown as AdaptivePlaywrightCrawlerOptions['resultComparator'],
    failedRequestHandler: async ({ request }, error) => {
      const msg = error instanceof Error ? error.message : String(error)
      if (tel) {
        const stack = error instanceof Error ? error.stack ?? null : null
        // Story 7.12 AC4 — anti-bot (Cloudflare) conta como bloqueio.
        tel.recordFailure(request.url, msg, stack, { blocked: isBlockError(error) })
      }
      // shouldPropagateError = true → no point in retry; we rely on Crawlee
      // already exhausted maxRequestRetries before reaching here.
      const propagate = shouldPropagateError({
        errorMessage: msg,
      })
      // Annotate (Crawlee will use this to decide noRetry).
      if (propagate) {
        request.noRetry = true
      }
    },
    ...(opts.overrides ?? {}),
  }

  return new AdaptivePlaywrightCrawler(config)
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface CtxWithResponse {
  response?: { status?: () => number } | null
}

function readStatusCode(ctx: unknown): number | null {
  const r = (ctx as CtxWithResponse)?.response
  if (!r) return null
  try {
    return typeof r.status === 'function' ? r.status() : null
  } catch {
    return null
  }
}

/**
 * Story 7.12 AC4 — true se o erro for um bloqueio anti-bot (Cloudflare).
 * Detecta a `AntiBotDetectedError` direta e, defensivamente, o erro
 * re-empacotado pelo Crawlee (por nome/mensagem) antes do
 * `failedRequestHandler`.
 */
function isBlockError(err: unknown): boolean {
  if (err instanceof AntiBotDetectedError) return true
  if (err instanceof Error) {
    return err.name === 'AntiBotDetectedError' || /anti-bot detected/i.test(err.message)
  }
  return false
}

// Re-export public types so consumers can `import { PortalCrawlerOptions }`
// without reaching into hooks/.
export type { ResultChecker } from './hooks/resultChecker'
export type { PreNavHook } from './hooks/preNavigationHooks'
export type { PostNavHook } from './hooks/postNavigationHooks'

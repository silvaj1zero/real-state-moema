/**
 * portal-crawler tests — AC1 + AC7.
 *
 * Estrategia: mock `crawlee` para capturar as options passadas ao
 * construtor de AdaptivePlaywrightCrawler. Validamos que defaults
 * AC1, hooks AC2 e wiring de telemetry AC3 estao no lugar — sem
 * iniciar um browser real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock factory MUST ser stateful (capturar last config) e exportar
// AdaptivePlaywrightCrawler como class. Usamos vi.hoisted para fugir
// do limite "no top-level vars in vi.mock factory" (vitest hoisting).
const { FakeAdaptivePlaywrightCrawler, constructedConfigs } = vi.hoisted(() => {
  const configs: unknown[] = []
  class Fake {
    config: unknown
    constructor(config: unknown) {
      this.config = config
      configs.push(config)
    }
    async run(): Promise<void> {
      /* noop */
    }
  }
  return { FakeAdaptivePlaywrightCrawler: Fake, constructedConfigs: configs }
})

vi.mock('crawlee', () => ({
  AdaptivePlaywrightCrawler: FakeAdaptivePlaywrightCrawler,
}))

import {
  createPortalCrawler,
  PORTAL_CRAWLER_DEFAULTS,
} from '@/lib/scrapers/portal-crawler'
import {
  Telemetry,
  type TelemetryClient,
  type CrawlRunInsert,
  type CrawlRequestInsert,
  type CrawlFailureInsert,
  type CrawlRunSnapshot,
} from '@/lib/scrapers/telemetry'

// Lightweight TelemetryClient capturing calls.
class CaptureClient implements TelemetryClient {
  requests: CrawlRequestInsert[] = []
  failures: CrawlFailureInsert[] = []
  async insertRun(row: CrawlRunInsert): Promise<{ id: string }> {
    return { id: `run-${row.portal}` }
  }
  async updateRun(): Promise<void> {}
  async insertRequest(row: CrawlRequestInsert): Promise<void> {
    this.requests.push(row)
  }
  async insertFailure(row: CrawlFailureInsert): Promise<void> {
    this.failures.push(row)
  }
  async fetchRun(): Promise<CrawlRunSnapshot | null> {
    return null
  }
}

beforeEach(() => {
  constructedConfigs.length = 0
})

interface CrawlerConfigShape {
  minConcurrency: number
  maxConcurrency: number
  maxRequestsPerMinute: number
  maxRequestRetries: number
  requestHandlerTimeoutSecs: number
  navigationTimeoutSecs: number
  renderingTypeDetectionRatio: number
  useSessionPool: boolean
  persistCookiesPerSession: boolean
  sessionPoolOptions: { maxPoolSize: number }
  preNavigationHooks: unknown[]
  postNavigationHooks: unknown[]
  requestHandler: (ctx: unknown) => Promise<void>
  failedRequestHandler: (ctx: { request: { url: string; noRetry?: boolean } }, err: Error) => Promise<void>
  resultChecker: (r: unknown) => boolean
  resultComparator: (a: unknown, b: unknown) => boolean
}

function lastConfig(): CrawlerConfigShape {
  return constructedConfigs[constructedConfigs.length - 1] as CrawlerConfigShape
}

describe('createPortalCrawler — defaults (AC1)', () => {
  it('returns AdaptivePlaywrightCrawler instance', () => {
    const c = createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
    })
    expect(c).toBeInstanceOf(FakeAdaptivePlaywrightCrawler)
  })

  it('applies Wave A defaults', () => {
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
    })
    const cfg = lastConfig()
    expect(cfg.minConcurrency).toBe(PORTAL_CRAWLER_DEFAULTS.minConcurrency)
    expect(cfg.maxConcurrency).toBe(PORTAL_CRAWLER_DEFAULTS.maxConcurrency)
    expect(cfg.maxRequestsPerMinute).toBe(
      PORTAL_CRAWLER_DEFAULTS.maxTasksPerMinute,
    )
    expect(cfg.maxRequestRetries).toBe(
      PORTAL_CRAWLER_DEFAULTS.maxRequestRetries,
    )
    expect(cfg.requestHandlerTimeoutSecs).toBe(60)
    expect(cfg.navigationTimeoutSecs).toBe(30)
    expect(cfg.renderingTypeDetectionRatio).toBe(0.1)
    expect(cfg.useSessionPool).toBe(true)
    expect(cfg.persistCookiesPerSession).toBe(true)
    expect(cfg.sessionPoolOptions.maxPoolSize).toBe(50)
  })

  it('allows overrides to win over defaults', () => {
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
      overrides: { maxConcurrency: 5 } as never,
    })
    expect(lastConfig().maxConcurrency).toBe(5)
  })
})

describe('createPortalCrawler — hooks (AC2)', () => {
  it('registers 2 default preNavigationHooks (consent + referer)', () => {
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
    })
    expect(lastConfig().preNavigationHooks).toHaveLength(2)
  })

  it('registers 2 default postNavigationHooks (antibot + login wall)', () => {
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
    })
    expect(lastConfig().postNavigationHooks).toHaveLength(2)
  })

  it('appends custom hooks after defaults', () => {
    const customPre = vi.fn()
    const customPost = vi.fn()
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
      preNavigationHooks: [customPre],
      postNavigationHooks: [customPost],
    })
    expect(lastConfig().preNavigationHooks).toHaveLength(3)
    expect(lastConfig().postNavigationHooks).toHaveLength(3)
  })

  it('uses default resultChecker (portal_listing_id + list_price)', () => {
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
    })
    const checker = lastConfig().resultChecker
    expect(checker({ portal_listing_id: 'X', list_price: 1000 })).toBe(true)
    expect(checker({})).toBe(false)
  })

  it('accepts custom resultChecker override', () => {
    const custom = vi.fn().mockReturnValue(true)
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
      resultChecker: custom,
    })
    lastConfig().resultChecker({ anything: 'goes' })
    expect(custom).toHaveBeenCalled()
  })
})

describe('createPortalCrawler — telemetry wiring (AC3)', () => {
  it('records request on success', async () => {
    const client = new CaptureClient()
    const tel = new Telemetry({ client })
    await tel.startRun('mercadolivre')

    const userHandler = vi.fn().mockResolvedValue(undefined)
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: userHandler,
      telemetry: tel,
    })

    const cfg = lastConfig()
    // Call the wrapped handler with a fake ctx
    await cfg.requestHandler({
      request: { url: 'https://x.test/listing/1' },
      response: { status: () => 200 },
    })
    // Flush microtasks
    await Promise.resolve()
    await Promise.resolve()

    expect(userHandler).toHaveBeenCalledTimes(1)
    expect(client.requests).toHaveLength(1)
    expect(client.requests[0]).toMatchObject({
      portal: 'mercadolivre',
      url: 'https://x.test/listing/1',
      status_code: 200,
    })
    expect(tel.snapshot().requests_finished).toBe(1)
  })

  it('records failure when handler throws and rethrows', async () => {
    const client = new CaptureClient()
    const tel = new Telemetry({ client })
    await tel.startRun('zap')

    const userHandler = vi.fn().mockRejectedValue(new Error('parse failed'))
    createPortalCrawler({
      portal: 'zap',
      requestHandler: userHandler,
      telemetry: tel,
    })

    const cfg = lastConfig()
    await expect(
      cfg.requestHandler({
        request: { url: 'https://x.test/listing/2' },
      }),
    ).rejects.toThrow('parse failed')
    await Promise.resolve()
    await Promise.resolve()

    expect(client.failures).toHaveLength(1)
    expect(client.failures[0]).toMatchObject({
      portal: 'zap',
      url: 'https://x.test/listing/2',
      error_message: 'parse failed',
    })
  })

  it('failedRequestHandler marks noRetry when propagation rule fires', async () => {
    const client = new CaptureClient()
    const tel = new Telemetry({ client })
    await tel.startRun('olx')

    createPortalCrawler({
      portal: 'olx',
      requestHandler: async () => {},
      telemetry: tel,
    })

    const cfg = lastConfig()
    const req = { url: 'https://x.test/blocked', noRetry: false }
    await cfg.failedRequestHandler(
      { request: req },
      new Error('Cloudflare block'),
    )

    expect(req.noRetry).toBe(true)
    expect(client.failures[0]?.error_message).toBe('Cloudflare block')
  })

  it('failedRequestHandler does NOT set noRetry for retryable errors', async () => {
    const client = new CaptureClient()
    const tel = new Telemetry({ client })
    await tel.startRun('olx')

    createPortalCrawler({
      portal: 'olx',
      requestHandler: async () => {},
      telemetry: tel,
    })
    const cfg = lastConfig()
    const req = { url: 'https://x.test/timeout', noRetry: false }
    await cfg.failedRequestHandler(
      { request: req },
      new Error('ETIMEDOUT'),
    )
    expect(req.noRetry).toBe(false)
  })

  it('works without telemetry (graceful)', () => {
    expect(() =>
      createPortalCrawler({
        portal: 'vivareal',
        requestHandler: async () => {},
      }),
    ).not.toThrow()
  })
})

describe('createPortalCrawler — comparator (AC2)', () => {
  it('uses defaultResultComparator (deep equal)', () => {
    createPortalCrawler({
      portal: 'mercadolivre',
      requestHandler: async () => {},
    })
    const cmp = lastConfig().resultComparator
    expect(cmp({ a: 1 }, { a: 1 })).toBe(true)
    expect(cmp({ a: 1 }, { a: 2 })).toBe(false)
  })
})

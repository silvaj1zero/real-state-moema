/**
 * Epic 7 Story 7.7 — 2Captcha client wrapper.
 *
 * Resolve dois tipos de challenge usados pelos sites CRECI:
 *  - Cloudflare Turnstile (Conselho Nacional 21 UFs) -- ~$0.99/1000 solves
 *  - reCAPTCHA Enterprise v3 (CRECI SP)              -- ~$2.99/1000 solves
 *
 * Documentacao 2Captcha API: https://2captcha.com/2captcha-api
 *
 * Custom HTTP client (sem SDK) para manter zero deps novas e permitir
 * mock direto via vi.fn() em testes.
 */

const TWOCAPTCHA_BASE = 'https://2captcha.com'
const DEFAULT_TIMEOUT_MS = 120_000 // 2min: typical solve ~5-30s, edge ~60s
const POLL_INTERVAL_MS = 5_000

export interface TurnstileSolveRequest {
  siteKey: string
  pageUrl: string
}

export interface RecaptchaV3SolveRequest {
  siteKey: string
  pageUrl: string
  isEnterprise: boolean
  pageAction: string
}

export interface SolveResult {
  token: string
  /** Cost em USD reportado pelo 2Captcha. 0 se nao disponivel */
  costUsd: number
  /** Tempo de solve em ms */
  durationMs: number
}

export interface CaptchaClientOptions {
  apiKey: string
  /** Fetch impl injetavel (default global fetch) */
  fetchImpl?: typeof fetch
  /** Timeout total (default 120s) */
  timeoutMs?: number
  /** Intervalo entre polls (default 5s) */
  pollIntervalMs?: number
}

/**
 * Erro lancado por solves que falham (timeout, ERROR_*, etc).
 */
export class CaptchaSolveError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, message: string, retryable = false) {
    super(message)
    this.name = 'CaptchaSolveError'
    this.code = code
    this.retryable = retryable
  }
}

/**
 * Cliente minimalista 2Captcha. Mockavel via `fetchImpl`.
 */
export class CaptchaClient {
  private readonly apiKey: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly pollIntervalMs: number

  constructor(opts: CaptchaClientOptions) {
    if (!opts.apiKey) {
      throw new Error('CaptchaClient: apiKey required')
    }
    this.apiKey = opts.apiKey
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.pollIntervalMs = opts.pollIntervalMs ?? POLL_INTERVAL_MS
  }

  async solveTurnstile(req: TurnstileSolveRequest): Promise<SolveResult> {
    return this.solve({
      method: 'turnstile',
      sitekey: req.siteKey,
      pageurl: req.pageUrl,
    })
  }

  async solveRecaptchaV3(req: RecaptchaV3SolveRequest): Promise<SolveResult> {
    return this.solve({
      method: 'userrecaptcha',
      version: 'v3',
      googlekey: req.siteKey,
      pageurl: req.pageUrl,
      enterprise: req.isEnterprise ? '1' : '0',
      action: req.pageAction,
    })
  }

  private async solve(params: Record<string, string>): Promise<SolveResult> {
    const start = Date.now()

    // 1. Submit
    const submitBody = new URLSearchParams({
      key: this.apiKey,
      json: '1',
      ...params,
    })

    const submitResp = await this.fetchImpl(`${TWOCAPTCHA_BASE}/in.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: submitBody,
    })
    const submitJson = (await submitResp.json()) as {
      status: number
      request: string
    }
    if (submitJson.status !== 1) {
      throw new CaptchaSolveError(
        submitJson.request || 'SUBMIT_FAILED',
        `2Captcha submit failed: ${submitJson.request}`,
        false,
      )
    }
    const captchaId = submitJson.request

    // 2. Poll
    while (Date.now() - start < this.timeoutMs) {
      await sleep(this.pollIntervalMs)

      const pollResp = await this.fetchImpl(
        `${TWOCAPTCHA_BASE}/res.php?key=${this.apiKey}&action=get&id=${captchaId}&json=1`,
      )
      const pollJson = (await pollResp.json()) as {
        status: number
        request: string
      }

      if (pollJson.status === 1) {
        // Resolved. Cost lookup via res.php?action=get_balance e res.php?action=get2
        // (acompanha cost no JSON quando disponivel). Best effort.
        const costUsd = await this.fetchCost(captchaId).catch(() => 0)
        return {
          token: pollJson.request,
          costUsd,
          durationMs: Date.now() - start,
        }
      }

      if (pollJson.request !== 'CAPCHA_NOT_READY') {
        throw new CaptchaSolveError(
          pollJson.request,
          `2Captcha solve error: ${pollJson.request}`,
          pollJson.request.startsWith('ERROR_NO_SLOT') ||
            pollJson.request === 'ERROR_CAPTCHAIMAGE_BLOCKED',
        )
      }
    }

    throw new CaptchaSolveError(
      'TIMEOUT',
      `2Captcha solve timed out after ${this.timeoutMs}ms`,
      true,
    )
  }

  private async fetchCost(captchaId: string): Promise<number> {
    const resp = await this.fetchImpl(
      `${TWOCAPTCHA_BASE}/res.php?key=${this.apiKey}&action=get2&id=${captchaId}&json=1`,
    )
    const json = (await resp.json()) as { status: number; request?: string }
    if (json.status === 1 && json.request) {
      const parts = json.request.split('|')
      const price = parseFloat(parts[1] ?? '0')
      return Number.isFinite(price) ? price : 0
    }
    return 0
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

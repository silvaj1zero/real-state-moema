/**
 * Epic 7 Story 7.7 — Conselho Nacional CRECI adapter.
 *
 * Cobre 21 UFs servidas por `https://www.creci{uf}.conselho.net.br`
 * (BR-COFECI-001..004). Resolve Cloudflare Turnstile via 2Captcha
 * (BR-COFECI-002) e parseia HTML resposta (BR-COFECI-004).
 *
 * Rate-limit por portal (BR-COFECI rate table): 1 req / 2s (configuravel
 * via env `CRECI_CONSELHO_RATE_MS`).
 */

import {
  parseConselhoResponse,
  normalizeTelefoneE164,
  type CreciResultado,
} from './parsers/conselho-response'
import { CaptchaClient, CaptchaSolveError } from './captcha-client'
import { isAllowedByRobotsTxt } from './robots-check'

export const CONSELHO_NACIONAL_UFS = [
  'al', 'am', 'ap', 'ba', 'ce', 'df', 'go', 'ma', 'ms', 'mt',
  'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'sc', 'se',
] as const

export type ConselhoUf = (typeof CONSELHO_NACIONAL_UFS)[number]

export const CONSELHO_TURNSTILE_SITEKEY = '0x4AAAAAAB5EssxvqmsTJ5Wx'
export const CONSELHO_FORM_PATH = '/form_pesquisa_cadastro_geral_site.php'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export interface ConselhoAdapterOptions {
  captcha: Pick<CaptchaClient, 'solveTurnstile'>
  fetchImpl?: typeof fetch
  /** Rate-limit em ms entre requests (default 2000) */
  rateLimitMs?: number
  /** Skipa robots.txt check (test only) */
  skipRobotsCheck?: boolean
}

export interface ConselhoLookupResult {
  data: CreciResultado | null
  /** Custo do solve em USD (0 se cached/n.a.) */
  captchaCostUsd: number
  /** Tempo total da request em ms */
  durationMs: number
}

export function getConselhoBaseUrl(uf: string): string {
  return `https://www.creci${uf.toLowerCase()}.conselho.net.br`
}

export function isConselhoNacionalUf(uf: string): uf is ConselhoUf {
  return (CONSELHO_NACIONAL_UFS as readonly string[]).includes(
    uf.toLowerCase(),
  )
}

/**
 * Lock por portal — implementa rate-limit simples via promise chain.
 * Comparte estado modulo-level (1 instancia por processo Node).
 */
let lastConselhoRequestAt = 0
async function rateLimit(ms: number): Promise<void> {
  const now = Date.now()
  const wait = lastConselhoRequestAt + ms - now
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait))
  }
  lastConselhoRequestAt = Date.now()
}

/**
 * Reseta rate limit. Util em testes.
 */
export function _resetConselhoRateLimit(): void {
  lastConselhoRequestAt = 0
}

export class ConselhoNacionalAdapter {
  private readonly opts: Required<Omit<ConselhoAdapterOptions, 'captcha'>> & {
    captcha: ConselhoAdapterOptions['captcha']
  }

  constructor(opts: ConselhoAdapterOptions) {
    this.opts = {
      captcha: opts.captcha,
      fetchImpl: opts.fetchImpl ?? globalThis.fetch,
      rateLimitMs:
        opts.rateLimitMs ??
        Number(process.env.CRECI_CONSELHO_RATE_MS ?? '2000'),
      skipRobotsCheck: opts.skipRobotsCheck ?? false,
    }
  }

  async lookup(numero: string, uf: string): Promise<ConselhoLookupResult> {
    const start = Date.now()
    if (!isConselhoNacionalUf(uf)) {
      throw new Error(
        `ConselhoNacionalAdapter: UF "${uf}" nao coberta. UFs: ${CONSELHO_NACIONAL_UFS.join(',')}`,
      )
    }
    if (!/^\d{1,6}$/.test(numero)) {
      throw new Error(
        `ConselhoNacionalAdapter: numero CRECI invalido "${numero}" (esperado 1-6 digitos)`,
      )
    }

    const baseUrl = getConselhoBaseUrl(uf)
    const pageUrl = baseUrl + CONSELHO_FORM_PATH

    // BR-COFECI-005 — robots.txt check (graceful fallback)
    if (!this.opts.skipRobotsCheck) {
      const allowed = await isAllowedByRobotsTxt(pageUrl, {
        fetchImpl: this.opts.fetchImpl,
        userAgent: 'Mozilla',
      })
      if (!allowed) {
        throw new Error(
          `ConselhoNacionalAdapter: robots.txt nega ${pageUrl}`,
        )
      }
    }

    // Rate limit (BR-COFECI rate table)
    await rateLimit(this.opts.rateLimitMs)

    // BR-COFECI-002 — Turnstile solve
    let captchaCostUsd = 0
    let token: string
    try {
      const solve = await this.opts.captcha.solveTurnstile({
        siteKey: CONSELHO_TURNSTILE_SITEKEY,
        pageUrl,
      })
      token = solve.token
      captchaCostUsd = solve.costUsd
    } catch (e) {
      if (e instanceof CaptchaSolveError) {
        throw e
      }
      throw new CaptchaSolveError(
        'CAPTCHA_UNKNOWN_ERROR',
        `Turnstile solve falhou: ${(e as Error).message}`,
        true,
      )
    }

    // BR-COFECI-003 — POST form-encoded
    const body = new URLSearchParams({ inscricao: numero, token })
    const resp = await this.opts.fetchImpl(pageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body,
    })

    if (!resp.ok) {
      throw new Error(
        `ConselhoNacionalAdapter: HTTP ${resp.status} ${resp.statusText}`,
      )
    }

    const html = await resp.text()
    const parsed = parseConselhoResponse(html)

    if (parsed && parsed.telefone) {
      parsed.telefone = normalizeTelefoneE164(parsed.telefone)
    }

    return {
      data: parsed,
      captchaCostUsd,
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Epic 7 Story 7.7 — CRECI SP adapter.
 *
 * Per BR-CRECISP-001. Status Wave A (mar/2026): "temporarily_disabled" —
 * reCAPTCHA Enterprise v3 falhando server-side. Adapter implementado;
 * detecta falha e retorna `data:null` com `errorCode='crecisp_unavailable'`.
 *
 * Rate-limit: 1 req / 5s (configuravel via env CRECI_SP_RATE_MS).
 */

import {
  parseCRECISPResponse,
} from './parsers/crecisp-response'
import { CaptchaClient, CaptchaSolveError } from './captcha-client'
import { isAllowedByRobotsTxt } from './robots-check'
import { normalizeTelefoneE164 } from './parsers/conselho-response'

export const CRECISP_BASE_URL = 'https://www.crecisp.gov.br'
export const CRECISP_RECAPTCHA_SITEKEY =
  '6LfUMMgqAAAAABG4tjE8VkT2wKZlqmAvV2YsId7a'
export const CRECISP_PAGE_ACTION = 'submit_broker_search'
export const CRECISP_SEARCH_PATH = '/cidadao/buscaporcorretores'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export interface CRECISPAdapterOptions {
  captcha: Pick<CaptchaClient, 'solveRecaptchaV3'>
  fetchImpl?: typeof fetch
  rateLimitMs?: number
  skipRobotsCheck?: boolean
}

export interface CRECISPLookupResult {
  data: {
    inscricao: string
    nomeCompleto: string
    situacao: 'Ativo' | 'Inativo'
    telefone: string
  } | null
  errorCode?: 'crecisp_unavailable' | 'crecisp_not_found' | 'crecisp_invalid_html'
  captchaCostUsd: number
  durationMs: number
}

let lastCrecispRequestAt = 0
async function rateLimit(ms: number): Promise<void> {
  const wait = lastCrecispRequestAt + ms - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCrecispRequestAt = Date.now()
}

export function _resetCrecispRateLimit(): void {
  lastCrecispRequestAt = 0
}

export class CRECISPAdapter {
  private readonly opts: Required<Omit<CRECISPAdapterOptions, 'captcha'>> & {
    captcha: CRECISPAdapterOptions['captcha']
  }

  constructor(opts: CRECISPAdapterOptions) {
    this.opts = {
      captcha: opts.captcha,
      fetchImpl: opts.fetchImpl ?? globalThis.fetch,
      rateLimitMs:
        opts.rateLimitMs ?? Number(process.env.CRECI_SP_RATE_MS ?? '5000'),
      skipRobotsCheck: opts.skipRobotsCheck ?? false,
    }
  }

  async lookup(numero: string): Promise<CRECISPLookupResult> {
    const start = Date.now()
    if (!/^\d{1,6}$/.test(numero)) {
      throw new Error(
        `CRECISPAdapter: numero invalido "${numero}" (1-6 digitos)`,
      )
    }

    const pageUrl = CRECISP_BASE_URL + CRECISP_SEARCH_PATH

    if (!this.opts.skipRobotsCheck) {
      const allowed = await isAllowedByRobotsTxt(pageUrl, {
        fetchImpl: this.opts.fetchImpl,
        userAgent: 'Mozilla',
      })
      if (!allowed) {
        throw new Error(`CRECISPAdapter: robots.txt nega ${pageUrl}`)
      }
    }

    await rateLimit(this.opts.rateLimitMs)

    let captchaCostUsd = 0
    let token: string
    try {
      const solve = await this.opts.captcha.solveRecaptchaV3({
        siteKey: CRECISP_RECAPTCHA_SITEKEY,
        pageUrl,
        isEnterprise: true,
        pageAction: CRECISP_PAGE_ACTION,
      })
      token = solve.token
      captchaCostUsd = solve.costUsd
    } catch (e) {
      if (e instanceof CaptchaSolveError) {
        // Falha de captcha -> sinaliza unavailable, nao propaga
        return {
          data: null,
          errorCode: 'crecisp_unavailable',
          captchaCostUsd: 0,
          durationMs: Date.now() - start,
        }
      }
      throw e
    }

    const body = new URLSearchParams({
      IsFinding: 'True',
      RegisterNumber: numero,
      CPF: '',
      Name: '',
      City: '',
      Area: '',
      Language: '',
      Avaliador: '',
      ReCAPTCHAToken: token,
    })

    const resp = await this.opts.fetchImpl(pageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        Referer: pageUrl,
        Origin: CRECISP_BASE_URL,
      },
      body,
    })

    if (!resp.ok) {
      return {
        data: null,
        errorCode: 'crecisp_invalid_html',
        captchaCostUsd,
        durationMs: Date.now() - start,
      }
    }

    const html = await resp.text()
    const parsed = parseCRECISPResponse(html)
    if (!parsed.ok) {
      return {
        data: null,
        errorCode: parsed.errorCode,
        captchaCostUsd,
        durationMs: Date.now() - start,
      }
    }

    return {
      data: {
        inscricao: parsed.inscricao,
        nomeCompleto: parsed.nomeCompleto,
        situacao: 'Ativo',
        telefone: normalizeTelefoneE164(parsed.telefone),
      },
      captchaCostUsd,
      durationMs: Date.now() - start,
    }
  }
}

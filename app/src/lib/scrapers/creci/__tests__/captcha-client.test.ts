/**
 * Epic 7 Story 7.7 — CaptchaClient tests (2Captcha wrapper).
 *
 * Mock fetch completamente para evitar hits HTTP reais.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  CaptchaClient,
  CaptchaSolveError,
} from '@/lib/scrapers/creci/captcha-client'

function makeFetch(responses: Array<{ ok?: boolean; json: unknown }>) {
  let i = 0
  return vi.fn(async (_url?: string, _init?: { body?: URLSearchParams }) => {
    const r = responses[Math.min(i, responses.length - 1)]
    i++
    return {
      ok: r.ok ?? true,
      json: async () => r.json,
    } as unknown as Response
  })
}

describe('CaptchaClient', () => {
  it('rejeita construcao sem apiKey', () => {
    expect(() => new CaptchaClient({ apiKey: '' })).toThrow(/apiKey required/)
  })

  it('solveTurnstile: caminho feliz (submit+poll OK)', async () => {
    const fetchMock = makeFetch([
      { json: { status: 1, request: 'CAPID-1' } }, // submit OK
      { json: { status: 1, request: 'turnstile-token-xyz' } }, // poll OK
      { json: { status: 1, request: 'CAPID-1|0.001|...' } }, // cost
    ])
    const client = new CaptchaClient({
      apiKey: 'fake',
      fetchImpl: fetchMock as unknown as typeof fetch,
      pollIntervalMs: 1, // fast test
      timeoutMs: 5000,
    })

    const result = await client.solveTurnstile({
      siteKey: '0x4AAAAAAB5EssxvqmsTJ5Wx',
      pageUrl: 'https://example.com/form',
    })
    expect(result.token).toBe('turnstile-token-xyz')
    expect(result.costUsd).toBeCloseTo(0.001)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('solveTurnstile: erro no submit -> CaptchaSolveError', async () => {
    const fetchMock = makeFetch([
      { json: { status: 0, request: 'ERROR_KEY_DOES_NOT_EXIST' } },
    ])
    const client = new CaptchaClient({
      apiKey: 'fake',
      fetchImpl: fetchMock as unknown as typeof fetch,
      pollIntervalMs: 1,
    })
    await expect(
      client.solveTurnstile({
        siteKey: 'x',
        pageUrl: 'https://example.com',
      }),
    ).rejects.toBeInstanceOf(CaptchaSolveError)
  })

  it('solveTurnstile: timeout', async () => {
    const fetchMock = makeFetch([
      { json: { status: 1, request: 'CAPID-2' } }, // submit OK
      { json: { status: 0, request: 'CAPCHA_NOT_READY' } }, // poll keep returning
    ])
    const client = new CaptchaClient({
      apiKey: 'fake',
      fetchImpl: fetchMock as unknown as typeof fetch,
      pollIntervalMs: 5,
      timeoutMs: 20,
    })
    await expect(
      client.solveTurnstile({
        siteKey: 'x',
        pageUrl: 'https://example.com',
      }),
    ).rejects.toBeInstanceOf(CaptchaSolveError)
  })

  it('solveTurnstile: erro no poll (nao CAPCHA_NOT_READY) -> erro', async () => {
    const fetchMock = makeFetch([
      { json: { status: 1, request: 'CAPID-3' } },
      { json: { status: 0, request: 'ERROR_CAPTCHA_UNSOLVABLE' } },
    ])
    const client = new CaptchaClient({
      apiKey: 'fake',
      fetchImpl: fetchMock as unknown as typeof fetch,
      pollIntervalMs: 1,
      timeoutMs: 1000,
    })
    await expect(
      client.solveTurnstile({
        siteKey: 'x',
        pageUrl: 'https://example.com',
      }),
    ).rejects.toMatchObject({
      code: 'ERROR_CAPTCHA_UNSOLVABLE',
    })
  })

  it('solveRecaptchaV3: monta params corretos (enterprise + action)', async () => {
    const fetchMock = makeFetch([
      { json: { status: 1, request: 'CAPID-4' } },
      { json: { status: 1, request: 'recap-token' } },
      { json: { status: 0, request: '' } }, // cost lookup fail
    ])
    const client = new CaptchaClient({
      apiKey: 'fake',
      fetchImpl: fetchMock as unknown as typeof fetch,
      pollIntervalMs: 1,
    })
    const result = await client.solveRecaptchaV3({
      siteKey: 'siteKey',
      pageUrl: 'https://crecisp.gov.br/cidadao/buscaporcorretores',
      isEnterprise: true,
      pageAction: 'submit_broker_search',
    })
    expect(result.token).toBe('recap-token')
    expect(result.costUsd).toBe(0)

    // Verifica que enterprise + action foram enviados no submit
    const firstCall = fetchMock.mock.calls[0]
    const submitBody = (firstCall[1] as { body: URLSearchParams }).body
    expect(submitBody.get('enterprise')).toBe('1')
    expect(submitBody.get('action')).toBe('submit_broker_search')
    expect(submitBody.get('version')).toBe('v3')
  })
})

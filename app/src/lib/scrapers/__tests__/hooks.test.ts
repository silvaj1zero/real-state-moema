/**
 * Hooks tests — AC2 + AC7.
 *
 * Cobre:
 *  - shouldPropagateError: 403/429/Cloudflare propaga; 500/network nao
 *  - makeDefaultResultChecker: requer portal_listing_id + list_price>0
 *  - defaultResultComparator: deep equality + NaN
 *  - makeConsentCookieHook: adiciona cookies para mercadolivre
 *  - makeRefererHook: define referer google + Accept-Language pt-BR
 *  - antiBotDetectionHook: throw em Cloudflare 503 / CAPTCHA html
 *  - loginWallDetectionHook: throw em "please log in"
 */

import { describe, it, expect } from 'vitest'

import { shouldPropagateError } from '@/lib/scrapers/hooks/shouldPropagateError'
import { makeDefaultResultChecker } from '@/lib/scrapers/hooks/resultChecker'
import { defaultResultComparator } from '@/lib/scrapers/hooks/resultComparator'
import {
  makeConsentCookieHook,
  makeRefererHook,
} from '@/lib/scrapers/hooks/preNavigationHooks'
import {
  antiBotDetectionHook,
  loginWallDetectionHook,
  AntiBotDetectedError,
  LoginWallDetectedError,
} from '@/lib/scrapers/hooks/postNavigationHooks'

describe('shouldPropagateError', () => {
  it('propagates 401/403/451', () => {
    expect(shouldPropagateError({ statusCode: 401 })).toBe(true)
    expect(shouldPropagateError({ statusCode: 403 })).toBe(true)
    expect(shouldPropagateError({ statusCode: 451 })).toBe(true)
  })

  it('propagates 429 rate-limit', () => {
    expect(shouldPropagateError({ statusCode: 429 })).toBe(true)
  })

  it('propagates Cloudflare/CAPTCHA markers in error message', () => {
    expect(
      shouldPropagateError({ errorMessage: 'Just a moment - Cloudflare' }),
    ).toBe(true)
    expect(shouldPropagateError({ errorMessage: 'Captcha required' })).toBe(true)
    expect(shouldPropagateError({ errorMessage: 'Access Denied' })).toBe(true)
  })

  it('does NOT propagate 5xx (retry-worthy)', () => {
    expect(shouldPropagateError({ statusCode: 500 })).toBe(false)
    expect(shouldPropagateError({ statusCode: 503 })).toBe(false)
  })

  it('does NOT propagate generic network error', () => {
    expect(shouldPropagateError({ errorMessage: 'ECONNRESET' })).toBe(false)
    expect(shouldPropagateError({})).toBe(false)
  })
})

describe('makeDefaultResultChecker', () => {
  const check = makeDefaultResultChecker('mercadolivre')

  it('accepts result with portal_listing_id + list_price > 0', () => {
    expect(
      check({ portal_listing_id: 'MLB-123', list_price: 850000 }),
    ).toBe(true)
  })

  it('accepts external_id as fallback for portal_listing_id', () => {
    expect(check({ external_id: 'ext-1', list_price: 500000 })).toBe(true)
  })

  it('rejects when no id present', () => {
    expect(check({ list_price: 500000 })).toBe(false)
    expect(check({ portal_listing_id: '', list_price: 500000 })).toBe(false)
  })

  it('rejects when list_price is null/missing', () => {
    expect(check({ portal_listing_id: 'MLB-1', list_price: null })).toBe(false)
    expect(check({ portal_listing_id: 'MLB-1' })).toBe(false)
  })

  it('rejects when list_price is zero or negative', () => {
    expect(
      check({ portal_listing_id: 'MLB-1', list_price: 0 }),
    ).toBe(false)
    expect(
      check({ portal_listing_id: 'MLB-1', list_price: -100 }),
    ).toBe(false)
  })

  it('rejects when list_price is NaN/Infinity', () => {
    expect(
      check({ portal_listing_id: 'MLB-1', list_price: NaN }),
    ).toBe(false)
    expect(
      check({ portal_listing_id: 'MLB-1', list_price: Infinity }),
    ).toBe(false)
  })
})

describe('defaultResultComparator', () => {
  it('returns true for deep-equal objects', () => {
    expect(
      defaultResultComparator(
        { a: 1, b: { c: [1, 2, 3] } },
        { a: 1, b: { c: [1, 2, 3] } },
      ),
    ).toBe(true)
  })

  it('returns false for different shapes', () => {
    expect(defaultResultComparator({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(defaultResultComparator({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('treats NaN as equal to NaN', () => {
    expect(defaultResultComparator(NaN, NaN)).toBe(true)
  })

  it('handles arrays of different lengths', () => {
    expect(defaultResultComparator([1, 2], [1, 2, 3])).toBe(false)
  })

  it('handles null and undefined', () => {
    expect(defaultResultComparator(null, null)).toBe(true)
    expect(defaultResultComparator(null, undefined)).toBe(false)
    expect(defaultResultComparator({ a: null }, { a: null })).toBe(true)
  })

  it('primitive equality', () => {
    expect(defaultResultComparator(1, 1)).toBe(true)
    expect(defaultResultComparator('a', 'a')).toBe(true)
    expect(defaultResultComparator(true, false)).toBe(false)
  })
})

describe('makeConsentCookieHook', () => {
  it('adds mercadolivre cookies', async () => {
    const hook = makeConsentCookieHook('mercadolivre')
    const added: unknown[] = []
    const ctx = {
      request: { url: 'https://mercadolivre.com.br/x' },
      page: {
        context: () => ({
          addCookies: async (cookies: unknown[]) => {
            added.push(...cookies)
          },
        }),
      },
    }
    await hook(ctx, {})
    expect(added.length).toBeGreaterThan(0)
    expect(added[0]).toMatchObject({ name: '_ml_csrf' })
  })

  it('is no-op for portals without cookies', async () => {
    const hook = makeConsentCookieHook('zap')
    const ctx = {
      request: { url: 'https://zap.com.br/x' },
      page: {
        context: () => ({
          addCookies: async () => {
            throw new Error('should not be called')
          },
        }),
      },
    }
    await expect(hook(ctx, {})).resolves.toBeUndefined()
  })

  it('is no-op without page (HTTP-only path)', async () => {
    const hook = makeConsentCookieHook('mercadolivre')
    await expect(
      hook({ request: { url: 'https://x.test' } }, {}),
    ).resolves.toBeUndefined()
  })
})

describe('makeRefererHook', () => {
  it('sets google referer and pt-BR Accept-Language', async () => {
    const hook = makeRefererHook()
    const ctx = { request: { url: 'https://x.test', headers: {} } }
    const gotoOpts: { referer?: string } = {}
    await hook(ctx, gotoOpts)
    expect(gotoOpts.referer).toBe('https://www.google.com.br/')
    expect(ctx.request.headers).toMatchObject({
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    })
  })
})

describe('antiBotDetectionHook', () => {
  it('throws AntiBotDetectedError on Cloudflare 503', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      response: {
        status: () => 503,
        headers: () => ({ server: 'cloudflare' }),
      },
      page: { content: async () => '<html></html>' },
    }
    await expect(antiBotDetectionHook(ctx)).rejects.toBeInstanceOf(
      AntiBotDetectedError,
    )
  })

  it('throws on Cloudflare HTML title', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      response: { status: () => 200, headers: () => ({}) },
      page: {
        content: async () =>
          '<html><head><title>Just a moment...</title></head></html>',
      },
    }
    await expect(antiBotDetectionHook(ctx)).rejects.toBeInstanceOf(
      AntiBotDetectedError,
    )
  })

  it('throws on CAPTCHA marker', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      response: { status: () => 200, headers: () => ({}) },
      page: {
        content: async () => '<div class="g-recaptcha"></div>',
      },
    }
    await expect(antiBotDetectionHook(ctx)).rejects.toBeInstanceOf(
      AntiBotDetectedError,
    )
  })

  it('passes when content is clean', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      response: { status: () => 200, headers: () => ({}) },
      page: {
        content: async () => '<html><body>Listing</body></html>',
      },
    }
    await expect(antiBotDetectionHook(ctx)).resolves.toBeUndefined()
  })
})

describe('loginWallDetectionHook', () => {
  it('throws LoginWallDetectedError on "please log in"', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      page: { content: async () => 'Please log in to continue' },
    }
    await expect(loginWallDetectionHook(ctx)).rejects.toBeInstanceOf(
      LoginWallDetectedError,
    )
  })

  it('throws on <title>Login</title>', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      page: { content: async () => '<title>Login Required</title>' },
    }
    await expect(loginWallDetectionHook(ctx)).rejects.toBeInstanceOf(
      LoginWallDetectedError,
    )
  })

  it('passes on normal listing page', async () => {
    const ctx = {
      request: { url: 'https://x.test' },
      page: { content: async () => '<title>Listing 123</title>' },
    }
    await expect(loginWallDetectionHook(ctx)).resolves.toBeUndefined()
  })
})

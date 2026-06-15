/**
 * proxy-config tests — Story 7.12 (AC1, AC2, AC5, AC7).
 *
 * Cobre: tiering por alvo (residencial so ZAP/VivaReal), parse de env,
 * fallback gracioso residencial->datacenter, e o builder injetavel que
 * passa grupo/pais corretos para a factory (mock de ProxyConfiguration).
 */

import { describe, it, expect, vi } from 'vitest'

import {
  resolveProxySpec,
  readProxyEnv,
  buildProxyConfiguration,
  PORTAL_PROXY_TIER,
  RESIDENTIAL_GROUP,
  DATACENTER_GROUP,
  type ProxyEnv,
  type ProxyFactoryInput,
} from '@/lib/scrapers/proxy-config'

const FULL_ENV: ProxyEnv = {
  availableGroups: [RESIDENTIAL_GROUP, DATACENTER_GROUP],
  country: 'BR',
}
const NO_RESIDENTIAL_ENV: ProxyEnv = {
  availableGroups: [DATACENTER_GROUP],
  country: 'BR',
}

// ---------------------------------------------------------------------------
// PORTAL_PROXY_TIER — AC2 (por alvo, residencial so onde ha bloqueio)
// ---------------------------------------------------------------------------

describe('PORTAL_PROXY_TIER — AC2', () => {
  it('residencial apenas para ZAP/VivaReal (Cloudflare confirmado)', () => {
    expect(PORTAL_PROXY_TIER.zap).toBe('residential')
    expect(PORTAL_PROXY_TIER.vivareal).toBe('residential')
  })

  it('datacenter para MercadoLivre (nao-Cloudflare) e OLX (conservador)', () => {
    expect(PORTAL_PROXY_TIER.mercadolivre).toBe('datacenter')
    expect(PORTAL_PROXY_TIER.olx).toBe('datacenter')
  })
})

// ---------------------------------------------------------------------------
// resolveProxySpec — AC1
// ---------------------------------------------------------------------------

describe('resolveProxySpec — AC1', () => {
  it('ZAP -> residencial RESIDENTIAL + countryCode BR', () => {
    const spec = resolveProxySpec('zap', FULL_ENV)
    expect(spec.tier).toBe('residential')
    expect(spec.apifyProxyGroups).toEqual([RESIDENTIAL_GROUP])
    expect(spec.apifyProxyCountry).toBe('BR')
    expect(spec.degradedFrom).toBeUndefined()
  })

  it('VivaReal -> residencial', () => {
    expect(resolveProxySpec('vivareal', FULL_ENV).tier).toBe('residential')
  })

  it('MercadoLivre -> datacenter DATACENTER (custo menor)', () => {
    const spec = resolveProxySpec('mercadolivre', FULL_ENV)
    expect(spec.tier).toBe('datacenter')
    expect(spec.apifyProxyGroups).toEqual([DATACENTER_GROUP])
    expect(spec.degradedFrom).toBeUndefined()
  })

  it('AC7: alvo nao-Cloudflare nunca recebe RESIDENTIAL', () => {
    for (const portal of ['mercadolivre', 'olx'] as const) {
      const spec = resolveProxySpec(portal, FULL_ENV)
      expect(spec.apifyProxyGroups).not.toContain(RESIDENTIAL_GROUP)
    }
  })

  it('AC5 fallback: residencial pedido mas indisponivel -> degrada para datacenter', () => {
    const spec = resolveProxySpec('zap', NO_RESIDENTIAL_ENV)
    expect(spec.tier).toBe('datacenter')
    expect(spec.apifyProxyGroups).toEqual([DATACENTER_GROUP])
    expect(spec.degradedFrom).toBe('residential')
    expect(spec.apifyProxyCountry).toBe('BR')
  })

  it('AC5: degrada para grupos vazios se nem datacenter disponivel', () => {
    const spec = resolveProxySpec('zap', { availableGroups: [], country: 'BR' })
    expect(spec.tier).toBe('datacenter')
    expect(spec.apifyProxyGroups).toEqual([])
    expect(spec.degradedFrom).toBe('residential')
  })
})

// ---------------------------------------------------------------------------
// readProxyEnv — AC5
// ---------------------------------------------------------------------------

describe('readProxyEnv — AC5', () => {
  it('parseia APIFY_PROXY_GROUPS CSV (trim + uppercase)', () => {
    const env = readProxyEnv({
      APIFY_PROXY_GROUPS: ' residential , datacenter ',
      APIFY_PROXY_COUNTRY: 'br',
    })
    expect(env.availableGroups).toEqual([RESIDENTIAL_GROUP, DATACENTER_GROUP])
    expect(env.country).toBe('br')
  })

  it('default: ambos os grupos + BR quando env ausente', () => {
    const env = readProxyEnv({})
    expect(env.availableGroups).toEqual([RESIDENTIAL_GROUP, DATACENTER_GROUP])
    expect(env.country).toBe('BR')
  })

  it('sem hardcode de credencial — apenas grupos e pais', () => {
    const env = readProxyEnv({ APIFY_PROXY_GROUPS: 'DATACENTER' })
    expect(env.availableGroups).toEqual([DATACENTER_GROUP])
    expect(env.country).toBe('BR')
  })
})

// ---------------------------------------------------------------------------
// buildProxyConfiguration — AC1/AC5/AC7 (factory injetavel)
// ---------------------------------------------------------------------------

describe('buildProxyConfiguration — factory injetavel (AC7)', () => {
  it('ZAP: factory recebe RESIDENTIAL + BR', async () => {
    const captured: ProxyFactoryInput[] = []
    const factory = vi.fn(async (input: ProxyFactoryInput) => {
      captured.push(input)
      return { _tag: 'proxy-config' } as never
    })

    await buildProxyConfiguration('zap', factory, FULL_ENV)

    expect(factory).toHaveBeenCalledTimes(1)
    expect(captured[0]).toEqual({
      groups: [RESIDENTIAL_GROUP],
      countryCode: 'BR',
    })
  })

  it('MercadoLivre: factory recebe DATACENTER (nunca residencial)', async () => {
    const factory = vi.fn(async () => ({}) as never)
    await buildProxyConfiguration('mercadolivre', factory, FULL_ENV)
    expect(factory).toHaveBeenCalledWith({
      groups: [DATACENTER_GROUP],
      countryCode: 'BR',
    })
  })

  it('AC5: fallback loga e factory recebe datacenter quando residencial indisponivel', async () => {
    const factory = vi.fn(async () => ({}) as never)
    const logger = vi.fn()

    await buildProxyConfiguration('zap', factory, NO_RESIDENTIAL_ENV, logger)

    expect(logger).toHaveBeenCalledTimes(1)
    expect(logger.mock.calls[0][0]).toMatch(/residential.*indisponivel.*datacenter/i)
    expect(factory).toHaveBeenCalledWith({
      groups: [DATACENTER_GROUP],
      countryCode: 'BR',
    })
  })

  it('nao loga quando nao ha degradacao', async () => {
    const factory = vi.fn(async () => ({}) as never)
    const logger = vi.fn()
    await buildProxyConfiguration('zap', factory, FULL_ENV, logger)
    expect(logger).not.toHaveBeenCalled()
  })
})

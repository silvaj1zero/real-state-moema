import { describe, it, expect } from 'vitest'
import { normalizeListing, buildParametricSearchInput } from './apify'

describe('normalizeListing', () => {
  it('should normalize a ZAP listing with all fields', () => {
    const raw = {
      externalId: 'zap-123',
      url: 'https://zap.com.br/listing/123',
      address: 'Rua Canario, 123 - Moema',
      price: 850000,
      area: 75,
      rooms: 3,
      advertiserType: 'owner',
      description: 'Apartamento amplo em Moema',
      neighborhood: 'Moema',
      propertyType: 'Apartamento',
      latitude: -23.5910,
      longitude: -46.6600,
    }

    const result = normalizeListing(raw, 'zap')

    expect(result).not.toBeNull()
    expect(result!.portal).toBe('zap')
    expect(result!.external_id).toBe('zap-123')
    expect(result!.tipo_anunciante).toBe('proprietario')
    expect(result!.is_fisbo).toBe(true)
    expect(result!.preco).toBe(850000)
    expect(result!.area_m2).toBe(75)
    expect(result!.preco_m2).toBeCloseTo(11333.33, 1)
    expect(result!.quartos).toBe(3)
    expect(result!.lat).toBe(-23.5910)
    expect(result!.lng).toBe(-46.6600)
  })

  it('should detect imobiliaria advertiser type', () => {
    const raw = {
      externalId: 'olx-456',
      advertiserType: 'Imobiliária XYZ',
    }
    const result = normalizeListing(raw, 'olx')
    expect(result!.tipo_anunciante).toBe('imobiliaria')
    expect(result!.is_fisbo).toBe(false)
  })

  it('should detect corretor advertiser type', () => {
    const raw = {
      externalId: 'vr-789',
      advertiserType: 'Corretor João',
    }
    const result = normalizeListing(raw, 'vivareal')
    expect(result!.tipo_anunciante).toBe('corretor')
    expect(result!.is_fisbo).toBe(false)
  })

  it('should return desconhecido for unknown advertiser type', () => {
    const raw = { externalId: 'x-1' }
    const result = normalizeListing(raw, 'zap')
    expect(result!.tipo_anunciante).toBe('desconhecido')
  })

  it('should return null when no external_id or url', () => {
    const raw = { address: 'Some address' }
    const result = normalizeListing(raw, 'zap')
    expect(result).toBeNull()
  })

  it('should use url as external_id fallback', () => {
    const raw = { url: 'https://zap.com.br/listing/abc' }
    const result = normalizeListing(raw, 'zap')
    expect(result!.external_id).toBe('https://zap.com.br/listing/abc')
  })

  it('should handle string price and area', () => {
    const raw = {
      externalId: 'test-1',
      price: 'R$ 1.200.000',
      area: '120.5 m²',
    }
    const result = normalizeListing(raw, 'zap')
    expect(result!.preco).toBe(1200000)
    expect(result!.area_m2).toBe(120.5)
  })

  it('should set preco_m2 to null when area is 0', () => {
    const raw = {
      externalId: 'test-2',
      price: 500000,
      area: 0,
    }
    const result = normalizeListing(raw, 'olx')
    expect(result!.preco_m2).toBeNull()
  })

  it('should truncate long descriptions', () => {
    const raw = {
      externalId: 'test-3',
      description: 'A'.repeat(600),
    }
    const result = normalizeListing(raw, 'zap')
    expect(result!.descricao!.length).toBe(500)
  })

  it('should detect proprietário with accent', () => {
    const raw = {
      externalId: 'test-4',
      advertiserType: 'Proprietário',
    }
    const result = normalizeListing(raw, 'zap')
    expect(result!.tipo_anunciante).toBe('proprietario')
    expect(result!.is_fisbo).toBe(true)
  })

  it('should detect OLX particular as proprietario', () => {
    const raw = {
      externalId: 'test-5',
      advertiserType: 'Particular',
    }
    const result = normalizeListing(raw, 'olx')
    expect(result!.tipo_anunciante).toBe('proprietario')
    expect(result!.is_fisbo).toBe(true)
  })

  // Story 7.11 (AC3) — mapeamento determinístico do publisherType nativo
  describe('publisher_type (Story 7.11 AC3)', () => {
    it.each([
      ['owner', 'owner'],
      ['OWNER', 'owner'],
      ['agency', 'agency'],
      ['AGENCY', 'agency'],
      ['developer', 'developer'],
      ['DEVELOPER', 'developer'],
    ])('maps native advertiserType "%s" -> publisher_type "%s"', (raw, expected) => {
      const result = normalizeListing({ externalId: 'pt-1', advertiserType: raw }, 'zap')
      expect(result!.publisher_type).toBe(expected)
    })

    it('sets publisher_type=null when advertiserType absent (ex.: MercadoLivre)', () => {
      const result = normalizeListing({ externalId: 'pt-2' }, 'vivareal')
      expect(result!.publisher_type).toBeNull()
    })

    it('sets publisher_type=null for non-canonical values (ex.: "Corretor João")', () => {
      // tipo_anunciante ainda infere via heuristica fuzzy, mas o sinal
      // determinístico só dispara com OWNER/AGENCY/DEVELOPER exatos.
      const result = normalizeListing({ externalId: 'pt-3', advertiserType: 'Corretor João' }, 'vivareal')
      expect(result!.publisher_type).toBeNull()
      expect(result!.tipo_anunciante).toBe('corretor')
    })
  })
})

// Story 7.13 (AC3) — proxy tiering injetado no INPUT do actor parametrico
describe('buildParametricSearchInput — proxy por alvo (Story 7.13)', () => {
  it('ZAP recebe proxyConfiguration residencial BR', () => {
    const input = buildParametricSearchInput('zap', { tipo_transacao: 'venda' })
    expect(input.proxyConfiguration).toEqual({
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
      apifyProxyCountryCode: 'BR',
    })
  })

  it('VivaReal recebe proxy residencial', () => {
    const input = buildParametricSearchInput('vivareal', {})
    expect((input.proxyConfiguration as { apifyProxyGroups: string[] }).apifyProxyGroups).toEqual([
      'RESIDENTIAL',
    ])
  })

  it('OLX recebe proxy datacenter (nao residencial)', () => {
    const input = buildParametricSearchInput('olx', {})
    const proxy = input.proxyConfiguration as { apifyProxyGroups?: string[] }
    expect(proxy.apifyProxyGroups).not.toContain('RESIDENTIAL')
  })

  it('preserva os filtros existentes ao lado do proxy', () => {
    const input = buildParametricSearchInput('zap', {
      preco_min: 500000,
      area_min: 80,
      quartos_min: 2,
    })
    expect(input).toMatchObject({
      sources: 'zap',
      minPrice: 500000,
      minArea: 80,
      minBedrooms: 2,
    })
    expect(input.proxyConfiguration).toBeDefined()
  })
})

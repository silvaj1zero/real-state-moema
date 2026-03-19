import { describe, it, expect } from 'vitest'
import { normalizeListing } from './apify'

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
})

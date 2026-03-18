import { describe, it, expect } from 'vitest'
import { calculateFisboScore, type NearbyListing } from './useLeadEnrichment'

function makeListing(overrides: Partial<NearbyListing> = {}): NearbyListing {
  return {
    id: crypto.randomUUID(),
    endereco: 'Rua Teste, 100',
    preco: 800000,
    area_m2: 80,
    portal: 'zap',
    is_fisbo: false,
    tempo_mercado_dias: 30,
    ...overrides,
  }
}

describe('calculateFisboScore', () => {
  it('should return 0 for no signals', () => {
    const result = calculateFisboScore([], null, null)
    expect(result.score).toBe(0)
    expect(result.sinais).toHaveLength(0)
  })

  it('should add 30 for FISBO in same building', () => {
    const matched = makeListing({ is_fisbo: true })
    const result = calculateFisboScore([], matched, null)
    expect(result.score).toBe(30)
    expect(result.sinais[0]).toContain('+30')
  })

  it('should add 20 for FISBO nearby', () => {
    const nearby = [makeListing({ is_fisbo: true })]
    const result = calculateFisboScore(nearby, null, null)
    expect(result.score).toBe(20)
  })

  it('should add 15 for large building', () => {
    const result = calculateFisboScore([], null, 50)
    expect(result.score).toBe(15)
    expect(result.sinais[0]).toContain('50 unidades')
  })

  it('should add 10 for long market time', () => {
    const nearby = [makeListing({ tempo_mercado_dias: 120 })]
    const result = calculateFisboScore(nearby, null, null)
    expect(result.score).toBe(10)
  })

  it('should cap at 100', () => {
    const matched = makeListing({ is_fisbo: true })
    const nearby = [
      makeListing({ is_fisbo: true, tempo_mercado_dias: 120 }),
      makeListing({ tempo_mercado_dias: 100 }),
    ]
    const result = calculateFisboScore(nearby, matched, 50)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('should accumulate multiple signals', () => {
    const matched = makeListing({ is_fisbo: true })
    const result = calculateFisboScore([], matched, 30)
    // 30 (matched FISBO) + 15 (large building) = 45
    expect(result.score).toBe(45)
    expect(result.sinais).toHaveLength(2)
  })
})

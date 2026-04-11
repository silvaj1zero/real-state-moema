import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { calculateAcmStats, useComparaveis } from './useAcm'
import type { ComparavelNoRaio } from '@/lib/supabase/types'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/client'
const mockCreateClient = vi.mocked(createClient)

function makeRpcError(msg = 'RPC error') {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: msg } }),
  }
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => { vi.resetAllMocks() })

describe('useComparaveis — error propagation', () => {
  it('propagates Supabase RPC error instead of returning []', async () => {
    mockCreateClient.mockReturnValue(makeRpcError() as unknown as ReturnType<typeof createClient>)

    const { result } = renderHook(
      () => useComparaveis(-23.6, -46.6, 'consultant-1', 500),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch comparáveis')
    expect(result.current.comparaveis).toEqual([])
  })
})

function makeComparavel(overrides: Partial<ComparavelNoRaio> = {}): ComparavelNoRaio {
  return {
    comparavel_id: crypto.randomUUID(),
    endereco: 'Rua Teste, 100',
    area_m2: 80,
    preco: 800000,
    preco_m2: 10000,
    is_venda_real: false,
    fonte: 'manual',
    distancia_m: 200,
    ...overrides,
  }
}

describe('calculateAcmStats', () => {
  it('should return zero stats for empty array', () => {
    const stats = calculateAcmStats([])
    expect(stats.mediaPrecoM2).toBe(0)
    expect(stats.medianaPrecoM2).toBe(0)
    expect(stats.tendenciaPercent).toBeNull()
    expect(stats.totalComparaveis).toBe(0)
    expect(stats.countManual).toBe(0)
    expect(stats.countScraping).toBe(0)
  })

  it('should calculate average correctly', () => {
    const comparaveis = [
      makeComparavel({ preco_m2: 10000 }),
      makeComparavel({ preco_m2: 12000 }),
      makeComparavel({ preco_m2: 14000 }),
    ]
    const stats = calculateAcmStats(comparaveis)
    expect(stats.mediaPrecoM2).toBe(12000)
  })

  it('should calculate median for odd count', () => {
    const comparaveis = [
      makeComparavel({ preco_m2: 10000 }),
      makeComparavel({ preco_m2: 14000 }),
      makeComparavel({ preco_m2: 12000 }),
    ]
    const stats = calculateAcmStats(comparaveis)
    expect(stats.medianaPrecoM2).toBe(12000)
  })

  it('should calculate median for even count', () => {
    const comparaveis = [
      makeComparavel({ preco_m2: 10000 }),
      makeComparavel({ preco_m2: 12000 }),
      makeComparavel({ preco_m2: 14000 }),
      makeComparavel({ preco_m2: 16000 }),
    ]
    const stats = calculateAcmStats(comparaveis)
    expect(stats.medianaPrecoM2).toBe(13000)
  })

  it('should count by fonte correctly', () => {
    const comparaveis = [
      makeComparavel({ fonte: 'manual' }),
      makeComparavel({ fonte: 'manual' }),
      makeComparavel({ fonte: 'scraping' }),
    ]
    const stats = calculateAcmStats(comparaveis)
    expect(stats.totalComparaveis).toBe(3)
    expect(stats.countManual).toBe(2)
    expect(stats.countScraping).toBe(1)
  })

  it('VETO PV #3: should work with zero scraping data — manual only', () => {
    const comparaveis = [
      makeComparavel({ fonte: 'manual', preco_m2: 10000 }),
      makeComparavel({ fonte: 'manual', preco_m2: 12000 }),
      makeComparavel({ fonte: 'manual', preco_m2: 11000 }),
    ]
    const stats = calculateAcmStats(comparaveis)
    expect(stats.totalComparaveis).toBe(3)
    expect(stats.countScraping).toBe(0)
    expect(stats.countManual).toBe(3)
    expect(stats.mediaPrecoM2).toBe(11000)
    expect(stats.medianaPrecoM2).toBe(11000)
  })

  it('should ignore zero preco_m2 in calculations', () => {
    const comparaveis = [
      makeComparavel({ preco_m2: 10000 }),
      makeComparavel({ preco_m2: 0 }),
      makeComparavel({ preco_m2: 12000 }),
    ]
    const stats = calculateAcmStats(comparaveis)
    // Only 2 valid prices: avg of 10000+12000 = 11000
    expect(stats.mediaPrecoM2).toBe(11000)
    expect(stats.totalComparaveis).toBe(3) // total includes all
  })

  it('should handle single comparável', () => {
    const comparaveis = [makeComparavel({ preco_m2: 15000 })]
    const stats = calculateAcmStats(comparaveis)
    expect(stats.mediaPrecoM2).toBe(15000)
    expect(stats.medianaPrecoM2).toBe(15000)
    expect(stats.totalComparaveis).toBe(1)
  })
})

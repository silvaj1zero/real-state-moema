import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { calculateSplits, useComissoes } from './useComissoes'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'
const mockCreateClient = vi.mocked(createClient)

function makeErrorBuilder(msg = 'DB error') {
  const b: Record<string, unknown> = {}
  const c = () => b
  b.select = c; b.eq = c; b.order = c
  b.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: null, error: { message: msg } }).then(resolve)
  return b
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => { vi.resetAllMocks() })

describe('useComissoes — error propagation', () => {
  it('propagates Supabase error instead of returning []', async () => {
    mockCreateClient.mockReturnValue({ from: () => makeErrorBuilder() } as unknown as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useComissoes('consultant-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch comissoes')
    expect(result.current.comissoes).toEqual([])
  })

  it('returns [] when consultantId is null (not an error)', () => {
    const { result } = renderHook(() => useComissoes(null), {
      wrapper: makeWrapper(),
    })

    expect(result.current.comissoes).toEqual([])
    expect(result.current.error).toBeNull()
  })
})

describe('calculateSplits', () => {
  it('calculates basic split without extras', () => {
    const result = calculateSplits({
      valorImovel: 1_000_000,
      percentualComissao: 6,
      percentualConsultora: 50,
      percentualFranquia: 50,
      hasInformante: false,
      percentualInformante: 5,
      hasReferral: false,
      percentualReferral: 0,
      clausulaRelacionamento: false,
      percentualClausula: 3,
    })

    expect(result.valorBruto).toBe(60_000)
    expect(result.splitConsultora).toBe(30_000)
    expect(result.splitFranquia).toBe(30_000)
    expect(result.splitInformante).toBe(0)
    expect(result.clausulaValor).toBe(0)
  })

  it('deducts clausula before split', () => {
    const result = calculateSplits({
      valorImovel: 1_000_000,
      percentualComissao: 6,
      percentualConsultora: 50,
      percentualFranquia: 50,
      hasInformante: false,
      percentualInformante: 5,
      hasReferral: false,
      percentualReferral: 0,
      clausulaRelacionamento: true,
      percentualClausula: 3,
    })

    expect(result.clausulaValor).toBe(1_800) // 3% of 60k
    const base = 60_000 - 1_800
    expect(result.splitConsultora).toBe(base * 0.5)
    expect(result.splitFranquia).toBe(base * 0.5)
  })

  it('adds informante split from gross', () => {
    const result = calculateSplits({
      valorImovel: 1_000_000,
      percentualComissao: 6,
      percentualConsultora: 50,
      percentualFranquia: 50,
      hasInformante: true,
      percentualInformante: 5,
      hasReferral: false,
      percentualReferral: 0,
      clausulaRelacionamento: false,
      percentualClausula: 3,
    })

    expect(result.splitInformante).toBe(3_000) // 5% of 60k
  })
})

import { describe, it, expect } from 'vitest'
import { OwnerLookupMutationError } from '@/hooks/useOwnerLookup'
import { mapOwnerLookupError, mapOwnerLookupResult } from './owner-lookup-errors'
import type { OwnerLookupResponse } from '@/lib/schemas/owner-lookup'

function makeResponse(status: OwnerLookupResponse['status']): OwnerLookupResponse {
  return {
    lookup_id: 'l1',
    status,
    cache_hit: false,
    cache_age_days: 0,
    edificio_id: null,
    sql_lote: null,
    matricula: null,
    nome_proprietario: null,
    cpf_cnpj_masked: null,
    cartorio: null,
    data_matricula: null,
    ultima_transacao: null,
    custo_brl: 0,
    error_message: null,
    rate_remaining: 30,
    rate_reset_at: null,
    budget_used: 0,
    budget_limit: 60,
  }
}

describe('mapOwnerLookupError (AC4)', () => {
  it('429 → forbidden com horario HH:MM do reset', () => {
    const err = new OwnerLookupMutationError(429, {
      error: 'rate_limit_exceeded',
      rate_reset_at: '2026-07-08T18:30:00Z',
    })
    const r = mapOwnerLookupError(err)
    expect(r.state).toBe('forbidden')
    expect(r.message).toContain('Limite de 30 consultas/hora')
    expect(r.message).toMatch(/\d{2}:\d{2}/)
  })

  it('402 → budget_exceeded com R$X de R$Y', () => {
    const err = new OwnerLookupMutationError(402, {
      error: 'budget_exceeded',
      budget_used: 59.92,
      budget_limit: 60,
    })
    const r = mapOwnerLookupError(err)
    expect(r.state).toBe('budget_exceeded')
    expect(r.message).toContain('59,92')
    expect(r.message).toContain('60,00')
  })

  it('503 → disabled (flag OFF da 6.6)', () => {
    const err = new OwnerLookupMutationError(503, { error: 'owner_lookup_disabled' })
    expect(mapOwnerLookupError(err).state).toBe('disabled')
  })

  it('500/502 → error com retry', () => {
    const r = mapOwnerLookupError(new OwnerLookupMutationError(502, { error: 'lookup_failed' }))
    expect(r.state).toBe('error')
    expect(r.message).toContain('Tente novamente')
  })

  it('erro desconhecido (nao-mutation) → error generico', () => {
    expect(mapOwnerLookupError(new Error('boom')).state).toBe('error')
  })

  it('429 sem rate_reset_at → placeholder --:--', () => {
    const r = mapOwnerLookupError(new OwnerLookupMutationError(429, { error: 'rate_limit_exceeded' }))
    expect(r.message).toContain('--:--')
  })
})

describe('mapOwnerLookupResult', () => {
  it('success/not_found/failed → estados da UI', () => {
    expect(mapOwnerLookupResult(makeResponse('success'))).toBe('success')
    expect(mapOwnerLookupResult(makeResponse('not_found'))).toBe('not_found')
    expect(mapOwnerLookupResult(makeResponse('failed'))).toBe('error')
  })
})

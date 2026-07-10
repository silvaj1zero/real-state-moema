import { describe, it, expect } from 'vitest'
import { maskCpfCnpj, ownerLookupRequestSchema } from './owner-lookup'

describe('ownerLookupRequestSchema', () => {
  it('aceita { edificio_id } uuid', () => {
    const r = ownerLookupRequestSchema.safeParse({
      edificio_id: 'e0000000-0000-4000-8000-000000000001',
    })
    expect(r.success).toBe(true)
  })

  it('rejeita edificio_id nao-uuid', () => {
    expect(ownerLookupRequestSchema.safeParse({ edificio_id: 'abc' }).success).toBe(false)
  })

  it('aceita { sql_lote, endereco }', () => {
    const r = ownerLookupRequestSchema.safeParse({
      sql_lote: '001.002.0003-4',
      endereco: 'Al. dos Maracatins, 100',
    })
    expect(r.success).toBe(true)
  })

  it('rejeita sql_lote sem endereco', () => {
    expect(ownerLookupRequestSchema.safeParse({ sql_lote: '001.002.0003-4' }).success).toBe(false)
  })

  it('rejeita body vazio', () => {
    expect(ownerLookupRequestSchema.safeParse({}).success).toBe(false)
  })
})

describe('maskCpfCnpj (AC10 — LGPD)', () => {
  it('CPF formatado → mascara com ultimos 2 digitos', () => {
    expect(maskCpfCnpj('123.456.789-09')).toBe('***.***.***-09')
  })

  it('CNPJ → mesma mascara uniforme', () => {
    expect(maskCpfCnpj('12.345.678/0001-95')).toBe('***.***.***-95')
  })

  it('nunca contem o documento original', () => {
    const masked = maskCpfCnpj('98765432100')
    expect(masked).toBe('***.***.***-00')
    expect(masked).not.toContain('987')
  })

  it('null/vazio/curto → null', () => {
    expect(maskCpfCnpj(null)).toBeNull()
    expect(maskCpfCnpj('')).toBeNull()
    expect(maskCpfCnpj('12')).toBeNull()
  })
})

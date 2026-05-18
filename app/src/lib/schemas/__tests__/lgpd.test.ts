/**
 * LGPD Zod schemas tests — Story 7.10 AC5/AC6.
 *
 * Cobre: phoneSchema (formato BR, normalizacao para digitos), emailSchema,
 * optOutRequestSchema (pelo menos um identificador), processOptOutSchema
 * (formato protocol), generateProtocolNumber (formato + estabilidade).
 */

import { describe, it, expect } from 'vitest'

import {
  phoneSchema,
  emailSchema,
  optOutRequestSchema,
  processOptOutSchema,
  generateProtocolNumber,
} from '@/lib/schemas/lgpd'

describe('phoneSchema', () => {
  it('accepts +5511999998888 and normalises to digits-only', () => {
    const result = phoneSchema.safeParse('+5511999998888')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('5511999998888')
  })

  it('accepts masked format "(11) 99999-8888"', () => {
    const result = phoneSchema.safeParse('(11) 99999-8888')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('11999998888')
  })

  it('rejects too-short input', () => {
    const result = phoneSchema.safeParse('123')
    expect(result.success).toBe(false)
  })

  it('rejects input with alphabetic characters', () => {
    const result = phoneSchema.safeParse('11ABCD99998888')
    expect(result.success).toBe(false)
  })
})

describe('emailSchema', () => {
  it('accepts a valid email and lower-cases', () => {
    const result = emailSchema.safeParse('  Foo@Example.COM  ')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('foo@example.com')
  })

  it('rejects malformed email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('optOutRequestSchema', () => {
  it('accepts a request with telefone only', () => {
    const result = optOutRequestSchema.safeParse({ telefone: '11999998888' })
    expect(result.success).toBe(true)
  })

  it('accepts a request with email only', () => {
    const result = optOutRequestSchema.safeParse({ email: 'foo@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts a request with both + evidence', () => {
    const result = optOutRequestSchema.safeParse({
      telefone: '11999998888',
      email: 'foo@example.com',
      evidence: 'Recebi ligacao em 2026-05-17',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a request with neither telefone nor email', () => {
    const result = optOutRequestSchema.safeParse({ evidence: 'foo' })
    expect(result.success).toBe(false)
  })

  it('rejects evidence longer than 2000 chars', () => {
    const result = optOutRequestSchema.safeParse({
      email: 'foo@example.com',
      evidence: 'x'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })
})

describe('processOptOutSchema', () => {
  it('accepts a valid protocol number', () => {
    const result = processOptOutSchema.safeParse({
      protocol_number: 'OPT-2026-05-18-A1B2',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed protocol number', () => {
    expect(
      processOptOutSchema.safeParse({ protocol_number: 'BAD-123' }).success
    ).toBe(false)
    expect(
      processOptOutSchema.safeParse({ protocol_number: '' }).success
    ).toBe(false)
  })
})

describe('generateProtocolNumber', () => {
  it('produces a protocol matching the canonical regex', () => {
    const fixedDate = new Date(Date.UTC(2026, 4, 18, 12, 0, 0)) // 2026-05-18
    const protocol = generateProtocolNumber(fixedDate)
    expect(protocol).toMatch(/^OPT-2026-05-18-[A-Z0-9]{4}$/)
    // Round-trip through schema (parse should succeed).
    expect(processOptOutSchema.safeParse({ protocol_number: protocol }).success).toBe(
      true
    )
  })

  it('zero-pads month and day correctly', () => {
    const fixedDate = new Date(Date.UTC(2026, 0, 5, 0, 0, 0)) // 2026-01-05
    const protocol = generateProtocolNumber(fixedDate)
    expect(protocol.startsWith('OPT-2026-01-05-')).toBe(true)
  })
})

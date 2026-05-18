/**
 * Advertisers schema — AC2 + AC6.
 *
 * Cobre: happy path, classification out-of-range, confidence out-of-range,
 * CRECI regex (match/no-match), CNPJ regex (match/no-match), signals fechados.
 */

import { describe, it, expect } from 'vitest'

import { AgentSchema, CreciRegex } from '@/lib/schemas/epic7/agent'
import { BrokerSchema, CnpjRegex } from '@/lib/schemas/epic7/broker'
import {
  AdvertisersSchema,
  AdvertiserClassificationSchema,
  ClassificationSignalSchema,
} from '@/lib/schemas/epic7/advertisers'

describe('AdvertiserClassification enum', () => {
  it('accepts 5 canonical categories', () => {
    for (const c of ['agent', 'broker', 'builder', 'for_sale_by_owner', 'unknown'] as const) {
      expect(AdvertiserClassificationSchema.safeParse(c).success).toBe(true)
    }
  })

  it('rejects out-of-enum value', () => {
    expect(AdvertiserClassificationSchema.safeParse('proprietario').success).toBe(false)
    expect(AdvertiserClassificationSchema.safeParse('').success).toBe(false)
  })
})

describe('ClassificationSignal enum', () => {
  it('accepts canonical signals', () => {
    expect(ClassificationSignalSchema.safeParse('ddd_mobile').success).toBe(true)
    expect(ClassificationSignalSchema.safeParse('cnpj_match_construtora').success).toBe(true)
    expect(ClassificationSignalSchema.safeParse('has_creci').success).toBe(true)
  })

  it('rejects unknown signal', () => {
    expect(ClassificationSignalSchema.safeParse('telefone_sp').success).toBe(false)
  })
})

describe('CreciRegex (AC6)', () => {
  it('matches valid CRECI formats', () => {
    expect(CreciRegex.test('12345')).toBe(true)
    expect(CreciRegex.test('12345-F')).toBe(true)
    expect(CreciRegex.test('1234/S')).toBe(true)
    expect(CreciRegex.test('1-A')).toBe(true)
    expect(CreciRegex.test('123456')).toBe(true)
  })

  it('rejects invalid CRECI formats', () => {
    expect(CreciRegex.test('')).toBe(false)
    expect(CreciRegex.test('abc')).toBe(false)
    expect(CreciRegex.test('1234567')).toBe(false) // > 6 digits
    expect(CreciRegex.test('12345-FF')).toBe(false) // 2 letters
    expect(CreciRegex.test('12345-f')).toBe(false) // lowercase
  })
})

describe('CnpjRegex (AC6)', () => {
  it('matches 14 numeric digits', () => {
    expect(CnpjRegex.test('12345678000190')).toBe(true)
    expect(CnpjRegex.test('00000000000000')).toBe(true)
  })

  it('rejects masked or non-numeric CNPJ', () => {
    expect(CnpjRegex.test('12.345.678/0001-90')).toBe(false)
    expect(CnpjRegex.test('1234567800019')).toBe(false) // 13 digits
    expect(CnpjRegex.test('123456780001900')).toBe(false) // 15 digits
    expect(CnpjRegex.test('')).toBe(false)
  })
})

describe('AgentSchema', () => {
  it('parses minimal valid agent', () => {
    const result = AgentSchema.safeParse({
      uuid: 'a-1',
      name: 'Joao Silva',
      email: 'joao@imob.com',
      phones: null,
      creci: '12345-F',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.creci_validated).toBe(false) // default
    }
  })

  it('rejects invalid CRECI', () => {
    const result = AgentSchema.safeParse({
      uuid: null,
      name: 'X',
      email: null,
      phones: null,
      creci: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null CRECI (FISBO/unknown case)', () => {
    const result = AgentSchema.safeParse({
      uuid: null,
      name: null,
      email: null,
      phones: null,
      creci: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('BrokerSchema', () => {
  it('parses valid broker', () => {
    const result = BrokerSchema.safeParse({
      uuid: 'b-1',
      name: 'Imobiliaria X Ltda',
      cnpj: '12345678000190',
    })
    expect(result.success).toBe(true)
  })

  it('rejects masked CNPJ', () => {
    const result = BrokerSchema.safeParse({
      uuid: null,
      name: 'X',
      cnpj: '12.345.678/0001-90',
    })
    expect(result.success).toBe(false)
  })
})

describe('AdvertisersSchema (AC2 happy path + edge cases)', () => {
  it('parses fully populated advertisers', () => {
    const payload = {
      agent: {
        uuid: 'a-1',
        name: 'Joao Silva',
        email: 'joao@imob.com',
        phones: [{ number: '11999999999', type: 'mobile', primary: true }],
        creci: '12345-F',
        creci_validated: true,
      },
      broker: {
        uuid: 'b-1',
        name: 'Imobiliaria X',
        cnpj: '12345678000190',
      },
      builder: null,
      office: null,
      classification: 'agent',
      classification_confidence: 0.85,
      classification_signals: ['has_creci'],
    }
    const result = AdvertisersSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('accepts empty signals array', () => {
    const result = AdvertisersSchema.safeParse({
      agent: null,
      broker: null,
      builder: null,
      office: null,
      classification: 'unknown',
      classification_confidence: 0,
      classification_signals: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects classification_confidence < 0', () => {
    const result = AdvertisersSchema.safeParse({
      agent: null,
      broker: null,
      builder: null,
      office: null,
      classification: 'unknown',
      classification_confidence: -0.01,
      classification_signals: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects classification_confidence > 1', () => {
    const result = AdvertisersSchema.safeParse({
      agent: null,
      broker: null,
      builder: null,
      office: null,
      classification: 'unknown',
      classification_confidence: 1.01,
      classification_signals: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects out-of-enum classification', () => {
    const result = AdvertisersSchema.safeParse({
      agent: null,
      broker: null,
      builder: null,
      office: null,
      classification: 'corretor',
      classification_confidence: 0.5,
      classification_signals: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing required field (classification)', () => {
    const result = AdvertisersSchema.safeParse({
      agent: null,
      broker: null,
      builder: null,
      office: null,
      classification_confidence: 0.5,
      classification_signals: [],
    })
    expect(result.success).toBe(false)
  })
})

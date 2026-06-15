/**
 * classifyAdvertiser tests — Story 7.3.
 *
 * Cobre:
 *  - AC3 truth table (12+ cases) — builder/broker via CNAE, FISBO 4-signal,
 *    agent via CRECI, unknown, edge CNPJ-vs-CRECI prioridade.
 *  - AC4 lookupCNAE — cache hit/miss, TTL expira, fetcher injetavel,
 *    CNPJ desconhecido retorna ''.
 *  - AC5 nameAppearsPersonal — aceita PF, rejeita PJ (LTDA/ME/EIRELI/S.A.),
 *    rejeita keywords PJ, edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  classifyAdvertiser,
  nameAppearsPersonal,
  normalizePublisherType,
  lookupCNAE,
  SupabaseCNAELookupClient,
  type CNAELookupClient,
  type AdvertiserSignals,
  _clearCNAECache,
  _cacheSize,
} from '@/lib/scrapers/classify-advertiser'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignals(over: Partial<AdvertiserSignals> = {}): AdvertiserSignals {
  return {
    hasCRECI: false,
    nameAppearsPersonal: false,
    ...over,
  }
}

// ---------------------------------------------------------------------------
// AC3 truth-table — classifyAdvertiser
// ---------------------------------------------------------------------------

describe('classifyAdvertiser — AC3 truth table', () => {
  it('CASE 1: builder via CNAE 4110700 (incorporacao)', () => {
    const r = classifyAdvertiser(
      makeSignals({ cnpj: '12345678000100', cnae: '4110700' }),
    )
    expect(r.classification).toBe('builder')
    expect(r.confidence).toBe(0.95)
    expect(r.signals).toEqual(['cnpj_match_construtora'])
  })

  it('CASE 2: builder via CNAE 4120400 (construcao edificios)', () => {
    const r = classifyAdvertiser(
      makeSignals({ cnpj: '99999999000100', cnae: '4120400' }),
    )
    expect(r.classification).toBe('builder')
    expect(r.confidence).toBe(0.95)
    expect(r.signals).toContain('cnpj_match_construtora')
  })

  it('CASE 3: broker via CNAE 6822500 (gestao imobiliaria)', () => {
    const r = classifyAdvertiser(
      makeSignals({ cnpj: '11111111000100', cnae: '6822500' }),
    )
    expect(r.classification).toBe('broker')
    expect(r.confidence).toBe(0.9)
    expect(r.signals).toEqual(['cnpj_match_imobiliaria'])
  })

  it('CASE 4: broker via CNAE 6831700 (corretagem)', () => {
    const r = classifyAdvertiser(
      makeSignals({ cnpj: '22222222000100', cnae: '6831700' }),
    )
    expect(r.classification).toBe('broker')
    expect(r.confidence).toBe(0.9)
  })

  it('CASE 5: FISBO 4-signal positive — todos sinais convergem', () => {
    const r = classifyAdvertiser(
      makeSignals({
        hasCRECI: false,
        phoneType: 'mobile',
        listingCountByPhone: 1,
        nameAppearsPersonal: true,
      }),
    )
    expect(r.classification).toBe('for_sale_by_owner')
    expect(r.confidence).toBe(0.85)
    expect(r.signals).toEqual([
      'no_creci_match',
      'ddd_mobile',
      'single_listing',
      'name_appears_personal',
    ])
  })

  it('CASE 6: FISBO 3-signal negative — falta 1 sinal -> nao classifica FISBO', () => {
    // phoneType=landline rompe convergencia
    const r = classifyAdvertiser(
      makeSignals({
        hasCRECI: false,
        phoneType: 'landline',
        listingCountByPhone: 1,
        nameAppearsPersonal: true,
      }),
    )
    expect(r.classification).toBe('unknown')
    expect(r.confidence).toBe(0)
  })

  it('CASE 6b: FISBO 3-signal negative — multiple listings rompe single_listing', () => {
    const r = classifyAdvertiser(
      makeSignals({
        hasCRECI: false,
        phoneType: 'mobile',
        listingCountByPhone: 5,
        nameAppearsPersonal: true,
      }),
    )
    expect(r.classification).toBe('unknown')
  })

  it('CASE 7: agent — CRECI presente, sem CNPJ', () => {
    const r = classifyAdvertiser(
      makeSignals({
        hasCRECI: true,
        nameAppearsPersonal: true,
      }),
    )
    expect(r.classification).toBe('agent')
    expect(r.confidence).toBe(0.8)
    expect(r.signals).toEqual(['has_creci'])
  })

  it('CASE 8: unknown — nenhum sinal forte', () => {
    const r = classifyAdvertiser(makeSignals({}))
    expect(r.classification).toBe('unknown')
    expect(r.confidence).toBe(0)
    expect(r.signals).toEqual([])
  })

  it('CASE 9 edge: hasCRECI=true AND CNPJ-match -> CNPJ vence (builder)', () => {
    const r = classifyAdvertiser(
      makeSignals({
        hasCRECI: true,
        cnpj: '33333333000100',
        cnae: '4110700',
      }),
    )
    expect(r.classification).toBe('builder')
    expect(r.signals).not.toContain('has_creci')
  })

  it('CASE 10 edge: CNPJ desconhecido (cnae=undefined) cai para regras seguintes', () => {
    // CNPJ extraido mas enrichment vazio -> sem cnae -> FISBO se sinais OK
    const r = classifyAdvertiser(
      makeSignals({
        cnpj: '44444444000100',
        cnae: undefined,
        hasCRECI: false,
        phoneType: 'mobile',
        listingCountByPhone: 1,
        nameAppearsPersonal: true,
      }),
    )
    expect(r.classification).toBe('for_sale_by_owner')
  })

  it('CASE 11 edge: CNAE nao-target (ex.: 4711301 mercearia) -> sem match, cai para proximas regras', () => {
    const r = classifyAdvertiser(
      makeSignals({
        cnpj: '55555555000100',
        cnae: '4711301',
        hasCRECI: true,
      }),
    )
    expect(r.classification).toBe('agent') // cai para passo 4
  })

  it('CASE 12 edge: CNAE presente sem CNPJ -> NAO aciona regras 1/2', () => {
    // CNAE so e considerado se CNPJ tambem presente (consistencia)
    const r = classifyAdvertiser(
      makeSignals({
        cnae: '4110700',
        hasCRECI: false,
      }),
    )
    expect(r.classification).toBe('unknown')
  })

  it('CASE 13 edge: FISBO mas hasCRECI=true -> nao classifica FISBO, vai para agent', () => {
    const r = classifyAdvertiser(
      makeSignals({
        hasCRECI: true,
        phoneType: 'mobile',
        listingCountByPhone: 1,
        nameAppearsPersonal: true,
      }),
    )
    // 3 dos 4 sinais FISBO (no_creci_match falta) -> cai para CRECI
    expect(r.classification).toBe('agent')
  })

  it('AC1: funcao e pura (chamadas com mesmo input retornam mesmo output)', () => {
    const sig = makeSignals({
      hasCRECI: false,
      phoneType: 'mobile',
      listingCountByPhone: 1,
      nameAppearsPersonal: true,
    })
    const r1 = classifyAdvertiser(sig)
    const r2 = classifyAdvertiser(sig)
    expect(r1).toEqual(r2)
  })
})

// ---------------------------------------------------------------------------
// Story 7.11 — Passo 0 deterministico via publisherType
// ---------------------------------------------------------------------------

describe('classifyAdvertiser — Passo 0 publisherType (Story 7.11)', () => {
  it('AC2: owner -> for_sale_by_owner confidence 0.95', () => {
    const r = classifyAdvertiser(makeSignals({ publisherType: 'owner' }))
    expect(r.classification).toBe('for_sale_by_owner')
    expect(r.confidence).toBe(0.95)
    expect(r.signals).toEqual(['publisher_type_owner'])
  })

  it('AC2: agency -> broker confidence 0.95', () => {
    const r = classifyAdvertiser(makeSignals({ publisherType: 'agency' }))
    expect(r.classification).toBe('broker')
    expect(r.confidence).toBe(0.95)
    expect(r.signals).toEqual(['publisher_type_agency'])
  })

  it('AC2: developer -> builder confidence 0.95', () => {
    const r = classifyAdvertiser(makeSignals({ publisherType: 'developer' }))
    expect(r.classification).toBe('builder')
    expect(r.confidence).toBe(0.95)
    expect(r.signals).toEqual(['publisher_type_developer'])
  })

  it('AC2: publisherType precede a heuristica — owner vence apesar de sinais nao-FISBO', () => {
    // phoneType landline + multiplos anuncios romperiam FISBO na heuristica,
    // mas o publisherType deterministico vence antes.
    const r = classifyAdvertiser(
      makeSignals({
        publisherType: 'owner',
        phoneType: 'landline',
        listingCountByPhone: 9,
        nameAppearsPersonal: false,
      }),
    )
    expect(r.classification).toBe('for_sale_by_owner')
    expect(r.confidence).toBe(0.95)
  })

  it('AC2: publisherType precede CNPJ/CNAE — agency vence sobre CNAE construtora', () => {
    const r = classifyAdvertiser(
      makeSignals({ publisherType: 'agency', cnpj: '12345678000100', cnae: '4110700' }),
    )
    expect(r.classification).toBe('broker')
    expect(r.signals).toEqual(['publisher_type_agency'])
  })

  it('AC5: conflito owner + CRECI -> owner vence, signal de conflito registrado', () => {
    const r = classifyAdvertiser(
      makeSignals({ publisherType: 'owner', hasCRECI: true }),
    )
    expect(r.classification).toBe('for_sale_by_owner')
    expect(r.confidence).toBe(0.95)
    expect(r.signals).toEqual([
      'publisher_type_owner',
      'publisher_type_creci_conflict',
    ])
  })

  it('AC5: agency + CRECI NAO gera signal de conflito (so owner+CRECI e suspeito)', () => {
    const r = classifyAdvertiser(
      makeSignals({ publisherType: 'agency', hasCRECI: true }),
    )
    expect(r.classification).toBe('broker')
    expect(r.signals).toEqual(['publisher_type_agency'])
  })

  it('AC2: ausencia de publisherType -> heuristica 4-signal preservada (regressao)', () => {
    // Sem publisherType, FISBO 4-signal deve classificar como antes (0.85).
    const r = classifyAdvertiser(
      makeSignals({
        publisherType: undefined,
        hasCRECI: false,
        phoneType: 'mobile',
        listingCountByPhone: 1,
        nameAppearsPersonal: true,
      }),
    )
    expect(r.classification).toBe('for_sale_by_owner')
    expect(r.confidence).toBe(0.85)
    expect(r.signals).toEqual([
      'no_creci_match',
      'ddd_mobile',
      'single_listing',
      'name_appears_personal',
    ])
  })
})

describe('normalizePublisherType — AC3 (Story 7.11)', () => {
  it.each([
    ['OWNER', 'owner'],
    ['owner', 'owner'],
    ['  Owner  ', 'owner'],
    ['AGENCY', 'agency'],
    ['agency', 'agency'],
    ['DEVELOPER', 'developer'],
    ['developer', 'developer'],
  ])('normaliza "%s" -> %s', (raw, expected) => {
    expect(normalizePublisherType(raw)).toBe(expected)
  })

  it.each([
    [null],
    [undefined],
    [''],
    ['  '],
    ['Corretor'],
    ['imobiliaria'],
    ['proprietario'],
    ['seller'],
  ])('retorna undefined para valor nao-canonico: %s', (raw) => {
    expect(normalizePublisherType(raw)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// AC5 — nameAppearsPersonal
// ---------------------------------------------------------------------------

describe('nameAppearsPersonal — AC5', () => {
  it.each([
    ['Joao Silva', true],
    ['Maria Helena Souza', true],
    ['Pedro Henrique de Oliveira', true],
    ['Ana Carla', true],
    ['Joao da Silva', true], // particle 'da'
    ['Lucas dos Santos', true], // particle 'dos'
  ])('PF aceito: "%s" -> %s', (name, expected) => {
    expect(nameAppearsPersonal(name)).toBe(expected)
  })

  it.each([
    ['Joao Silva Construtora LTDA', false],
    ['Imobiliaria ABC LTDA', false],
    ['Maria Construtora ME', false],
    ['XYZ Empreendimentos EIRELI', false],
    ['ABC S.A.', false],
    ['Pedro EPP', false],
    ['Imobiliaria Sao Paulo', false], // keyword PJ "Imobiliaria"
    ['Construtora Alpha Beta', false], // keyword PJ
    ['XYZ Imoveis', false], // keyword PJ
  ])('PJ rejeitado: "%s" -> %s', (name, expected) => {
    expect(nameAppearsPersonal(name)).toBe(expected)
  })

  it.each([
    ['', false],
    ['  ', false],
    ['Joao', false], // 1 palavra
    ['A B C D E F G', false], // >5 palavras
    ['Joao 123 Silva', false], // digitos
    ['joao silva', false], // sem capitalizacao
  ])('Edge: "%s" -> %s', (name, expected) => {
    expect(nameAppearsPersonal(name)).toBe(expected)
  })

  it('Edge: null/undefined', () => {
    expect(nameAppearsPersonal(null)).toBe(false)
    expect(nameAppearsPersonal(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// AC4 — lookupCNAE (cache + injectable client)
// ---------------------------------------------------------------------------

describe('lookupCNAE — AC4 cache + injectable client', () => {
  beforeEach(() => {
    _clearCNAECache()
  })

  it('cache MISS: chama client.fetchCNAE e armazena resultado', async () => {
    const fetchCNAE = vi.fn(async () => '4110700')
    const client: CNAELookupClient = { fetchCNAE }

    const result = await lookupCNAE(client, '12345678000100')
    expect(result).toBe('4110700')
    expect(fetchCNAE).toHaveBeenCalledTimes(1)
    expect(_cacheSize()).toBe(1)
  })

  it('cache HIT: segunda chamada nao re-fetch dentro do TTL', async () => {
    const fetchCNAE = vi.fn(async () => '6822500')
    const client: CNAELookupClient = { fetchCNAE }

    const now = vi.fn(() => 1_000_000)
    await lookupCNAE(client, '11111111000100', now)
    await lookupCNAE(client, '11111111000100', now)
    await lookupCNAE(client, '11111111000100', now)
    expect(fetchCNAE).toHaveBeenCalledTimes(1)
  })

  it('cache TTL expira apos 5min — re-fetch', async () => {
    const fetchCNAE = vi.fn(async () => '4120400')
    const client: CNAELookupClient = { fetchCNAE }

    let t = 1_000_000
    const now = () => t
    await lookupCNAE(client, '22222222000100', now)
    expect(fetchCNAE).toHaveBeenCalledTimes(1)

    // Avanca 6min — TTL = 5min
    t += 6 * 60 * 1000
    await lookupCNAE(client, '22222222000100', now)
    expect(fetchCNAE).toHaveBeenCalledTimes(2)
  })

  it('CNPJ desconhecido (fetchCNAE retorna null) -> retorna ""', async () => {
    const fetchCNAE = vi.fn(async () => null)
    const client: CNAELookupClient = { fetchCNAE }

    const result = await lookupCNAE(client, '99999999000100')
    expect(result).toBe('')
    // Mesmo o miss (null) e cacheado para evitar re-fetch durante TTL
    expect(_cacheSize()).toBe(1)
  })

  it('CNPJ vazio nao chama client', async () => {
    const fetchCNAE = vi.fn(async () => '4110700')
    const client: CNAELookupClient = { fetchCNAE }

    const result = await lookupCNAE(client, '')
    expect(result).toBe('')
    expect(fetchCNAE).not.toHaveBeenCalled()
  })

  it('multiple CNPJs sao cacheados independentemente', async () => {
    const fetchCNAE = vi.fn(async (cnpj: string) => {
      if (cnpj === 'A') return '4110700'
      if (cnpj === 'B') return '6822500'
      return null
    })
    const client: CNAELookupClient = { fetchCNAE }

    expect(await lookupCNAE(client, 'A')).toBe('4110700')
    expect(await lookupCNAE(client, 'B')).toBe('6822500')
    expect(_cacheSize()).toBe(2)
    // Segunda chamada de cada -> cache hit
    await lookupCNAE(client, 'A')
    await lookupCNAE(client, 'B')
    expect(fetchCNAE).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// SupabaseCNAELookupClient — adapter
// ---------------------------------------------------------------------------

describe('SupabaseCNAELookupClient', () => {
  it('mapeia query cnpj_enrichment -> cnae_primario', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { cnae_primario: '4110700' },
      error: null,
    }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const adapter = new SupabaseCNAELookupClient({ from } as never)

    const cnae = await adapter.fetchCNAE('12345678000100')
    expect(cnae).toBe('4110700')
    expect(from).toHaveBeenCalledWith('cnpj_enrichment')
    expect(select).toHaveBeenCalledWith('cnae_primario')
    expect(eq).toHaveBeenCalledWith('cnpj', '12345678000100')
  })

  it('CNPJ sem registro retorna null', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const adapter = new SupabaseCNAELookupClient({ from } as never)

    expect(await adapter.fetchCNAE('00000000000000')).toBeNull()
  })

  it('erro de query e propagado como Error', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: null,
      error: { message: 'connection refused' },
    }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const adapter = new SupabaseCNAELookupClient({ from } as never)

    await expect(adapter.fetchCNAE('X')).rejects.toThrow(/connection refused/)
  })
})

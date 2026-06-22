import { describe, it, expect, vi } from 'vitest'

// O hook importa o client supabase no topo do módulo; mockamos para isolar a
// função pura buildCallListItems (não exercita rede).
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { buildCallListItems } from './useFisboCallList'

function listing(over: Record<string, unknown> = {}) {
  return {
    id: 'L1',
    nome_anunciante: 'João',
    endereco: 'Rua A, 100',
    bairro: 'Moema',
    telefone_anunciante: '11999990000',
    whatsapp_anunciante: null,
    preco: 1_000_000,
    preco_m2: 10_000,
    coordinates: null,
    matched_edificio_id: 'ed-1',
    last_seen_at: '2026-06-20T00:00:00Z',
    ...over,
  } as Parameters<typeof buildCallListItems>[0][number]
}

function lead(over: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    etapa_funil: 'contato',
    contato_status: 'atendeu',
    contato_notas: 'ligou ontem',
    scraped_listing_id: 'L1',
    ...over,
  } as Parameters<typeof buildCallListItems>[1][number]
}

describe('buildCallListItems', () => {
  it('casa lead ao anúncio por scraped_listing_id e traz o status', () => {
    const [item] = buildCallListItems([listing()], [lead()])
    expect(item.leadId).toBe('lead-1')
    expect(item.contatoStatus).toBe('atendeu')
    expect(item.contatoNotas).toBe('ligou ontem')
    expect(item.etapaFunil).toBe('contato')
    expect(item.edificioId).toBe('ed-1')
  })

  it('anúncio sem lead correspondente entra como nao_contatado', () => {
    const [item] = buildCallListItems([listing({ id: 'L2' })], [lead({ scraped_listing_id: 'L1' })])
    expect(item.leadId).toBeNull()
    expect(item.contatoStatus).toBe('nao_contatado')
  })

  it('NÃO casa por telefone (PII cifrada em PROD) — só por scraped_listing_id', () => {
    // lead sem vínculo, mesmo "telefone" não importa: deve ficar nao_contatado.
    const [item] = buildCallListItems([listing()], [lead({ scraped_listing_id: null })])
    expect(item.leadId).toBeNull()
    expect(item.contatoStatus).toBe('nao_contatado')
  })

  it('marca semContato quando não há telefone nem whatsapp (AC6)', () => {
    const [item] = buildCallListItems(
      [listing({ telefone_anunciante: null, whatsapp_anunciante: null })],
      [],
    )
    expect(item.semContato).toBe(true)
  })

  it('mantém contato do anúncio (scraped_listings) no item', () => {
    const [item] = buildCallListItems(
      [listing({ telefone_anunciante: '1133334444', whatsapp_anunciante: '11988887777' })],
      [],
    )
    expect(item.telefone).toBe('1133334444')
    expect(item.whatsapp).toBe('11988887777')
    expect(item.semContato).toBe(false)
  })
})

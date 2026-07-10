import { describe, it, expect } from 'vitest'
import {
  orderCallList,
  haversineMeters,
  itemDistance,
  type CallListItem,
} from './callListOrder'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<CallListItem> = {}): CallListItem {
  return {
    listingId: overrides.listingId ?? 'l1',
    leadId: overrides.leadId ?? null,
    nome: overrides.nome ?? 'Proprietário',
    endereco: overrides.endereco ?? 'Rua A, 100',
    bairro: overrides.bairro ?? 'Moema',
    telefone: overrides.telefone ?? '11999990000',
    whatsapp: overrides.whatsapp ?? null,
    preco: overrides.preco ?? 1_000_000,
    precoM2: overrides.precoM2 ?? 10_000,
    lat: overrides.lat ?? null,
    lng: overrides.lng ?? null,
    contatoStatus: overrides.contatoStatus ?? 'nao_contatado',
    contatoNotas: overrides.contatoNotas ?? null,
    lastSeenAt: overrides.lastSeenAt ?? null,
    semContato: overrides.semContato ?? false,
  }
}

// ---------------------------------------------------------------------------
// haversine
// ---------------------------------------------------------------------------

describe('haversineMeters', () => {
  it('é zero para o mesmo ponto', () => {
    const p = { lat: -23.6, lng: -46.66 }
    expect(haversineMeters(p, p)).toBe(0)
  })

  it('aproxima ~111km por grau de latitude', () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })
})

describe('itemDistance', () => {
  it('retorna Infinity sem origin', () => {
    expect(itemDistance(makeItem({ lat: -23.6, lng: -46.6 }), null)).toBe(Infinity)
  })

  it('retorna Infinity quando o item não tem coords', () => {
    expect(itemDistance(makeItem({ lat: null, lng: null }), { lat: -23.6, lng: -46.6 })).toBe(Infinity)
  })
})

// ---------------------------------------------------------------------------
// orderCallList — priorização por status
// ---------------------------------------------------------------------------

describe('orderCallList — status', () => {
  it('coloca nao_contatado/retornar antes de agendado/descartado', () => {
    const items = [
      makeItem({ listingId: 'agendado', contatoStatus: 'agendado' }),
      makeItem({ listingId: 'descartado', contatoStatus: 'descartado' }),
      makeItem({ listingId: 'retornar', contatoStatus: 'retornar' }),
      makeItem({ listingId: 'novo', contatoStatus: 'nao_contatado' }),
    ]
    const ordered = orderCallList(items).map((i) => i.listingId)
    expect(ordered).toEqual(['novo', 'retornar', 'agendado', 'descartado'])
  })

  it('respeita a ordem completa de prioridade de status', () => {
    const items = [
      makeItem({ listingId: 'd', contatoStatus: 'descartado' }),
      makeItem({ listingId: 'g', contatoStatus: 'agendado' }),
      makeItem({ listingId: 'a', contatoStatus: 'atendeu' }),
      makeItem({ listingId: 'na', contatoStatus: 'nao_atendeu' }),
      makeItem({ listingId: 'r', contatoStatus: 'retornar' }),
      makeItem({ listingId: 'nc', contatoStatus: 'nao_contatado' }),
    ]
    const ordered = orderCallList(items).map((i) => i.listingId)
    expect(ordered).toEqual(['nc', 'r', 'na', 'a', 'g', 'd'])
  })
})

// ---------------------------------------------------------------------------
// orderCallList — desempate por recência (sem origin)
// ---------------------------------------------------------------------------

describe('orderCallList — recência (sem origin)', () => {
  it('ordena mesmo status por last_seen_at desc', () => {
    const items = [
      makeItem({ listingId: 'antigo', lastSeenAt: '2026-06-01T00:00:00Z' }),
      makeItem({ listingId: 'novo', lastSeenAt: '2026-06-20T00:00:00Z' }),
      makeItem({ listingId: 'medio', lastSeenAt: '2026-06-10T00:00:00Z' }),
    ]
    const ordered = orderCallList(items).map((i) => i.listingId)
    expect(ordered).toEqual(['novo', 'medio', 'antigo'])
  })

  it('itens sem last_seen_at vão para o fim do grupo', () => {
    const items = [
      makeItem({ listingId: 'sem-data', lastSeenAt: null }),
      makeItem({ listingId: 'com-data', lastSeenAt: '2026-06-10T00:00:00Z' }),
    ]
    const ordered = orderCallList(items).map((i) => i.listingId)
    expect(ordered).toEqual(['com-data', 'sem-data'])
  })
})

// ---------------------------------------------------------------------------
// orderCallList — proximidade (com origin)
// ---------------------------------------------------------------------------

describe('orderCallList — proximidade (com origin)', () => {
  const origin = { lat: -23.6, lng: -46.66 } // ~Moema

  it('ordena mesmo status por proximidade quando origin é fornecido', () => {
    const items = [
      makeItem({ listingId: 'longe', lat: -23.7, lng: -46.76 }),
      makeItem({ listingId: 'perto', lat: -23.601, lng: -46.661 }),
      makeItem({ listingId: 'medio', lat: -23.62, lng: -46.68 }),
    ]
    const ordered = orderCallList(items, { origin }).map((i) => i.listingId)
    expect(ordered).toEqual(['perto', 'medio', 'longe'])
  })

  it('itens sem coords caem para o fim do grupo (distância Infinity → recência)', () => {
    const items = [
      makeItem({ listingId: 'sem-coords', lat: null, lng: null, lastSeenAt: '2026-06-20T00:00:00Z' }),
      makeItem({ listingId: 'com-coords', lat: -23.601, lng: -46.661, lastSeenAt: '2026-06-01T00:00:00Z' }),
    ]
    const ordered = orderCallList(items, { origin }).map((i) => i.listingId)
    expect(ordered).toEqual(['com-coords', 'sem-coords'])
  })

  it('status ainda tem precedência sobre proximidade', () => {
    const items = [
      makeItem({ listingId: 'perto-agendado', lat: -23.601, lng: -46.661, contatoStatus: 'agendado' }),
      makeItem({ listingId: 'longe-novo', lat: -23.8, lng: -46.9, contatoStatus: 'nao_contatado' }),
    ]
    const ordered = orderCallList(items, { origin }).map((i) => i.listingId)
    expect(ordered).toEqual(['longe-novo', 'perto-agendado'])
  })
})

// ---------------------------------------------------------------------------
// orderCallList — robustez
// ---------------------------------------------------------------------------

describe('orderCallList — robustez', () => {
  it('não muta o array de entrada', () => {
    const items = [
      makeItem({ listingId: 'b', contatoStatus: 'agendado' }),
      makeItem({ listingId: 'a', contatoStatus: 'nao_contatado' }),
    ]
    const snapshot = items.map((i) => i.listingId)
    orderCallList(items)
    expect(items.map((i) => i.listingId)).toEqual(snapshot)
  })

  it('lida com lista vazia', () => {
    expect(orderCallList([])).toEqual([])
  })

  it('mix realista: sem coords, sem contato e status variados', () => {
    const items = [
      makeItem({ listingId: 'descartado-sem-contato', contatoStatus: 'descartado', telefone: null, whatsapp: null, semContato: true }),
      makeItem({ listingId: 'novo-sem-coords', contatoStatus: 'nao_contatado', lat: null, lng: null, lastSeenAt: '2026-06-15T00:00:00Z' }),
      makeItem({ listingId: 'retornar', contatoStatus: 'retornar', lat: -23.601, lng: -46.661 }),
    ]
    const ordered = orderCallList(items, { origin: { lat: -23.6, lng: -46.66 } }).map((i) => i.listingId)
    expect(ordered).toEqual(['novo-sem-coords', 'retornar', 'descartado-sem-contato'])
  })
})

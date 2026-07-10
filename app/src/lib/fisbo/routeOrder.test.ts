import { describe, it, expect } from 'vitest'
import { buildVisitRoute, groupByBairro } from './routeOrder'
import type { CallListItem } from './callListOrder'

function makeItem(overrides: Partial<CallListItem> = {}): CallListItem {
  return {
    listingId: 'l1',
    leadId: null,
    nome: 'Proprietário',
    endereco: 'Rua A, 100',
    bairro: 'Moema',
    telefone: '11999990000',
    whatsapp: null,
    preco: 1_000_000,
    precoM2: 10_000,
    lat: null,
    lng: null,
    contatoStatus: 'agendado',
    contatoNotas: null,
    lastSeenAt: null,
    semContato: false,
    ...overrides,
  }
}

const ORIGIN = { lat: -23.6, lng: -46.66 } // ~Moema

describe('buildVisitRoute — proximidade (com origin)', () => {
  it('ordena por distância asc e numera 1..n', () => {
    const items = [
      makeItem({ listingId: 'longe', lat: -23.7, lng: -46.76 }),
      makeItem({ listingId: 'perto', lat: -23.601, lng: -46.661 }),
      makeItem({ listingId: 'medio', lat: -23.62, lng: -46.68 }),
    ]
    const route = buildVisitRoute(items, ORIGIN)
    expect(route.hasOrigin).toBe(true)
    expect(route.ordered.map((s) => s.listingId)).toEqual(['perto', 'medio', 'longe'])
    expect(route.ordered.map((s) => s.numero)).toEqual([1, 2, 3])
    expect(route.ordered[0].distanciaM).toBeGreaterThanOrEqual(0)
    expect(route.ordered[0].distanciaM!).toBeLessThan(route.ordered[2].distanciaM!)
  })

  it('empate de distância é estável por listingId', () => {
    const items = [
      makeItem({ listingId: 'b', lat: -23.61, lng: -46.67 }),
      makeItem({ listingId: 'a', lat: -23.61, lng: -46.67 }),
    ]
    const route = buildVisitRoute(items, ORIGIN)
    expect(route.ordered.map((s) => s.listingId)).toEqual(['a', 'b'])
  })
})

describe('buildVisitRoute — sem coordenada (AC6)', () => {
  it('manda alvos sem coord para semCoord, numerados após os ordered', () => {
    const items = [
      makeItem({ listingId: 'com', lat: -23.601, lng: -46.661 }),
      makeItem({ listingId: 'sem', lat: null, lng: null }),
    ]
    const route = buildVisitRoute(items, ORIGIN)
    expect(route.ordered.map((s) => s.listingId)).toEqual(['com'])
    expect(route.semCoord.map((s) => s.listingId)).toEqual(['sem'])
    expect(route.ordered[0].numero).toBe(1)
    expect(route.semCoord[0].numero).toBe(2)
    expect(route.semCoord[0].distanciaM).toBeNull()
  })
})

describe('buildVisitRoute — ponto de partida ausente (AC6)', () => {
  it('sem origin ordena por bairro e distância fica null', () => {
    const items = [
      makeItem({ listingId: 'vm', bairro: 'Vila Mariana', lat: -23.6, lng: -46.63 }),
      makeItem({ listingId: 'moema', bairro: 'Moema', lat: -23.6, lng: -46.66 }),
    ]
    const route = buildVisitRoute(items, null)
    expect(route.hasOrigin).toBe(false)
    expect(route.ordered.map((s) => s.bairro)).toEqual(['Moema', 'Vila Mariana'])
    expect(route.ordered.every((s) => s.distanciaM === null)).toBe(true)
  })
})

describe('buildVisitRoute — robustez', () => {
  it('lista vazia', () => {
    const route = buildVisitRoute([], ORIGIN)
    expect(route.ordered).toEqual([])
    expect(route.semCoord).toEqual([])
  })

  it('não muta a entrada', () => {
    const items = [
      makeItem({ listingId: 'b', lat: -23.7, lng: -46.7 }),
      makeItem({ listingId: 'a', lat: -23.601, lng: -46.661 }),
    ]
    const snap = items.map((i) => i.listingId)
    buildVisitRoute(items, ORIGIN)
    expect(items.map((i) => i.listingId)).toEqual(snap)
  })
})

describe('groupByBairro', () => {
  it('agrupa preservando ordem e joga "Sem bairro" para o fim', () => {
    const route = buildVisitRoute(
      [
        makeItem({ listingId: 'm1', bairro: 'Moema', lat: -23.601, lng: -46.661 }),
        makeItem({ listingId: 'sem', bairro: null, lat: -23.602, lng: -46.662 }),
        makeItem({ listingId: 'm2', bairro: 'Moema', lat: -23.603, lng: -46.663 }),
        makeItem({ listingId: 'vm', bairro: 'Vila Mariana', lat: -23.604, lng: -46.664 }),
      ],
      ORIGIN,
    )
    const groups = groupByBairro([...route.ordered, ...route.semCoord])
    const labels = groups.map((g) => g.bairro)
    expect(labels[labels.length - 1]).toBe('Sem bairro')
    expect(labels).toContain('Moema')
    expect(labels).toContain('Vila Mariana')
    const moema = groups.find((g) => g.bairro === 'Moema')!
    expect(moema.stops.map((s) => s.listingId)).toEqual(['m1', 'm2'])
  })

  it('lista vazia', () => {
    expect(groupByBairro([])).toEqual([])
  })
})

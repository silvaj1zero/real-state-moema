import { describe, it, expect } from 'vitest'
import { selectMostSimilar } from './similar'
import type { AcmComparable, AcmTarget } from './methodology'

const target: AcmTarget = { areaConstruida: 113, areaTerreno: 0 }

const comps: AcmComparable[] = [
  { endereco: 'Cardoso de Melo 155', areaConstruida: 111, preco: 1_400_000, distancia: 249 },
  { endereco: 'Vahia de Abreu 115', areaConstruida: 119, preco: 1_030_000, distancia: 223 },
  { endereco: 'Cardoso de Melo 95', areaConstruida: 116, preco: 1_367_136, distancia: 244 },
  { endereco: 'Casa grande', areaConstruida: 460, preco: 6_500_000, distancia: 800 }, // distante em área
  { endereco: 'Longe', areaConstruida: 115, preco: 1_200_000, distancia: 1400 }, // área boa, longe
  { endereco: 'Invalido', areaConstruida: 0, preco: 0, distancia: 10 }, // descartado
]

describe('selectMostSimilar', () => {
  it('ranqueia por aderência (área próxima de 113 + perto) e descarta inválidos', () => {
    const r = selectMostSimilar(target, comps, 3, 1500)
    expect(r.totalConsiderados).toBe(5) // o inválido (área 0) saiu
    // os 3 primeiros são apartamentos ~113m² próximos, não a casa de 460m² nem o de 1400m
    expect(r.top.map((t) => t.endereco)).not.toContain('Casa grande')
    expect(r.top[0].areaConstruida).toBeGreaterThanOrEqual(111)
    expect(r.top[0].areaConstruida).toBeLessThanOrEqual(119)
  })

  it('calcula R$/m², mediana e valor indicativo (mediana × área do alvo)', () => {
    const r = selectMostSimilar(target, comps, 3, 1500)
    expect(r.top[0].precoM2).toBeCloseTo(r.top[0].preco / r.top[0].areaConstruida, 0)
    expect(r.valorIndicativo).toBe(Math.round(r.medianaPrecoM2 * 113))
  })

  it('topN maior que a amostra não quebra', () => {
    const r = selectMostSimilar(target, comps, 100, 1500)
    expect(r.top.length).toBe(5)
  })

  it('lista vazia → zeros', () => {
    const r = selectMostSimilar(target, [], 10)
    expect(r.top).toEqual([])
    expect(r.valorIndicativo).toBe(0)
  })
})

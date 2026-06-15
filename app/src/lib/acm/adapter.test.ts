import { describe, it, expect } from 'vitest'
import { toAcmComparable, toAcmComparables, type AcmRpcRow } from './adapter'

describe('toAcmComparable', () => {
  it('schema atual: usa area_m2 como área construída', () => {
    const row: AcmRpcRow = {
      endereco: 'R. Canadá, 111',
      area_m2: 507,
      preco: 9_260_000,
      distancia_m: 716,
      is_venda_real: true,
    }
    const c = toAcmComparable(row)
    expect(c.areaConstruida).toBe(507)
    expect(c.areaTerreno).toBeNull()
    expect(c.distancia).toBe(716)
    expect(c.isVendaReal).toBe(true)
  })

  it('pós-8.1: prefere area_construida_m2 e mapeia area_terreno_m2', () => {
    const row: AcmRpcRow = {
      endereco: 'R. Maestro Chiaffarelli, 86',
      area_m2: 466,
      area_construida_m2: 466,
      area_terreno_m2: 1058,
      preco: 6_500_000,
      distancia_m: 166,
      preco_pedido: 7_000_000,
      is_venda_real: true,
    }
    const c = toAcmComparable(row)
    expect(c.areaConstruida).toBe(466)
    expect(c.areaTerreno).toBe(1058)
    expect(c.precoPedido).toBe(7_000_000)
  })

  it('campos ausentes → defaults seguros', () => {
    const c = toAcmComparable({ endereco: 'X', preco: 100 })
    expect(c.areaConstruida).toBe(0)
    expect(c.areaTerreno).toBeNull()
    expect(c.isVendaReal).toBe(false)
  })

  it('toAcmComparables mapeia lista', () => {
    const rows: AcmRpcRow[] = [
      { endereco: 'A', area_m2: 100, preco: 1 },
      { endereco: 'B', area_m2: 200, preco: 2 },
    ]
    expect(toAcmComparables(rows).map((c) => c.endereco)).toEqual(['A', 'B'])
  })
})

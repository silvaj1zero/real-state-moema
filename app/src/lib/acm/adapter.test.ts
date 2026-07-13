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

describe('toAcmComparable — Story 9.4 (campos do sink/backfill)', () => {
  const baseItbi: AcmRpcRow = {
    endereco: 'R Teste 45',
    area_m2: 100,
    area_construida_m2: 100,
    area_terreno_m2: 1934,
    preco: 1_500_000,
    distancia_m: 120,
    is_venda_real: true,
    data_venda: '2024-02-15',
    bairro_real: 'Moema',
    sql_cadastral: '4116700320',
    uso_iptu: 'APARTAMENTO EM CONDOMÍNIO (EXIGE FRAÇÃO IDEAL)',
    padrao_iptu: 'RESIDENCIAL VERTICAL',
    complemento: 'AP 82',
  }

  it('venda real: deriva competência YYYY-MM e marca dataVendaConfirmada', () => {
    const c = toAcmComparable(baseItbi)
    expect(c.dataVenda).toBe('2024-02')
    expect(c.dataVendaConfirmada).toBe(true)
    expect(c.bairroReal).toBe('Moema')
    expect(c.sqlCadastral).toBe('4116700320')
    expect(c.usoIptu).toContain('APARTAMENTO EM CONDOMÍNIO')
    expect(c.padraoIptu).toBe('RESIDENCIAL VERTICAL')
    expect(c.complemento).toBe('AP 82')
  })

  it('anúncio (is_venda_real=false): dataVenda null — segue em semAjuste (9.11)', () => {
    const c = toAcmComparable({ ...baseItbi, is_venda_real: false })
    expect(c.dataVenda).toBeNull()
    expect(c.dataVendaConfirmada).toBeUndefined()
  })

  it('linha legada sem colunas 9.4: campos opt-in ficam null (zero quebra)', () => {
    const c = toAcmComparable({ endereco: 'R Legada 1', area_m2: 80, preco: 900_000 })
    expect(c.dataVenda).toBeNull()
    expect(c.usoIptu).toBeNull()
    expect(c.complemento).toBeNull()
    expect(c.sqlCadastral).toBeNull()
    expect(c.bairroReal).toBeNull()
  })

  it('padrao_iptu numérico legado vira string (coluna era SMALLINT antes da 20260711000001)', () => {
    const c = toAcmComparable({ ...baseItbi, padrao_iptu: 3 })
    expect(c.padraoIptu).toBe('3')
  })
})

import { describe, it, expect } from 'vitest'
import { buildComparaveisCsv } from './AcmExportMenu'
import type { ComparavelNoRaio } from '@/lib/supabase/types'

function makeRow(over: Partial<ComparavelNoRaio> = {}): ComparavelNoRaio {
  return {
    comparavel_id: 'c1',
    // sem vírgula no endereço: a quote do CSV protege vírgulas, mas o
    // split(',') ingênuo do teste de contagem de colunas não.
    endereco: 'Rua dos Chanés 100',
    area_m2: 80,
    preco: 800000,
    preco_m2: 10000,
    is_venda_real: false,
    fonte: 'manual',
    distancia_m: 200,
    ...over,
  }
}

describe('buildComparaveisCsv — Story 8.1 (AC7)', () => {
  it('preserva o cabeçalho original nas 7 primeiras colunas', () => {
    const csv = buildComparaveisCsv([makeRow()])
    const header = csv.split('\n')[0].split(',')
    expect(header.slice(0, 7)).toEqual([
      'Endereço', 'Área m²', 'Preço', 'Preço/m²', 'Tipo', 'Fonte', 'Distância (m)',
    ])
  })

  it('anexa as colunas da metodologia ao final do cabeçalho', () => {
    const csv = buildComparaveisCsv([makeRow()])
    const header = csv.split('\n')[0]
    for (const col of [
      'Área constr. m²', 'Área terreno m²', 'R$/m² terreno',
      'Dorms', 'Suítes', 'Vagas', 'Score', 'SQL cadastral', 'Ano ref.',
      'Preço pedido', 'Deságio %', 'Status anúncio',
    ]) {
      expect(header).toContain(col)
    }
  })

  it('campos novos presentes aparecem na linha', () => {
    const csv = buildComparaveisCsv([
      makeRow({
        area_construida_m2: 80,
        area_terreno_m2: 250,
        preco_m2_terreno: 3200,
        dormitorios: 3,
        suites: 1,
        vagas: 2,
        score: 'A',
        sql_cadastral: '123.456.0001-2',
        ano_referencia: 2025,
        preco_pedido: 880000,
        desagio_percent: -9.09,
        status_anuncio: 'confirmado',
      }),
    ])
    const row = csv.split('\n')[1]
    expect(row).toContain('250.00') // area_terreno
    expect(row).toContain('"123.456.0001-2"') // sql cadastral entre aspas
    expect(row).toContain('confirmado')
    expect(row).toContain('2025')
  })

  it('campos novos ausentes -> células vazias (sem quebrar a contagem de colunas)', () => {
    const csv = buildComparaveisCsv([makeRow()])
    const lines = csv.split('\n')
    const headerCols = lines[0].split(',').length
    const rowCols = lines[1].split(',').length
    expect(rowCols).toBe(headerCols) // mesma largura
    // As 7 primeiras células têm dado; as novas ficam vazias quando ausentes.
    const cells = lines[1].split(',')
    expect(cells[6]).toBe('200.0') // distancia_m (última original) preenchida
    expect(cells[7]).toBe('') // area_construida_m2 ausente -> vazio
    expect(cells[8]).toBe('') // area_terreno_m2 ausente -> vazio
  })

  it('linha vazia quando não há comparáveis (só cabeçalho)', () => {
    const csv = buildComparaveisCsv([])
    expect(csv.split('\n')).toHaveLength(1) // só header
  })
})

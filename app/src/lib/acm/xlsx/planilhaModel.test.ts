import { describe, it, expect } from 'vitest'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import type { AcmLaudoComputation } from '@/lib/acm/methodology'
import { buildPlanilhaModel } from './planilhaModel'
import { buildPlanilhaWorkbook } from './buildPlanilhaWorkbook'

function comp(endereco: string, over: Partial<ComparavelNoRaio> = {}): ComparavelNoRaio {
  return {
    comparavel_id: endereco,
    endereco,
    area_m2: 400,
    preco: 5_000_000,
    preco_m2: 12_500,
    is_venda_real: true,
    fonte: 'itbi' as ComparavelNoRaio['fonte'],
    distancia_m: 200,
    ...over,
  }
}

const ENDS = ['A', 'B', 'C', 'D', 'E', 'F']
const ranking = ENDS.map((endereco, i) => ({
  endereco,
  indice: 0.9 - i * 0.1,
  simAreaConstruida: 0,
  simAreaTerreno: 0,
  proximidade: 0,
}))
const computation = {
  target: { areaConstruida: 100, areaTerreno: 0 },
  totalComparaveis: 6,
  medianaPrecoM2: 12_500,
  scoreAlvo: null,
  valorMercado: 0,
  valorFechamento: 0,
  faixaFechamento: { min: 0, max: 0 },
  ranking,
  top5: ranking.slice(0, 5),
  top3: ranking.slice(0, 3),
  efeitoEscalaTerreno: [],
  coAncoraTerreno: null,
  sensibilidade: [],
  desagioMedidoPercent: null,
} as unknown as AcmLaudoComputation

const comparaveis = [
  comp('A', { area_construida_m2: 466, sql_cadastral: '1407200046', anuncio_url: 'https://portal/x' }),
  comp('B'), // tudo NULL na metodologia (graceful)
  comp('C'), comp('D'), comp('E'), comp('F'),
]

describe('buildPlanilhaModel — abas canônicas', () => {
  it('casa: 7 abas na ordem canônica', () => {
    const m = buildPlanilhaModel(computation, comparaveis, { enderecoAlvo: 'R. Alvo', propertyType: 'casa' })
    expect(m.sheets.map((s) => s.nome)).toEqual([
      'Leia-me', 'Top 3', 'Top 5', 'Top 10', 'Todos', 'Ofertas ativas', 'Terrenos',
    ])
  })

  it('apartamento: omite a aba Terrenos (6 abas)', () => {
    const m = buildPlanilhaModel(computation, comparaveis, { enderecoAlvo: 'R. Alvo', propertyType: 'apartamento' })
    expect(m.sheets.map((s) => s.nome)).not.toContain('Terrenos')
    expect(m.sheets).toHaveLength(6)
  })

  it('Top 3 traz 3 linhas com ranks 1..3 e o endereço na ordem do ranking', () => {
    const m = buildPlanilhaModel(computation, comparaveis, { enderecoAlvo: 'R. Alvo' })
    const top3 = m.sheets.find((s) => s.nome === 'Top 3')!
    expect(top3.rows).toHaveLength(3)
    expect(top3.rows.map((r) => r[0])).toEqual([1, 2, 3])
    expect(top3.rows[0][2]).toBe('A')
    expect(top3.tierHighlight).toBe(true)
    expect(top3.linkCol).toBe(16)
  })

  it('graceful: campos NULL viram célula vazia (nunca "nan")', () => {
    const m = buildPlanilhaModel(computation, comparaveis, { enderecoAlvo: 'R. Alvo' })
    const todos = m.sheets.find((s) => s.nome === 'Todos')!
    const rowA = todos.rows.find((r) => r[2] === 'A')!
    const rowB = todos.rows.find((r) => r[2] === 'B')!
    expect(rowA[8]).toBe(466) // área construída preenchida
    expect(rowA[16]).toBe('https://portal/x') // link
    expect(rowB[8]).toBe('') // área construída NULL → vazio
    expect(rowB[16]).toBe('') // sem link
  })

  it('Ofertas/Terrenos sem dado → emptyNote', () => {
    const m = buildPlanilhaModel(computation, comparaveis, { enderecoAlvo: 'R. Alvo', propertyType: 'casa' })
    expect(m.sheets.find((s) => s.nome === 'Ofertas ativas')!.rows).toHaveLength(0)
    expect(m.sheets.find((s) => s.nome === 'Ofertas ativas')!.emptyNote).toBeTruthy()
    expect(m.sheets.find((s) => s.nome === 'Terrenos')!.emptyNote).toBeTruthy()
  })
})

describe('buildPlanilhaWorkbook — smoke (exceljs)', () => {
  it('gera um buffer .xlsx válido (assinatura ZIP "PK")', async () => {
    const m = buildPlanilhaModel(computation, comparaveis, { enderecoAlvo: 'R. Alvo', propertyType: 'casa', geradoEm: '17/06/2026' })
    const buf = await buildPlanilhaWorkbook(m)
    const bytes = new Uint8Array(buf)
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(bytes[0]).toBe(0x50) // 'P'
    expect(bytes[1]).toBe(0x4b) // 'K'
  })

  it('não quebra com comparáveis vazios', async () => {
    const empty = { ...computation, ranking: [], top3: [], top5: [] } as unknown as AcmLaudoComputation
    const m = buildPlanilhaModel(empty, [], { enderecoAlvo: 'R. Alvo' })
    const buf = await buildPlanilhaWorkbook(m)
    expect(new Uint8Array(buf)[0]).toBe(0x50)
  })
})

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseConfere,
  parseCorretorXlsx,
  mergeBackDataset,
  mergeBackFromXlsx,
  type CorretorRowMark,
} from './mergeBack'
import type { AcmDataset } from '@/lib/acm/dataset'

function workbookBuffer(
  headers: string[],
  rows: (string | number)[][],
  sheetName = 'Todos (3)',
): Buffer {
  const aoa = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const HEADER = [
  'Rank',
  'Endereço',
  'SQL cadastral (GeoSampa)',
  'Tipologia (casa/sobrado?)',
  'Confere? (✓/✗/?)',
  'Correção',
  'Observação do corretor',
]

const miniDs: AcmDataset = {
  target: { endereco: 'Rua Alvo 1', areaConstruida: 100, areaTerreno: 200 },
  comparaveis: [
    {
      endereco: 'CASA-OK',
      areaConstruida: 100,
      preco: 1_000_000,
      sqlCadastral: '111',
      tipologia: 'casa',
    },
    {
      endereco: 'CASA-EXCLUIR',
      areaConstruida: 110,
      preco: 1_100_000,
      sqlCadastral: '222',
      tipologia: 'casa',
    },
    {
      endereco: 'CASA-CORRIGIR',
      areaConstruida: 90,
      preco: 900_000,
      sqlCadastral: '333',
      tipologia: 'casa (provavel)',
    },
  ],
}

describe('parseConfere', () => {
  it('normaliza marcas do corretor', () => {
    expect(parseConfere('✓')).toBe('ok')
    expect(parseConfere('sim')).toBe('ok')
    expect(parseConfere('✗')).toBe('nao')
    expect(parseConfere('nao')).toBe('nao')
    expect(parseConfere('?')).toBe('duvida')
    expect(parseConfere('')).toBe('vazio')
  })
})

describe('parseCorretorXlsx + mergeBack', () => {
  it('exclui confere=nao e aplica tipologia + correcao', () => {
    const buf = workbookBuffer(HEADER, [
      [1, 'CASA-OK', '111', '', '✓', '', 'ok'],
      [2, 'CASA-EXCLUIR', '222', '', '✗', '', 'predio'],
      [3, 'CASA-CORRIGIR', '333', 'apartamento', '?', 'area=120', 'confirmar'],
    ])
    const marks = parseCorretorXlsx(buf)
    expect(marks).toHaveLength(3)

    const { dataset, report } = mergeBackDataset(miniDs, marks)
    expect(report.nExcluidos).toBe(1)
    expect(report.excluidos).toContain('CASA-EXCLUIR')
    expect(dataset.comparaveis.map((c) => c.endereco)).toEqual(['CASA-OK', 'CASA-CORRIGIR'])
    const corr = dataset.comparaveis.find((c) => c.endereco === 'CASA-CORRIGIR')!
    expect(corr.tipologia).toBe('apartamento')
    expect(corr.areaConstruida).toBe(120)
    expect(report.nTipologiaAtualizada).toBeGreaterThanOrEqual(1)
  })

  it('mergeBackFromXlsx pipeline', () => {
    const buf = workbookBuffer(HEADER, [
      [1, 'CASA-OK', '111', '', 'ok', '', ''],
      [2, 'CASA-EXCLUIR', '222', '', 'x', 'excluir=sim', ''],
      [3, 'CASA-CORRIGIR', '333', '', '', 'preco=950000', ''],
    ])
    const r = mergeBackFromXlsx(miniDs, buf)
    expect(r.dataset.comparaveis).toHaveLength(2)
    const corr = r.dataset.comparaveis.find((c) => c.endereco === 'CASA-CORRIGIR')!
    expect(corr.preco).toBe(950000)
  })

  it('sem marcacoes: dataset intacto', () => {
    const marks: CorretorRowMark[] = []
    const { dataset, report } = mergeBackDataset(miniDs, marks)
    expect(dataset.comparaveis).toHaveLength(3)
    expect(report.nExcluidos).toBe(0)
  })

  it('le aba Todos de planilha real 132 (colunas vazias = sem exclusao)', () => {
    // Smoke: se o arquivo existir no monorepo, parse nao explode.
    // Nao exige marcacoes preenchidas (planilha gerada pode estar em branco).
    const marks = parseCorretorXlsx(
      workbookBuffer(HEADER, [[1, 'R JURUENA 87', '4117200100', '', '', '', '']], 'Todos (56)'),
    )
    expect(marks[0].endereco).toBe('R JURUENA 87')
    expect(marks[0].confere).toBe('vazio')
  })
})

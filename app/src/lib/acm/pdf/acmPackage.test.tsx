import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import type { LaudoInput, LaudoSourceComparable } from './laudoModel'
import { buildAcmPackage } from './acmPackage'

const SOURCE: LaudoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c, i) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: 'ITBImap',
  codigoRef: `PMSP-${String(i).padStart(4, '0')}`,
  sqlCadastral: `140720${String(i).padStart(4, '0')}`,
  statusAnuncio: 'off-market',
  fonteAnuncio: 'ITBImap (consulta SQL)',
  isVendaReal: c.isVendaReal,
}))

const INPUT: LaudoInput = {
  enderecoAlvo: 'Rua Honduras',
  bairro: 'Jardim América',
  proprietario: 'Clarisia Ramos',
  areaConstruida: 800,
  areaTerreno: 1000,
  programa: { dormitorios: 4, suites: 2, vagas: 10 },
  precoPretendido: 12_000_000,
  precoPedidoReal: 10_500_000,
  precoAnuncioRecomendado: 11_500_000,
  metaFechamento: { min: 10_000_000, max: 10_500_000 },
  dataEmissao: '09/06/2026',
  residualParams: HONDURAS_RESIDUAL,
}

describe('buildAcmPackage — pacote completo (Story 8.6)', () => {
  it('monta os 4 entregáveis a partir de UM computeLaudo (AC2)', () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const itens = buildAcmPackage(computation, SOURCE, INPUT)
    expect(itens.map((i) => i.kind)).toEqual(['resumo', 'laudo', 'deck', 'didatico'])
    expect(itens.map((i) => i.filenamePrefix)).toEqual([
      'acm-resumo',
      'acm-laudo',
      'acm-deck',
      'acm-didatico',
    ])
  })

  it('os 4 documentos renderizam %PDF- (AC6)', async () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const itens = buildAcmPackage(computation, SOURCE, INPUT)
    for (const item of itens) {
      const buf = await renderToBuffer(item.doc)
      expect(buf.subarray(0, 5).toString(), `${item.kind} deve ser PDF`).toBe('%PDF-')
    }
  }, 45_000)

  it('robustez: n=2/NULL/sem residual ainda monta e renderiza os 4', async () => {
    const pequeno = HONDURAS_COMPARAVEIS.slice(0, 2).map((c) => ({
      ...c,
      areaTerreno: null,
      distancia: null,
      precoPedido: null,
    }))
    const computation = computeLaudo({ target: HONDURAS_TARGET, comparaveis: pequeno })
    const src: LaudoSourceComparable[] = pequeno.map((c) => ({
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: null,
      preco: c.preco,
    }))
    const itens = buildAcmPackage(computation, src, {
      enderecoAlvo: 'Rua Teste',
      areaConstruida: 300,
      areaTerreno: 400,
      dataEmissao: '01/01/2026',
    })
    expect(itens).toHaveLength(4)
    for (const item of itens) {
      const buf = await renderToBuffer(item.doc)
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    }
  }, 45_000)
})

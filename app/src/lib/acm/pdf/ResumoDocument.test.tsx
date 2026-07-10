import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import { buildResumoModel, type ResumoSourceComparable, type ResumoInput } from './resumoModel'
import { ResumoDocument } from './ResumoDocument'

const SOURCE: ResumoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: 'ITBImap',
  fonteRef: 'consulta SQL',
}))

describe('ResumoDocument — render (AC1/AC8)', () => {
  it('renderiza o caso Honduras completo sem lançar (PDF não vazio)', async () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const input: ResumoInput = {
      enderecoAlvo: 'Rua Honduras',
      bairro: 'Jardim América',
      areaConstruida: 800,
      areaTerreno: 1000,
      programa: { dormitorios: 4, suites: 2, vagas: 10 },
      classeNota: '(retrofit)',
      precoPretendido: 12_000_000,
      precoPedidoReal: 10_500_000,
      precoAnuncioRecomendado: 11_500_000,
      metaFechamento: { min: 10_000_000, max: 10_500_000 },
      dataEmissao: '09/06/2026',
    }
    const model = buildResumoModel(computation, SOURCE, input)
    const buf = await renderToBuffer(<ResumoDocument model={model} />)
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-') // assinatura PDF
  }, 30_000)

  it('renderiza amostra pequena (n=2) com campos NULL e sem mapa sem lançar', async () => {
    const comparaveisPequeno = HONDURAS_COMPARAVEIS.slice(0, 2).map((c) => ({
      ...c,
      areaTerreno: null,
      distancia: null,
      precoPedido: null,
    }))
    const computation = computeLaudo({ target: HONDURAS_TARGET, comparaveis: comparaveisPequeno })
    const sourcePequeno: ResumoSourceComparable[] = comparaveisPequeno.map((c) => ({
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: null,
      preco: c.preco,
    }))
    const model = buildResumoModel(computation, sourcePequeno, {
      enderecoAlvo: 'Rua Teste',
      areaConstruida: 300,
      areaTerreno: 400,
      dataEmissao: '01/01/2026',
    })
    const buf = await renderToBuffer(<ResumoDocument model={model} />)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)
})

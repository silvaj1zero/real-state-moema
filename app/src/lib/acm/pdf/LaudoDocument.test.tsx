import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import { buildLaudoModel, type LaudoSourceComparable, type LaudoInput } from './laudoModel'
import { LaudoDocument } from './LaudoDocument'

const SOURCE: LaudoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c, i) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: 'ITBImap',
  codigoRef: `PMSP-${String(i).padStart(4, '0')}`,
  bairro: 'Jardim América',
  suites: 3,
  vagas: 4,
  dormitorios: 4,
  sqlCadastral: `140720${String(i).padStart(4, '0')}`,
  statusAnuncio: 'off-market',
  fonteAnuncio: 'ITBImap (consulta SQL)',
  isVendaReal: c.isVendaReal,
}))

describe('LaudoDocument — render (AC1/AC7)', () => {
  it('renderiza o caso Honduras completo (~18 págs) sem lançar', async () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const input: LaudoInput = {
      enderecoAlvo: 'Rua Honduras',
      bairro: 'Jardim América',
      proprietario: 'Clarisia Ramos',
      areaConstruida: 800,
      areaTerreno: 1000,
      programa: { dormitorios: 4, suites: 2, vagas: 10 },
      classeTexto: 'Necessita Ajustes / Retrofit Leve',
      precoPretendido: 12_000_000,
      precoPedidoReal: 10_500_000,
      precoAnuncioRecomendado: 11_500_000,
      metaFechamento: { min: 10_000_000, max: 10_500_000 },
      dataEmissao: '09/06/2026',
      residualParams: HONDURAS_RESIDUAL,
      concorrentesDiretos: [
        { rua: 'Rua Groenlândia', area: 600, programa: '3 dorm', pedido: 8_000_000, precoM2: 13_300, leitura: 'Mesmo nº de dormitórios; reposicionamento' },
      ],
      ofertasAtivas: [
        { rua: 'Rua Argentina, 685', area: 865, pedido: 26_000_000, precoM2: 30_058, distancia: 485 },
      ],
    }
    const model = buildLaudoModel(computation, SOURCE, input)
    const buf = await renderToBuffer(<LaudoDocument model={model} />)
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)

  it('renderiza amostra pequena (n=2) com campos NULL e sem mapa/residual sem lançar', async () => {
    const comparaveisPequeno = HONDURAS_COMPARAVEIS.slice(0, 2).map((c) => ({
      ...c,
      areaTerreno: null,
      distancia: null,
      precoPedido: null,
    }))
    const computation = computeLaudo({ target: HONDURAS_TARGET, comparaveis: comparaveisPequeno })
    const sourcePequeno: LaudoSourceComparable[] = comparaveisPequeno.map((c) => ({
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: null,
      preco: c.preco,
    }))
    const model = buildLaudoModel(computation, sourcePequeno, {
      enderecoAlvo: 'Rua Teste',
      areaConstruida: 300,
      areaTerreno: 400,
      dataEmissao: '01/01/2026',
    })
    const buf = await renderToBuffer(<LaudoDocument model={model} />)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)
})

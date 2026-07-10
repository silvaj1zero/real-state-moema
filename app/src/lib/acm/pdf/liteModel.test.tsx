import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import { buildLiteModel } from './liteModel'
import { LiteDocument } from './LiteDocument'
import { buildAcmPackage, buildAcmLiteItem } from './acmPackage'
import type { LaudoSourceComparable } from './laudoModel'

const SOURCE: LaudoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c, i) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: 'ITBImap',
  codigoRef: `PMSP-${String(i).padStart(4, '0')}`,
}))

const COMPUTATION = computeLaudo({
  target: { ...HONDURAS_TARGET, precoPretendido: 12_000_000 },
  comparaveis: HONDURAS_COMPARAVEIS,
  fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
  residual: HONDURAS_RESIDUAL,
  precoPedidoReal: 10_500_000,
})

describe('buildLiteModel (Story 9.19)', () => {
  const model = buildLiteModel(COMPUTATION, SOURCE, {
    enderecoAlvo: 'Rua Honduras',
    bairro: 'Jardim América',
    areaConstruida: 800,
    areaTerreno: 1000,
    programa: { dormitorios: 4, suites: 2, vagas: 10 },
    precoPretendido: 12_000_000,
    precoPedidoReal: 10_500_000,
    dataEmissao: '09/07/2026',
  })

  it('AC6 — números = mesmo computation (zero recálculo)', () => {
    expect(model.faixaMercado).toEqual(COMPUTATION.headline.mercado)
    expect(model.referenciaMercado).toBe(COMPUTATION.headline.referencia.valorMercado)
    expect(model.top3).toHaveLength(3)
    expect(model.top3[0].endereco).toBe(COMPUTATION.top3[0].endereco)
  })

  it('AC2 — modo dono com 5 seções', () => {
    expect(model.modoDono.oQueRegistrosMostram.length).toBeGreaterThan(20)
    expect(model.modoDono.oQueSugere.length).toBeGreaterThan(10)
    expect(model.modoDono.oQueConfirmar.length).toBeGreaterThan(10)
    expect(model.modoDono.oQueRecomendamos.length).toBeGreaterThan(10)
    expect(model.modoDono.oQueNaoDizemos).toMatch(/laudo judicial|NBR|V2|vistoria/i)
  })

  it('AC1 — disclaimer NBR/judicial', () => {
    expect(model.disclaimer).toMatch(/não é laudo judicial/i)
  })

  it('inclui tese comercial (9.18)', () => {
    expect(model.tese.tese).not.toBe('indefinida')
  })

  it('avisos críticos limitados a 3', () => {
    expect(model.avisosCriticos.length).toBeLessThanOrEqual(3)
    expect(model.avisosCriticos.every((a) => a.severidade === 'critico')).toBe(true)
  })
})

describe('LiteDocument — render smoke (AC6)', () => {
  it('renderiza %PDF-', async () => {
    const model = buildLiteModel(COMPUTATION, SOURCE, {
      enderecoAlvo: 'Rua Honduras',
      areaConstruida: 800,
      areaTerreno: 1000,
      dataEmissao: '09/07/2026',
      precoPedidoReal: 10_500_000,
    })
    const buf = await renderToBuffer(<LiteDocument model={model} />)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)
})

describe('buildAcmPackage includeLite (AC1)', () => {
  it('default sem lite — 4 entregáveis (regressão 8.6)', () => {
    const itens = buildAcmPackage(COMPUTATION, SOURCE, {
      enderecoAlvo: 'Rua Honduras',
      areaConstruida: 800,
      areaTerreno: 1000,
      dataEmissao: '09/07/2026',
    })
    expect(itens.map((i) => i.kind)).toEqual(['resumo', 'laudo', 'deck', 'didatico'])
  })

  it('includeLite acrescenta kind lite', () => {
    const itens = buildAcmPackage(
      COMPUTATION,
      SOURCE,
      {
        enderecoAlvo: 'Rua Honduras',
        areaConstruida: 800,
        areaTerreno: 1000,
        dataEmissao: '09/07/2026',
        precoPedidoReal: 10_500_000,
      },
      { includeLite: true },
    )
    expect(itens.map((i) => i.kind)).toContain('lite')
    expect(itens).toHaveLength(5)
  })

  it('buildAcmLiteItem isolado', () => {
    const item = buildAcmLiteItem(COMPUTATION, SOURCE, {
      enderecoAlvo: 'Rua Honduras',
      areaConstruida: 800,
      dataEmissao: '09/07/2026',
    })
    expect(item.kind).toBe('lite')
    expect(item.filenamePrefix).toBe('acm-lite')
  })
})

describe('AC7 — alerta tipologia no Lite', () => {
  it('propaga TIPOLOGIA_MISTA para alertaTipologia', () => {
    const comparaveis = [
      {
        endereco: 'CASA',
        areaConstruida: 100,
        preco: 1_000_000,
        isVendaReal: true as const,
        usoIptu: 'RESIDÊNCIA',
      },
      {
        endereco: 'AP',
        areaConstruida: 100,
        preco: 5_000_000,
        isVendaReal: true as const,
        complemento: 'AP 82',
      },
      {
        endereco: 'CASA2',
        areaConstruida: 100,
        preco: 1_100_000,
        isVendaReal: true as const,
        usoIptu: 'RESIDÊNCIA',
      },
    ]
    const r = computeLaudo({
      target: { areaConstruida: 100, areaTerreno: 200 },
      comparaveis,
      propertyType: 'casa',
    })
    const model = buildLiteModel(r, comparaveis, {
      enderecoAlvo: 'Rua X',
      areaConstruida: 100,
      dataEmissao: '09/07/2026',
    })
    expect(model.alertaTipologia?.codigo).toBe('TIPOLOGIA_MISTA')
  })
})

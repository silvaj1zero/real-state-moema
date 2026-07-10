import { describe, it, expect } from 'vitest'
import { loadAcmDatasetFromObject, comparavelFromDataset } from './dataset'
import { runAcmValidatePipeline } from './validatePipeline'

const miniDs = {
  target: {
    endereco: 'Rua Teste, 100',
    bairro: 'Moema',
    areaConstruida: 100,
    areaTerreno: 200,
    precoPedidoReal: 900_000,
  },
  comparaveis: [
    {
      endereco: 'CASA-1',
      areaConstruida: 100,
      areaTerreno: 180,
      preco: 1_000_000,
      distancia: 100,
      isVendaReal: true,
      usoIptu: 'RESIDÊNCIA',
      tipologia: 'casa',
      tipologiaConfianca: 'guia oficial',
    },
    {
      endereco: 'CASA-2',
      areaConstruida: 110,
      preco: 1_100_000,
      distancia: 200,
      isVendaReal: true,
      usoIptu: 'RESIDÊNCIA',
      tipologia: 'casa',
    },
    {
      endereco: 'CASA-3',
      areaConstruida: 95,
      preco: 980_000,
      distancia: 150,
      isVendaReal: true,
      usoIptu: 'RESIDÊNCIA',
      tipologia: 'casa',
    },
    {
      endereco: 'CASA-4',
      areaConstruida: 105,
      preco: 1_050_000,
      distancia: 180,
      isVendaReal: true,
      usoIptu: 'RESIDÊNCIA',
      tipologia: 'casa',
    },
    {
      endereco: 'CASA-5',
      areaConstruida: 100,
      preco: 990_000,
      distancia: 220,
      isVendaReal: true,
      usoIptu: 'RESIDÊNCIA',
      tipologia: 'casa',
    },
    {
      endereco: 'AP-OUT',
      areaConstruida: 100,
      preco: 5_000_000,
      distancia: 50,
      isVendaReal: true,
      complemento: 'AP 82',
      tipologia: 'apartamento',
    },
  ],
}

describe('dataset loader', () => {
  it('mapeia tipologia heurística pelo confianca/rótulo', () => {
    const c = comparavelFromDataset({
      endereco: 'X',
      areaConstruida: 100,
      preco: 1e6,
      tipologia: 'casa (provável)',
      tipologiaConfianca: 'heurística de lote',
    })
    expect(c.tipologia?.fonte).toBe('heuristica')
  })

  it('infere propertyType casa e tese construcao por default', () => {
    const l = loadAcmDatasetFromObject(miniDs)
    expect(l.propertyType).toBe('casa')
    expect(l.tese).toBe('construcao')
    expect(l.comparaveis).toHaveLength(6)
  })
})

describe('runAcmValidatePipeline (P-1 offline)', () => {
  it('aplica R5 e exclui AP; gates presentes', () => {
    const r = runAcmValidatePipeline(miniDs, { propertyType: 'casa', tese: 'construcao' })
    expect(r.computation.r5.aplicado).toBe(true)
    expect(r.computation.excluidosTipologia.some((e) => e.endereco === 'AP-OUT')).toBe(true)
    expect(r.resumo.totalComparaveis).toBe(5)
    expect(r.gates.some((g) => g.id === 'R5' && g.ok)).toBe(true)
    expect(r.resumo.teseComercial).toMatch(/abaixo|alinhado|acima/)
  })

  it('sem propertyType: R5 inerte com aviso', () => {
    const r = runAcmValidatePipeline(miniDs, { propertyType: 'indefinido' })
    const r5 = r.gates.find((g) => g.id === 'R5')!
    expect(r5.ok).toBe(false)
    expect(r.computation.r5.aplicado).toBe(false)
  })
})

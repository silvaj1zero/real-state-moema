import { describe, it, expect } from 'vitest'
import {
  adherenceIndex,
  rankByAdherence,
  computeLaudo,
  ADHERENCE_WEIGHTS_BY_TESE,
  DEFAULT_ACM_TESE,
  type AcmComparable,
  type AcmTarget,
} from './methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('pesos por tese (Story 9.16)', () => {
  it('AC2 — constantes versionadas', () => {
    expect(ADHERENCE_WEIGHTS_BY_TESE.construcao).toEqual({
      areaConstruida: 0.7,
      areaTerreno: 0.0,
      proximidade: 0.3,
    })
    expect(ADHERENCE_WEIGHTS_BY_TESE.hibrido).toEqual({
      areaConstruida: 0.5,
      areaTerreno: 0.2,
      proximidade: 0.3,
    })
    expect(DEFAULT_ACM_TESE).toBe('hibrido')
  })

  it('AC6 — Honduras default hibrido: Top 3 inalterado', () => {
    const ranked = rankByAdherence(HONDURAS_TARGET, HONDURAS_COMPARAVEIS)
    expect(ranked.slice(0, 3).map((t) => t.endereco)).toEqual([
      'R. Maestro Chiaffarelli, 86',
      'R. Marechal Bitencourt, 101',
      'R. Cons. Torres Homem, 399',
    ])
    expect(ranked[0].tese).toBe('hibrido')
    expect(ranked[0].pesos.areaConstruida).toBe(0.5)
  })

  it('AC6 — computeLaudo Honduras: âncoras + teseAvaliacao hibrido', () => {
    const r = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    expect(r.teseAvaliacao).toBe('hibrido')
    expect(r.pesosAderencia).toEqual(ADHERENCE_WEIGHTS_BY_TESE.hibrido)
    expect(r.top3.map((t) => t.endereco)).toEqual([
      'R. Maestro Chiaffarelli, 86',
      'R. Marechal Bitencourt, 101',
      'R. Cons. Torres Homem, 399',
    ])
    // AC4 — lente de terreno não some
    expect(r.efeitoEscalaTerreno.length).toBe(3)
    expect(r.coAncoraTerreno).toBe(9_624_000)
  })

  it('AC5 — 132-like: construcao não deixa terreno-barato dominar Top 3', () => {
    // Alvo: casa 220 m² / terreno 200 m²
    const target: AcmTarget = { areaConstruida: 220, areaTerreno: 200 }
    const comparaveis: AcmComparable[] = [
      // Parecido em CONSTRUÇÃO, terreno diferente, preço alto
      {
        endereco: 'CasaConstrA',
        areaConstruida: 210,
        areaTerreno: 80,
        preco: 2_200_000,
        distancia: 200,
        isVendaReal: true,
      },
      {
        endereco: 'CasaConstrB',
        areaConstruida: 230,
        areaTerreno: 90,
        preco: 2_100_000,
        distancia: 250,
        isVendaReal: true,
      },
      {
        endereco: 'CasaConstrC',
        areaConstruida: 200,
        areaTerreno: 70,
        preco: 2_000_000,
        distancia: 300,
        isVendaReal: true,
      },
      // Parecido em TERRENO, construção bem menor, preço baixo (artefato 132)
      {
        endereco: 'TerrenoBarato1',
        areaConstruida: 90,
        areaTerreno: 195,
        preco: 1_100_000,
        distancia: 150,
        isVendaReal: true,
      },
      {
        endereco: 'TerrenoBarato2',
        areaConstruida: 100,
        areaTerreno: 205,
        preco: 1_200_000,
        distancia: 180,
        isVendaReal: true,
      },
      {
        endereco: 'TerrenoBarato3',
        areaConstruida: 85,
        areaTerreno: 210,
        preco: 1_050_000,
        distancia: 220,
        isVendaReal: true,
      },
    ]

    const topConstr = rankByAdherence(target, comparaveis, 1000, 'construcao')
      .slice(0, 3)
      .map((t) => t.endereco)
    const topTerr = rankByAdherence(target, comparaveis, 1000, 'terreno')
      .slice(0, 3)
      .map((t) => t.endereco)

    // Com tese construção, as casas de área similar dominam
    expect(topConstr.every((e) => e.startsWith('CasaConstr'))).toBe(true)
    // Com tese terreno, as "baratas de lote" sobem
    expect(topTerr.filter((e) => e.startsWith('TerrenoBarato')).length).toBeGreaterThanOrEqual(2)
  })

  it('breakdown expõe pesos da tese (AC3)', () => {
    const b = adherenceIndex(
      { areaConstruida: 100, areaTerreno: 200 },
      { endereco: 'X', areaConstruida: 100, areaTerreno: 200, preco: 1e6, distancia: 100 },
      1000,
      'construcao',
    )
    expect(b.pesos).toEqual(ADHERENCE_WEIGHTS_BY_TESE.construcao)
    expect(b.tese).toBe('construcao')
  })
})

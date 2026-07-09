import { describe, it, expect } from 'vitest'
import { classificarSubprecificacao } from './subprecificacao'
import { computeLaudo } from './methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('classificarSubprecificacao (Story 9.21)', () => {
  it('AC5 — sem anúncio → null', () => {
    const r = classificarSubprecificacao({
      precoComercial: null,
      referenciaConstrucao: 1_770_000,
    })
    expect(r.nivel).toBeNull()
    expect(r.acaoRecomendada).toBeNull()
  })

  it('AC3 — 132-like ~18% abaixo → forte + não reduzir', () => {
    // 1.495M / 1.77M ≈ −15,5%
    const r = classificarSubprecificacao({
      precoComercial: 1_495_000,
      referenciaConstrucao: 1_770_000,
      nAnuncios: 70,
      tempoExposicaoDias: 90,
    })
    expect(r.nivel).toBe('forte')
    expect(r.deltaPct!).toBeLessThan(-15)
    expect(r.acaoRecomendada).toMatch(/Não reduzir preço/i)
  })

  it('moderada entre 8% e 15%', () => {
    const r = classificarSubprecificacao({
      precoComercial: 900_000,
      referenciaConstrucao: 1_000_000, // −10%
    })
    expect(r.nivel).toBe('moderada')
  })

  it('fraca entre 5% e 8%', () => {
    const r = classificarSubprecificacao({
      precoComercial: 940_000,
      referenciaConstrucao: 1_000_000, // −6%
    })
    expect(r.nivel).toBe('fraca')
  })

  it('alinhado / acima → null', () => {
    expect(
      classificarSubprecificacao({
        precoComercial: 1_000_000,
        referenciaConstrucao: 1_000_000,
      }).nivel,
    ).toBeNull()
    expect(
      classificarSubprecificacao({
        precoComercial: 1_200_000,
        referenciaConstrucao: 1_000_000,
      }).nivel,
    ).toBeNull()
  })

  it('computeLaudo expõe subprecificacao', () => {
    const r = computeLaudo({
      target: { ...HONDURAS_TARGET, precoPretendido: 8_000_000 },
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
      precoPedidoReal: 8_000_000,
    })
    // ref Honduras ~10M+ → 8M deve estar abaixo
    expect(r.subprecificacao.nivel).not.toBeNull()
    expect(r.subprecificacao.deltaPct!).toBeLessThan(0)
  })
})

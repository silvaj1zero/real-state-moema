import { describe, it, expect } from 'vitest'
import { classificarTeseComercial, TESE_LIMIARES_DEFAULT } from './teseComercial'
import { computeLaudo } from './methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('classificarTeseComercial (Story 9.18)', () => {
  const ref = 1_000_000

  it('AC1 — acima se preço ≥ ref × 1,05', () => {
    const t = classificarTeseComercial(ref, 1_100_000, null)
    expect(t.tese).toBe('acima')
    expect(t.deltaPct).toBe(10)
    expect(t.fontePreco).toBe('anuncio')
    expect(t.label).toMatch(/Acima/i)
  })

  it('AC1 — alinhado dentro de ±5%', () => {
    const t = classificarTeseComercial(ref, 1_020_000, null)
    expect(t.tese).toBe('alinhado')
    expect(t.deltaPct).toBe(2)
  })

  it('AC1 — abaixo se preço ≤ ref × 0,95', () => {
    const t = classificarTeseComercial(ref, 900_000, null)
    expect(t.tese).toBe('abaixo')
    expect(t.deltaPct).toBe(-10)
    expect(t.frase).toMatch(/Subprecificado|não recomendo cortar|não cortar/i)
  })

  it('AC4 — 132-like: anúncio 1,495M vs ref ~1,77M → abaixo', () => {
    const t = classificarTeseComercial(1_770_000, 1_495_000, null)
    expect(t.tese).toBe('abaixo')
    expect(t.deltaPct!).toBeLessThan(-5)
  })

  it('AC5 — sem preço → indefinida, sem inventar', () => {
    const t = classificarTeseComercial(ref, null, null)
    expect(t.tese).toBe('indefinida')
    expect(t.deltaPct).toBeNull()
    expect(t.fontePreco).toBe('nenhum')
  })

  it('anúncio tem prioridade sobre pretendido', () => {
    const t = classificarTeseComercial(ref, 1_100_000, 900_000)
    expect(t.fontePreco).toBe('anuncio')
    expect(t.tese).toBe('acima')
  })

  it('limiares default documentados', () => {
    expect(TESE_LIMIARES_DEFAULT).toEqual({ acima: 0.05, abaixo: 0.05 })
  })

  it('computeLaudo expõe teseComercial (AC2)', () => {
    const r = computeLaudo({
      target: { ...HONDURAS_TARGET, precoPretendido: 12_000_000 },
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
      precoPedidoReal: 10_500_000,
    })
    expect(r.teseComercial.tese).toMatch(/acima|alinhado|abaixo/)
    expect(r.teseComercial.referencia).toBe(r.headline.referencia.valorMercado)
    expect(r.teseComercial.fontePreco).toBe('anuncio')
  })
})

import { describe, it, expect } from 'vitest'
import { computeLaudo } from './methodology'
import { simularEstrategias } from './simuladorEstrategias'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('simularEstrategias (Story 9.24)', () => {
  const base = () =>
    computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })

  it('AC1 — retorna 3 cenários com chaves canônicas', () => {
    const e = simularEstrategias(base())
    expect(e).toHaveLength(3)
    expect(e.map((x) => x.chave)).toEqual(['rapida', 'defensavel', 'agressiva'])
    for (const row of e) {
      expect(row.precoAnuncio).toBeGreaterThan(0)
      expect(row.faixaFechamento.min).toBeLessThanOrEqual(row.faixaFechamento.max)
      expect(row.racional.length).toBeGreaterThan(10)
      expect(row.prazoNota).toMatch(/sem dado de prazo/i)
    }
  })

  it('AC5 — rapida ≤ defensavel ≤ agressiva em anúncio (Honduras)', () => {
    const e = simularEstrategias(base())
    expect(e[0].precoAnuncio).toBeLessThanOrEqual(e[1].precoAnuncio)
    expect(e[1].precoAnuncio).toBeLessThanOrEqual(e[2].precoAnuncio)
  })

  it('AC2 — Art. IV: sem prazo numérico inventado', () => {
    const e = simularEstrategias(base())
    for (const row of e) {
      expect(row.prazoNota).not.toMatch(/\d+\s*dias?/i)
      expect(row.riscos.some((r) => /sem dado de prazo/i.test(r))).toBe(true)
    }
  })

  it('AC4 — subprecificado: rápida não recomenda corte', () => {
    const c = computeLaudo({
      target: { ...HONDURAS_TARGET, precoPretendido: 8_000_000 },
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
      precoPedidoReal: 8_000_000,
    })
    expect(c.teseComercial.tese).toBe('abaixo')
    const rapida = simularEstrategias(c).find((x) => x.chave === 'rapida')!
    expect(rapida.racional).toMatch(/Subprecificado|não recomendo cortar/i)
    expect(rapida.racional).not.toMatch(/cortar o preço|reduzir o anúncio/i)
  })

  it('defensável ancora no headline.referencia', () => {
    const c = base()
    const def = simularEstrategias(c).find((x) => x.chave === 'defensavel')!
    expect(def.precoAnuncio).toBe(Math.round(c.headline.referencia.valorMercado))
  })
})

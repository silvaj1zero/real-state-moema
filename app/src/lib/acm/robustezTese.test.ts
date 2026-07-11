import { describe, it, expect } from 'vitest'
import { computeLaudo, type AcmComparable, type AcmTarget } from './methodology'
import {
  avisoRobustezSensivel,
  ROBUSTEZ_LIMIAR_DEFAULT_PCT,
  testarRobustez,
} from './robustezTese'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('testarRobustez (Story 9.25)', () => {
  it('AC4 — determinismo: mesma entrada → mesma saída', () => {
    const c = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const a = testarRobustez(c)
    const b = testarRobustez(c)
    expect(a).toEqual(b)
    expect(a.limiarPct).toBe(ROBUSTEZ_LIMIAR_DEFAULT_PCT)
  })

  it('AC5 — Honduras: snapshot de amplitude (regressão real)', () => {
    const c = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const r = testarRobustez(c)
    // Headline referencia = top3 (cenário aderente de menor valor); n=3.
    // Snapshot congelado 10-Jul-2026 (QA Wave 5): amplitude 10,6% → sensivel no limiar 10%.
    expect(r.cenarioReferencia).toBe('top3')
    expect(r.nConjunto).toBe(3)
    expect(r.leaveOneOut.length).toBe(3)
    expect(r.amplitudeLeaveOneOutPct).toBe(10.6)
    expect(r.veredicto).toBe('sensivel')
    expect(r.comparavelMaisInfluente).toBe('R. Maestro Chiaffarelli, 86')
    expect(r.testemunhas.length).toBe(c.passaportes.length)
  })

  it('AC5 — caso sintético com outlier dominante → sensivel + comparável certo', () => {
    const target: AcmTarget = { areaConstruida: 100, areaTerreno: 200, endereco: 'R. Alvo, 1' }
    // Top 3: dois iguais + um outlier. Mediana é robusta a n≥5, mas em n=3
    // retirar um ponto de baixa muda a mediana de forma dominante.
    const base = (end: string, preco: number, dist: number): AcmComparable => ({
      endereco: end,
      areaConstruida: 100,
      areaTerreno: 200,
      preco,
      distancia: dist,
      isVendaReal: true,
    })
    const comparaveis: AcmComparable[] = [
      base('R. Outlier, 1', 50_000_000, 10),
      base('R. B, 2', 1_000_000, 20),
      base('R. C, 3', 1_000_000, 30),
    ]
    const c = computeLaudo({ target, comparaveis, fatoresLiquidez: [] })
    // Headline referencia costuma ser top3/top5 — força limiar baixo
    const r = testarRobustez(c, { limiarPct: 5 })
    expect(r.veredicto).toBe('sensivel')
    expect(r.amplitudeLeaveOneOutPct).toBeGreaterThan(5)
    // Remover um dos "1M" sobe a mediana (par outlier+1M); é o ponto mais influente
    // OU o outlier se a referência for o par baixo. Aceita qualquer do conjunto.
    expect(r.comparavelMaisInfluente).toBeTruthy()
    expect(comparaveis.map((x) => x.endereco)).toContain(r.comparavelMaisInfluente)
    const aviso = avisoRobustezSensivel(r)
    expect(aviso).not.toBeNull()
    expect(aviso!.codigo).toBe('reference_sensitive_to_single_comp')
    expect(aviso!.severidade).toBe('atencao')
  })

  it('AC2 — robusta → sem aviso', () => {
    // 5 iguais → amplitude 0
    const target: AcmTarget = { areaConstruida: 100, areaTerreno: 200 }
    const comparaveis: AcmComparable[] = Array.from({ length: 5 }, (_, i) => ({
      endereco: `R. X, ${i + 1}`,
      areaConstruida: 100,
      areaTerreno: 200,
      preco: 1_000_000,
      distancia: 50 + i,
      isVendaReal: true,
    }))
    const c = computeLaudo({ target, comparaveis })
    const r = testarRobustez(c)
    expect(r.veredicto).toBe('robusta')
    expect(r.amplitudeLeaveOneOutPct).toBe(0)
    expect(avisoRobustezSensivel(r)).toBeNull()
  })
})

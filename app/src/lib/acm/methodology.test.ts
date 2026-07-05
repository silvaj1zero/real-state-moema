import { describe, it, expect } from 'vitest'
import {
  classifyScore,
  adherenceIndex,
  rankByAdherence,
  landPriceByLotSize,
  residualLandValue,
  marketValue,
  liquidityAdjustment,
  median,
  computeLaudo,
  isSelfReference,
  screenSelfReferences,
} from './methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

// Tolerância p/ números do laudo (PDF arredonda a mediana p/ inteiro; raw difere ~0.01%).
const within = (got: number, expected: number, pct = 0.005) =>
  Math.abs(got - expected) <= Math.abs(expected) * pct

describe('median', () => {
  it('ímpar → elemento do meio', () => expect(median([3, 1, 2])).toBe(2))
  it('par → média dos dois centrais', () => expect(median([1, 2, 3, 4])).toBe(2.5))
  it('vazio → 0', () => expect(median([])).toBe(0))
})

describe('classifyScore (Material Didático Parte 1.2)', () => {
  it('alvo Honduras (R$ 13.125/m²) → B', () =>
    expect(classifyScore(13125, null, 800)).toBe('B'))
  it('< 22k → B', () => expect(classifyScore(20645, 2, 310)).toBe('B'))
  it('≥ 22k sem luxo → A', () => expect(classifyScore(24287, 2, 209)).toBe('A'))
  it('≥ 30k + 3 suítes/vagas → AA', () => expect(classifyScore(31000, 3, 400)).toBe('AA'))
  it('≥ 40k + 4 suítes/vagas → AAA', () => expect(classifyScore(41000, 4, 400)).toBe('AAA'))
  it('≥ 40k + área ≥ 500 → AAA', () => expect(classifyScore(41000, 0, 520)).toBe('AAA'))
})

describe('adherenceIndex / rankByAdherence (Top 3 do laudo)', () => {
  it('Top 3 = Chiaffarelli, Bitencourt 101, Torres Homem 399', () => {
    const ranked = rankByAdherence(HONDURAS_TARGET, HONDURAS_COMPARAVEIS)
    expect(ranked.slice(0, 3).map((r) => r.endereco)).toEqual([
      'R. Maestro Chiaffarelli, 86',
      'R. Marechal Bitencourt, 101',
      'R. Cons. Torres Homem, 399',
    ])
  })

  it('Top 5 são os 5 comparáveis enriquecidos (terreno+distância)', () => {
    const ranked = rankByAdherence(HONDURAS_TARGET, HONDURAS_COMPARAVEIS)
    expect(new Set(ranked.slice(0, 5).map((r) => r.endereco))).toEqual(
      new Set([
        'R. Maestro Chiaffarelli, 86',
        'R. Marechal Bitencourt, 101',
        'R. Cons. Torres Homem, 399',
        'R. Henrique Martins',
        'R. Canadá, 111',
      ]),
    )
  })

  it('componentes de aderência do #1 (Chiaffarelli)', () => {
    const b = adherenceIndex(HONDURAS_TARGET, HONDURAS_COMPARAVEIS[0])
    expect(b.simAreaTerreno).toBeCloseTo(0.942, 3) // 1 - 58/1000
    expect(b.proximidade).toBeCloseTo(0.834, 3) // 1 - 166/1000
  })
})

describe('landPriceByLotSize (efeito-escala — Laudo Sec. 8a)', () => {
  it('faixa > 800 m² → mediana ≈ R$ 8.704/m² (1058@6144 + 822@11265)', () => {
    const bands = landPriceByLotSize(HONDURAS_COMPARAVEIS)
    const grande = bands.find((b) => b.faixa === '>800')!
    expect(grande.n).toBe(2)
    expect(within(grande.medianaPrecoM2Terreno, 8704, 0.01)).toBe(true)
  })
})

describe('residualLandValue (Laudo Sec. 8b)', () => {
  it('Honduras → R$ 9.624.000', () =>
    expect(residualLandValue(HONDURAS_RESIDUAL)).toBe(9_624_000))
})

describe('marketValue / liquidityAdjustment', () => {
  it('valor de mercado = mediana × área × (1 − Capex Score B)', () => {
    expect(marketValue(18264, 800, 'B')).toBe(12_419_520) // Laudo Sec. 9
  })
  it('liquidez composta (multiplicativa) dos fatores Honduras', () => {
    expect(within(liquidityAdjustment(12_419_520, HONDURAS_FATORES_LIQUIDEZ), 10_217_539)).toBe(true)
  })
})

describe('computeLaudo — regressão integrada Honduras', () => {
  const r = computeLaudo({
    target: HONDURAS_TARGET,
    comparaveis: HONDURAS_COMPARAVEIS,
    fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
    residual: HONDURAS_RESIDUAL,
  })

  it('23 comparáveis', () => expect(r.totalComparaveis).toBe(23))
  it('mediana R$/m² ≈ 18.264', () => expect(within(r.medianaPrecoM2, 18264, 0.001)).toBe(true))
  it('Score do alvo = B', () => expect(r.scoreAlvo).toBe('B'))
  it('valor de mercado ≈ R$ 12,4M', () => expect(within(r.valorMercado, 12_419_520)).toBe(true))
  it('valor de fechamento ≈ R$ 10.217.539', () => expect(within(r.valorFechamento, 10_217_539)).toBe(true))
  it('co-âncora de terreno (residual) = R$ 9.624.000', () => expect(r.coAncoraTerreno).toBe(9_624_000))
  it('faixa de fechamento dentro de R$ 10,0–12,5M', () => {
    expect(r.faixaFechamento.min).toBeGreaterThan(10_000_000)
    expect(r.faixaFechamento.max).toBeLessThan(12_500_000)
  })
  it('Top 3 correto', () =>
    expect(r.top3.map((t) => t.endereco)).toEqual([
      'R. Maestro Chiaffarelli, 86',
      'R. Marechal Bitencourt, 101',
      'R. Cons. Torres Homem, 399',
    ]))
  it('sensibilidade tem 3 cenários (todos/top5/top3)', () => {
    expect(r.sensibilidade.map((s) => s.cenario)).toEqual(['todos', 'top5', 'top3'])
    expect(r.sensibilidade[0].n).toBe(23)
  })
  it('deságio medido ≈ -12.7% (Bitencourt -15% + Torres Homem -10%)', () => {
    expect(r.desagioMedidoPercent).not.toBeNull()
    expect(r.desagioMedidoPercent!).toBeLessThan(0)
    expect(within(r.desagioMedidoPercent!, -12.7, 0.1)).toBe(true)
  })
  it('nenhuma auto-referência no caso legado (guard-rail inerte sem endereco do alvo)', () =>
    expect(r.autoReferenciasExcluidas).toEqual([]))
  it('faixaSensibilidade = envelope min/max dos cenários', () => {
    const mercados = r.sensibilidade.map((s) => s.valorMercado)
    expect(r.faixaSensibilidade.mercadoMin).toBe(Math.min(...mercados))
    expect(r.faixaSensibilidade.mercadoMax).toBe(Math.max(...mercados))
    expect(r.faixaSensibilidade.fechamentoMin).toBeLessThanOrEqual(r.faixaSensibilidade.fechamentoMax)
  })
})

// ---------------------------------------------------------------------------
// Guard-rail anti-auto-referência — Story 9.8 (incidente Honduras 639)
// ---------------------------------------------------------------------------

describe('isSelfReference / screenSelfReferences (Story 9.8)', () => {
  // Alvo com identidade completa (o fixture legado não tem esses campos).
  const targetHonduras = {
    ...HONDURAS_TARGET,
    endereco: 'Rua Honduras, 629',
    vagas: 10,
    precoPretendido: 12_000_000,
  }

  // O caso real: anúncio "Honduras 639" = o próprio alvo (handoff 28-Jun-2026).
  const anuncio639 = {
    endereco: 'R. Honduras, 639',
    areaConstruida: 800,
    areaTerreno: null,
    preco: 12_000_000,
    precoPedido: 12_000_000,
    distancia: 10,
    vagas: 10,
  }

  // Oferta legítima da MESMA rua (laudo: 418 m² / R$ 22,5M / 736 m — outro imóvel).
  const hondurasSemNumero = {
    endereco: 'Rua Honduras s/nº',
    areaConstruida: 418,
    areaTerreno: null,
    preco: 22_500_000,
    distancia: 736,
    vagas: null,
  }

  it('detecta o anúncio 639 como auto-referência (com motivos)', () => {
    const finding = isSelfReference(targetHonduras, anuncio639)
    expect(finding).not.toBeNull()
    expect(finding!.motivos.length).toBeGreaterThan(0)
  })

  it('detecta pelo fingerprint mesmo sem distância (área+vagas+preço)', () => {
    const finding = isSelfReference(targetHonduras, { ...anuncio639, distancia: null })
    expect(finding).not.toBeNull()
  })

  it('NÃO rejeita oferta legítima da mesma rua com atributos distintos', () =>
    expect(isSelfReference(targetHonduras, hondurasSemNumero)).toBeNull())

  it('NÃO rejeita comparável de outra rua com área parecida', () =>
    expect(
      isSelfReference(targetHonduras, {
        endereco: 'R. Maestro Chiaffarelli, 86',
        areaConstruida: 810,
        preco: 11_300_000,
        distancia: 166,
        vagas: 4,
      }),
    ).toBeNull())

  it('guard-rail inerte quando o alvo não declara identidade', () =>
    expect(isSelfReference(HONDURAS_TARGET, anuncio639)).toBeNull())

  it('computeLaudo exclui o 639 e reporta em autoReferenciasExcluidas', () => {
    const contaminado = computeLaudo({
      target: targetHonduras,
      comparaveis: [...HONDURAS_COMPARAVEIS, anuncio639],
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
    })
    expect(contaminado.totalComparaveis).toBe(23) // o 24º (639) saiu
    expect(contaminado.autoReferenciasExcluidas.map((e) => e.endereco)).toEqual([
      'R. Honduras, 639',
    ])
    // Números idênticos ao caso limpo — a contaminação não altera o laudo.
    expect(within(contaminado.medianaPrecoM2, 18264, 0.001)).toBe(true)
  })

  it('screenSelfReferences preserva os 23 legítimos', () => {
    const { aceitos, excluidos } = screenSelfReferences(targetHonduras, [
      ...HONDURAS_COMPARAVEIS,
      anuncio639,
    ])
    expect(aceitos.length).toBe(23)
    expect(excluidos.length).toBe(1)
  })
})

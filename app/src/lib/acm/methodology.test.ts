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
  headlineFaixa,
  deflacionarComparaveis,
  composicaoPorBairro,
  desagioMedido,
  derivarPassaporte,
  derivarPassaportes,
  agregarConfianca,
  tratarDesagio,
  DESAGIO_DEFAULT,
  weightedMedian,
} from './methodology'
import type { AcmComparable } from './methodology'
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
  it('headline: referência = Top 3 (cenário aderente de menor valor no fixture), teto = todos (Story 9.10)', () => {
    // No ranking do app o recorte de menor valor é o Top 3 (≈ R$ 9,84M) — mesmo
    // patamar conservador da tabela do laudo (que o atribui ao Top 5); o teto é
    // o recorte amplo (≈ R$ 12,42M). Faixa = R$ 9,8–12,4M (exemplo do founder).
    expect(r.headline.referencia.cenario).toBe('top3')
    expect(r.headline.teto.cenario).toBe('todos')
    expect(within(r.headline.referencia.valorMercado, 9_842_105)).toBe(true)
    expect(within(r.headline.teto.valorMercado, 12_419_520)).toBe(true)
  })
  it('headline: faixas de mercado/fechamento = envelope da sensibilidade', () => {
    expect(r.headline.mercado.min).toBe(r.faixaSensibilidade.mercadoMin)
    expect(r.headline.mercado.max).toBe(r.faixaSensibilidade.mercadoMax)
    expect(r.headline.fechamento.min).toBe(r.faixaSensibilidade.fechamentoMin)
    expect(r.headline.fechamento.max).toBe(r.faixaSensibilidade.fechamentoMax)
  })
})

// ---------------------------------------------------------------------------
// Headline em faixa — Story 9.10 (decisão founder 06-Jul / auditoria §3.1)
// ---------------------------------------------------------------------------

describe('headlineFaixa — regra determinística de referência e teto', () => {
  const cenario = (
    c: 'todos' | 'top5' | 'top3',
    n: number,
    valorMercado: number,
    valorFechamento: number,
  ) => ({
    cenario: c,
    n,
    medianaPrecoM2: valorMercado / 800,
    valorMercado,
    valorFechamento,
    precoM2Fechamento: Math.round(valorFechamento / 800),
  })

  it('referência = cenário aderente de MENOR valor de mercado (conservador)', () => {
    const h = headlineFaixa([
      cenario('todos', 23, 12_400_000, 10_200_000),
      cenario('top5', 5, 9_840_000, 8_100_000),
      cenario('top3', 3, 11_930_000, 9_810_000),
    ])
    expect(h.referencia.cenario).toBe('top5')
    expect(h.teto.cenario).toBe('todos')
    expect(h.mercado).toEqual({ min: 9_840_000, max: 12_400_000 })
    expect(h.fechamento).toEqual({ min: 8_100_000, max: 10_200_000 })
  })

  it('empate de valor entre aderentes → maior n (top5)', () => {
    const h = headlineFaixa([
      cenario('todos', 10, 12_000_000, 10_000_000),
      cenario('top3', 3, 9_000_000, 7_500_000),
      cenario('top5', 5, 9_000_000, 7_500_000),
    ])
    expect(h.referencia.cenario).toBe('top5')
  })

  it('o "todos" nunca é referência quando há cenário aderente — mesmo sendo o menor', () => {
    const h = headlineFaixa([
      cenario('todos', 10, 8_000_000, 6_500_000),
      cenario('top5', 5, 9_000_000, 7_500_000),
      cenario('top3', 3, 9_500_000, 7_900_000),
    ])
    expect(h.referencia.cenario).toBe('top5')
    expect(h.teto.cenario).toBe('top3')
  })

  it('sem cenário aderente → referência = menor valor entre os presentes', () => {
    const h = headlineFaixa([cenario('todos', 10, 8_000_000, 6_500_000)])
    expect(h.referencia.cenario).toBe('todos')
    expect(h.teto.cenario).toBe('todos')
    expect(h.mercado).toEqual({ min: 8_000_000, max: 8_000_000 })
  })

  it('lista vazia → erro explícito', () => {
    expect(() => headlineFaixa([])).toThrow(/ao menos um cenário/)
  })
})

// ---------------------------------------------------------------------------
// Homogeneização temporal + bairro real — Story 9.11 (Frente 1.3, FipeZap)
// ---------------------------------------------------------------------------

describe('deflacionarComparaveis — deflação a valor presente', () => {
  // Série sintética: +10% ao ano (a série REAL FipeZap é ingerida à parte —
  // Art. IV: nenhum valor de índice é inventado no código).
  const SERIE = [
    { mes: '2024-01', indice: 100 },
    { mes: '2025-01', indice: 110 },
    { mes: '2026-01', indice: 121 },
  ]
  const OPTS = { indice: 'FipeZap', serie: SERIE, dataReferencia: '2026-01' }
  const comp = (over: Partial<Parameters<typeof deflacionarComparaveis>[0][number]> = {}) => ({
    endereco: 'R. Teste, 100',
    areaConstruida: 100,
    preco: 1_000_000,
    ...over,
  })

  it('fator = índice(ref)/índice(venda); preço ajustado e rastreado', () => {
    const { comparaveis, relatorio } = deflacionarComparaveis(
      [comp({ dataVenda: '2024-01' })],
      OPTS,
    )
    expect(comparaveis[0].preco).toBe(1_210_000) // 100 → 121
    expect(relatorio.aplicada).toBe(true)
    expect(relatorio.ajustes).toHaveLength(1)
    expect(relatorio.ajustes[0]).toMatchObject({
      dataVenda: '2024-01',
      precoOriginal: 1_000_000,
      precoAjustado: 1_210_000,
    })
    expect(relatorio.ajustes[0].fator).toBeCloseTo(1.21, 10)
  })

  it('precoPedido deflacionado pelo MESMO fator → deságio medido invariante', () => {
    const original = [
      comp({ dataVenda: '2024-01', preco: 850_000, precoPedido: 1_000_000, isVendaReal: true }),
    ]
    const { comparaveis } = deflacionarComparaveis(original, OPTS)
    expect(desagioMedido(comparaveis)).toBe(desagioMedido(original)) // -15%
  })

  it('sem dataVenda ou competência fora da série → sem ajuste, reportado', () => {
    const { comparaveis, relatorio } = deflacionarComparaveis(
      [comp(), comp({ endereco: 'R. Fora, 1', dataVenda: '2023-06' })],
      OPTS,
    )
    expect(comparaveis[0].preco).toBe(1_000_000)
    expect(comparaveis[1].preco).toBe(1_000_000)
    expect(relatorio.ajustes).toHaveLength(0)
    expect(relatorio.semAjuste).toEqual(['R. Teste, 100', 'R. Fora, 1'])
  })

  it('dataReferencia fora da série → erro de configuração explícito', () => {
    expect(() =>
      deflacionarComparaveis([comp()], { ...OPTS, dataReferencia: '2027-01' }),
    ).toThrow(/dataReferencia 2027-01 ausente/)
  })
})

describe('composicaoPorBairro — bairro real verificado (auditoria §3.1)', () => {
  it('agrupa por bairroReal, mediana R$/m² por grupo, n desc', () => {
    const comps = [
      { endereco: 'A', areaConstruida: 100, preco: 2_000_000, bairroReal: 'Jardim Paulista' },
      { endereco: 'B', areaConstruida: 100, preco: 3_000_000, bairroReal: 'Jardim Paulista' },
      { endereco: 'C', areaConstruida: 100, preco: 1_000_000, bairroReal: 'Jardim América' },
      { endereco: 'D', areaConstruida: 100, preco: 4_000_000 },
    ]
    const c = composicaoPorBairro(comps)
    expect(c).toEqual([
      { bairro: 'Jardim Paulista', n: 2, medianaPrecoM2: 25_000 },
      { bairro: 'Jardim América', n: 1, medianaPrecoM2: 10_000 },
      { bairro: 'não verificado', n: 1, medianaPrecoM2: 40_000 },
    ])
  })
})

describe('computeLaudo — homogeneização opt-in (inerte sem opções)', () => {
  const SERIE = [
    { mes: '2024-06', indice: 100 },
    { mes: '2026-06', indice: 125 },
  ]

  it('sem opts.homogeneizacao → relatório inerte e resultado legado intacto', () => {
    const r = computeLaudo({ target: HONDURAS_TARGET, comparaveis: HONDURAS_COMPARAVEIS })
    expect(r.homogeneizacao).toEqual({
      aplicada: false,
      indice: null,
      dataReferencia: null,
      ajustes: [],
      semAjuste: [],
    })
    expect(within(r.medianaPrecoM2, 18264, 0.001)).toBe(true)
    // Fixture sem bairroReal → composição inteira 'não verificado'.
    expect(r.composicaoBairros).toEqual([
      { bairro: 'não verificado', n: 23, medianaPrecoM2: r.medianaPrecoM2 },
    ])
  })

  it('com homogeneização → mediana calculada sobre preços deflacionados', () => {
    const comparaveis = [
      { endereco: 'A', areaConstruida: 100, preco: 1_000_000, dataVenda: '2024-06' },
      { endereco: 'B', areaConstruida: 100, preco: 1_500_000, dataVenda: '2026-06' },
    ]
    const r = computeLaudo({
      target: { areaConstruida: 100, areaTerreno: 200 },
      comparaveis,
      homogeneizacao: { indice: 'FipeZap', serie: SERIE, dataReferencia: '2026-06' },
    })
    // A: 1,0M × 1,25 = 1,25M (12.500/m²); B: fator 1 (já em valor presente,
    // 15.000/m²) → mediana 13.750.
    expect(r.homogeneizacao.aplicada).toBe(true)
    expect(r.homogeneizacao.ajustes).toHaveLength(2)
    expect(r.homogeneizacao.ajustes.find((a) => a.endereco === 'A')!.fator).toBeCloseTo(1.25, 10)
    expect(r.homogeneizacao.ajustes.find((a) => a.endereco === 'B')!.fator).toBe(1)
    expect(r.medianaPrecoM2).toBe(13_750)
  })

  it('guard-rail 9.8 roda ANTES da deflação — auto-referência não é ajustada', () => {
    const target = {
      areaConstruida: 100,
      areaTerreno: 200,
      endereco: 'R. Honduras, 629',
      vagas: 10,
      precoPretendido: 12_000_000,
    }
    const autoRef = {
      endereco: 'R. Honduras, 639',
      areaConstruida: 100,
      preco: 12_000_000,
      distancia: 10,
      vagas: 10,
      dataVenda: '2024-06',
    }
    const legitimo = { endereco: 'R. Legítima, 50', areaConstruida: 100, preco: 1_000_000, dataVenda: '2024-06' }
    const r = computeLaudo({
      target,
      comparaveis: [autoRef, legitimo],
      homogeneizacao: { indice: 'FipeZap', serie: SERIE, dataReferencia: '2026-06' },
    })
    expect(r.autoReferenciasExcluidas.map((f) => f.endereco)).toEqual(['R. Honduras, 639'])
    expect(r.homogeneizacao.ajustes.map((a) => a.endereco)).toEqual(['R. Legítima, 50'])
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

// ---------------------------------------------------------------------------
// Passaporte de confiabilidade + avisos de robustez — Story 9.15 (N-1)
// ---------------------------------------------------------------------------

describe('derivarPassaporte — grau A/B/C determinístico pela força do preço', () => {
  const base: AcmComparable = { endereco: 'X', areaConstruida: 400, preco: 8_000_000 }

  it('ITBI enriquecido (terreno + distância) → A', () => {
    const p = derivarPassaporte(
      { ...base, isVendaReal: true, areaTerreno: 500, distancia: 200 },
      'incluido',
    )
    expect(p.confianca).toBe('A')
    expect(p.fontePreco).toBe('itbi_oficial')
    expect(p.status).toBe('incluido')
  })

  it('ITBI esparso (sem terreno/distância) → B', () => {
    expect(derivarPassaporte({ ...base, isVendaReal: true }, 'incluido').confianca).toBe('B')
  })

  it('anúncio (não é fechamento) → C', () => {
    const p = derivarPassaporte({ ...base, isVendaReal: false, precoPedido: 8_500_000 }, 'incluido')
    expect(p.confianca).toBe('C')
    expect(p.fontePreco).toBe('anuncio')
  })

  it('excluído pelo guard-rail 9.8 → rejeitado (com motivos)', () => {
    const p = derivarPassaporte({ ...base, isVendaReal: true }, 'excluido', ['auto-referência'])
    expect(p.confianca).toBe('rejeitado')
    expect(p.motivos).toEqual(['auto-referência'])
  })

  it('proveniência ausente vira o pior grau conhecido (Art. IV — não inventa "oficial")', () => {
    const p = derivarPassaporte({ ...base, isVendaReal: true }, 'incluido')
    expect(p.areaConstrFonte).toBe('nao_rastreada')
    expect(p.areaTerrenoFonte).toBe('ausente')
    expect(p.dataVendaFonte).toBe('ausente')
    expect(p.geocode).toBe('ausente')
    expect(p.tipologia.fonte).toBe('ausente')
  })

  it('proveniência preenchida (9.4/9.17) é refletida no passaporte', () => {
    const p = derivarPassaporte(
      {
        ...base,
        isVendaReal: true,
        areaTerreno: 500,
        distancia: 100,
        tipologia: { valor: 'casa', fonte: 'guia' },
        areaConstruidaFonte: 'oficial',
        areaTerrenoFonte: 'oficial',
        dataVenda: '2025-01',
        dataVendaConfirmada: true,
        geocode: 'exato',
      },
      'incluido',
    )
    expect(p.tipologia).toEqual({ valor: 'casa', confianca: 'alta', fonte: 'guia' })
    expect(p.areaConstrFonte).toBe('oficial')
    expect(p.dataVendaFonte).toBe('confirmada')
    expect(p.geocode).toBe('exato')
  })
})

describe('computeLaudo — avisos + passaportes (regressão Honduras)', () => {
  const r = computeLaudo({
    target: HONDURAS_TARGET,
    comparaveis: HONDURAS_COMPARAVEIS,
    fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
    residual: HONDURAS_RESIDUAL,
  })

  it('AC6 — números-âncora intactos (avisos não alteram o cálculo)', () => {
    expect(r.totalComparaveis).toBe(23)
    expect(within(r.medianaPrecoM2, 18264, 0.001)).toBe(true)
    expect(within(r.valorMercado, 12_419_520)).toBe(true)
  })

  it('AC6 — passaportes.length = n processados (23, sem exclusões)', () => {
    expect(r.passaportes).toHaveLength(23)
    expect(r.passaportes.every((p) => p.status === 'incluido')).toBe(true)
  })

  it('agregado A/B/C: Top 5 enriquecidos = A, os 18 esparsos = B', () => {
    expect(agregarConfianca(r.passaportes)).toEqual({ A: 5, B: 18, C: 0, rejeitado: 0 })
  })

  it('avisos esperados: terrain_lens_low_n (banda >800 n=2) + target_condition_unconfirmed', () => {
    const codigos = r.avisos.map((a) => a.codigo)
    expect(codigos).toContain('terrain_lens_low_n')
    expect(codigos).toContain('target_condition_unconfirmed')
  })

  it('não dispara falsos: amostra grande, fatores presentes, top5 sólido', () => {
    const codigos = r.avisos.map((a) => a.codigo)
    expect(codigos).not.toContain('sample_size_low_top3')
    expect(codigos).not.toContain('liquidity_factors_unvalidated')
    expect(codigos).not.toContain('confidence_low_in_top5')
    expect(codigos).not.toContain('AUTO_REF_EXCLUIDAS')
  })

  it('estadoAlvoConfirmado:true silencia target_condition_unconfirmed (cruza 9.14)', () => {
    const r2 = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
      estadoAlvoConfirmado: true,
    })
    expect(r2.avisos.map((a) => a.codigo)).not.toContain('target_condition_unconfirmed')
  })
})

describe('coletarAvisos — regras individuais', () => {
  it('sample_size_low_top3 quando amostra < 5', () => {
    const r = computeLaudo({
      target: { areaConstruida: 300, areaTerreno: 400 },
      comparaveis: [
        { endereco: 'A', areaConstruida: 300, preco: 3_000_000, isVendaReal: true },
        { endereco: 'B', areaConstruida: 310, preco: 3_100_000, isVendaReal: true },
      ],
    })
    expect(r.avisos.map((a) => a.codigo)).toContain('sample_size_low_top3')
  })

  it('liquidity_factors_unvalidated quando não há fatores', () => {
    const r = computeLaudo({ target: HONDURAS_TARGET, comparaveis: HONDURAS_COMPARAVEIS })
    expect(r.avisos.map((a) => a.codigo)).toContain('liquidity_factors_unvalidated')
  })

  it('mixed_neighborhood_sample com >1 bairro real', () => {
    const r = computeLaudo({
      target: { areaConstruida: 300, areaTerreno: 400 },
      comparaveis: [
        { endereco: 'A', areaConstruida: 300, preco: 3_000_000, isVendaReal: true, bairroReal: 'Jardim Paulista' },
        { endereco: 'B', areaConstruida: 300, preco: 3_100_000, isVendaReal: true, bairroReal: 'Jardim América' },
        { endereco: 'C', areaConstruida: 300, preco: 3_200_000, isVendaReal: true, bairroReal: 'Jardim Paulista' },
        { endereco: 'D', areaConstruida: 300, preco: 3_300_000, isVendaReal: true, bairroReal: 'Jardim América' },
        { endereco: 'E', areaConstruida: 300, preco: 3_400_000, isVendaReal: true, bairroReal: 'Jardim Paulista' },
      ],
    })
    expect(r.avisos.map((a) => a.codigo)).toContain('mixed_neighborhood_sample')
  })

  it('typology_heuristic_present quando algum comparável é tipado por heurística', () => {
    const r = computeLaudo({
      target: { areaConstruida: 300, areaTerreno: 400 },
      comparaveis: [
        { endereco: 'A', areaConstruida: 300, preco: 3_000_000, isVendaReal: true, tipologia: { valor: 'casa', fonte: 'heuristica' } },
        { endereco: 'B', areaConstruida: 310, preco: 3_100_000, isVendaReal: true },
        { endereco: 'C', areaConstruida: 320, preco: 3_200_000, isVendaReal: true },
        { endereco: 'D', areaConstruida: 330, preco: 3_300_000, isVendaReal: true },
        { endereco: 'E', areaConstruida: 340, preco: 3_400_000, isVendaReal: true },
      ],
    })
    expect(r.avisos.map((a) => a.codigo)).toContain('typology_heuristic_present')
  })

  it('confidence_low_in_top5 quando o Top 5 tem comparável C (anúncio)', () => {
    // 5 comparáveis, um deles é anúncio (não venda real) e o mais aderente.
    const r = computeLaudo({
      target: { areaConstruida: 300, areaTerreno: 400, endereco: null },
      comparaveis: [
        { endereco: 'Anuncio', areaConstruida: 300, areaTerreno: 400, distancia: 10, preco: 3_000_000, isVendaReal: false },
        { endereco: 'B', areaConstruida: 305, areaTerreno: 400, distancia: 500, preco: 3_100_000, isVendaReal: true },
        { endereco: 'C', areaConstruida: 320, preco: 3_200_000, isVendaReal: true },
        { endereco: 'D', areaConstruida: 330, preco: 3_300_000, isVendaReal: true },
        { endereco: 'E', areaConstruida: 340, preco: 3_400_000, isVendaReal: true },
      ],
    })
    expect(r.avisos.map((a) => a.codigo)).toContain('confidence_low_in_top5')
  })

  it('AUTO_REF_EXCLUIDAS + passaporte rejeitado no contaminado (length = 24)', () => {
    const target = { areaConstruida: 800, areaTerreno: 1000, endereco: 'Rua Honduras, 629', vagas: 10, precoPretendido: 12_000_000 }
    const anuncio639 = { endereco: 'R. Honduras, 639', areaConstruida: 800, preco: 12_000_000, precoPedido: 12_000_000, distancia: 10, vagas: 10 }
    const r = computeLaudo({ target, comparaveis: [...HONDURAS_COMPARAVEIS, anuncio639], fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ })
    expect(r.avisos.map((a) => a.codigo)).toContain('AUTO_REF_EXCLUIDAS')
    expect(r.passaportes).toHaveLength(24)
    const rej = r.passaportes.find((p) => p.endereco === 'R. Honduras, 639')!
    expect(rej.status).toBe('excluido')
    expect(rej.confianca).toBe('rejeitado')
  })
})

// ---------------------------------------------------------------------------
// Deságio de estado do alvo — Story 9.14 (C-1: fim do Capex oculto)
// ---------------------------------------------------------------------------

describe('tratarDesagio — três cenários explícitos (0 / −7,5% / −15%)', () => {
  it('sem ficha → expõe os três, cenarioAplicado null (AC3: sem default silencioso)', () => {
    const d = tratarDesagio(10_000_000, { areaConstruida: 800, areaTerreno: 1000 })
    expect(d.cenarioAplicado).toBeNull()
    expect(d.origemDefault).toBe('sem-ficha')
    expect(d.valorMercadoPorCenario).toEqual({
      agressivo: 10_000_000,
      provavel: 9_250_000,
      conservador: 8_500_000,
    })
    expect(d.foraDaReguaSimples).toBe(false)
  })

  it('estado B (conservado) → cenário provável, marcado provisório pré-H3', () => {
    const d = tratarDesagio(10_000_000, { areaConstruida: 800, areaTerreno: 1000, estadoConservacao: 'B' })
    expect(d.cenarioAplicado).toBe('provavel')
    expect(d.origemDefault).toBe('ficha-provisoria-pre-H3')
    expect(d.estadoConservacao).toBe('B')
  })

  it('estado A → agressivo (0%); estado C → conservador (−15%)', () => {
    expect(tratarDesagio(1e7, { areaConstruida: 1, areaTerreno: 1, estadoConservacao: 'A' }).cenarioAplicado).toBe('agressivo')
    expect(tratarDesagio(1e7, { areaConstruida: 1, areaTerreno: 1, estadoConservacao: 'C' }).cenarioAplicado).toBe('conservador')
  })

  it('estado D → conservador + fora da régua simples (flag)', () => {
    const d = tratarDesagio(1e7, { areaConstruida: 1, areaTerreno: 1, estadoConservacao: 'D' })
    expect(d.cenarioAplicado).toBe('conservador')
    expect(d.foraDaReguaSimples).toBe(true)
  })

  it('override explícito vence a ficha', () => {
    const d = tratarDesagio(1e7, { areaConstruida: 1, areaTerreno: 1, estadoConservacao: 'C' }, DESAGIO_DEFAULT, 'agressivo')
    expect(d.cenarioAplicado).toBe('agressivo')
    expect(d.origemDefault).toBe('override-explicito')
  })
})

describe('computeLaudo — deságio de estado (Story 9.14 AC4/AC5/AC6)', () => {
  it('AC5 — Honduras sem ficha: valorMercado intacto; deságio é camada aditiva inerte', () => {
    const r = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    expect(within(r.valorMercado, 12_419_520)).toBe(true) // inalterado
    expect(r.desagioTratado.cenarioAplicado).toBeNull() // sem ficha → sem default
    // conservador reproduz o patamar de −15% de forma EXPLÍCITA (não oculta)
    expect(r.desagioTratado.valorMercadoPorCenario.agressivo).toBe(r.valorMercado)
    expect(r.desagioTratado.valorMercadoPorCenario.conservador).toBe(Math.round(r.valorMercado * 0.85))
    // O aviso de condição não confirmada continua (sem ficha)
    expect(r.avisos.map((a) => a.codigo)).toContain('target_condition_unconfirmed')
  })

  it('AC6/9.15 — com ficha estado B: condição confirmada e cenário provável aplicado', () => {
    const r = computeLaudo({
      target: { ...HONDURAS_TARGET, estadoConservacao: 'B' },
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
    })
    expect(r.desagioTratado.cenarioAplicado).toBe('provavel')
    expect(r.desagioTratado.origemDefault).toBe('ficha-provisoria-pre-H3')
    // ficha presente → silencia o aviso de condição não confirmada
    expect(r.avisos.map((a) => a.codigo)).not.toContain('target_condition_unconfirmed')
  })
})

// ---------------------------------------------------------------------------
// Mediana ponderada / ranking de evidência A·B·C — Story 9.20
// ---------------------------------------------------------------------------

describe('weightedMedian — cruzamento do peso acumulado', () => {
  it('pesos iguais → mediana simples', () => {
    expect(weightedMedian([
      { valor: 10, peso: 1 },
      { valor: 20, peso: 1 },
      { valor: 30, peso: 1 },
    ])).toBe(20)
  })

  it('peso concentrado puxa a mediana para o valor pesado', () => {
    expect(weightedMedian([
      { valor: 10, peso: 1 },
      { valor: 20, peso: 10 },
      { valor: 30, peso: 1 },
    ])).toBe(20)
  })

  it('sem pesos válidos → fallback mediana simples', () => {
    expect(weightedMedian([
      { valor: 10, peso: 0 },
      { valor: 30, peso: 0 },
    ])).toBe(20)
  })
})

describe('computeLaudo — ranking de evidência (Story 9.20)', () => {
  it('AC6 — Honduras (0 comparáveis C): mediana principal == mediana legada', () => {
    const r = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    expect(r.evidencia.nC).toBe(0)
    expect(r.evidencia.nA).toBe(5)
    expect(r.evidencia.nB).toBe(18)
    expect(r.evidencia.medianaPrincipal).toBe(r.medianaPrecoM2) // âncora preservada
    expect(r.evidencia.laterais).toEqual([])
  })

  it('AC2 — comparável C (anúncio) fica lateral, fora da mediana principal', () => {
    // 4 vendas ITBI iguais (10.000/m²) + 1 anúncio outlier (grau C) alto.
    const comparaveis: AcmComparable[] = [
      { endereco: 'A', areaConstruida: 100, preco: 1_000_000, isVendaReal: true },
      { endereco: 'B', areaConstruida: 100, preco: 1_000_000, isVendaReal: true },
      { endereco: 'C', areaConstruida: 100, preco: 1_000_000, isVendaReal: true },
      { endereco: 'D', areaConstruida: 100, preco: 1_000_000, isVendaReal: true },
      { endereco: 'ANUNCIO', areaConstruida: 100, preco: 5_000_000, isVendaReal: false },
    ]
    const r = computeLaudo({ target: { areaConstruida: 100, areaTerreno: 200 }, comparaveis })
    expect(r.evidencia.nC).toBe(1)
    expect(r.evidencia.laterais).toEqual(['ANUNCIO'])
    // Mediana principal ignora o anúncio de 50.000/m² → 10.000/m² (só A/B).
    expect(r.evidencia.medianaPrincipal).toBe(10_000)
  })

  it('AC5 — aviso sample_size_low_top3 quando pool A/B < 5', () => {
    const comparaveis: AcmComparable[] = [
      { endereco: 'A', areaConstruida: 100, preco: 1_000_000, isVendaReal: true },
      { endereco: 'B', areaConstruida: 100, preco: 1_100_000, isVendaReal: true },
      { endereco: 'X', areaConstruida: 100, preco: 2_000_000, isVendaReal: false },
      { endereco: 'Y', areaConstruida: 100, preco: 2_100_000, isVendaReal: false },
      { endereco: 'Z', areaConstruida: 100, preco: 2_200_000, isVendaReal: false },
      { endereco: 'W', areaConstruida: 100, preco: 2_300_000, isVendaReal: false },
    ]
    const r = computeLaudo({ target: { areaConstruida: 100, areaTerreno: 200 }, comparaveis })
    expect(r.evidencia.nA + r.evidencia.nB).toBe(2) // só A e B são ITBI
    expect(r.avisos.map((a) => a.codigo)).toContain('sample_size_low_top3')
  })
})

describe('derivarPassaportes — aceitos + excluídos', () => {
  it('concatena aceitos (grau real) e excluídos (rejeitado)', () => {
    const aceitos: AcmComparable[] = [{ endereco: 'A', areaConstruida: 300, preco: 3_000_000, isVendaReal: true }]
    const excluidosOriginais: AcmComparable[] = [{ endereco: 'Z', areaConstruida: 300, preco: 3_000_000, isVendaReal: true }]
    const pass = derivarPassaportes(aceitos, [{ endereco: 'Z', motivos: ['auto-ref'] }], excluidosOriginais)
    expect(pass).toHaveLength(2)
    expect(pass[0]).toMatchObject({ endereco: 'A', status: 'incluido', confianca: 'B' })
    expect(pass[1]).toMatchObject({ endereco: 'Z', status: 'excluido', confianca: 'rejeitado' })
  })
})

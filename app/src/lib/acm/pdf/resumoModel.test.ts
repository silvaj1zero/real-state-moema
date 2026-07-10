import { describe, it, expect } from 'vitest'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import { buildResumoModel, type ResumoSourceComparable, type ResumoInput } from './resumoModel'

/** Mapeia os comparáveis da fixture → fonte do Top N (adiciona fonte/ref). */
const SOURCE: ResumoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: c.isVendaReal ? 'ITBImap' : 'Portal',
  fonteRef: 'consulta SQL',
}))

const COMPUTATION = computeLaudo({
  target: HONDURAS_TARGET,
  comparaveis: HONDURAS_COMPARAVEIS,
  fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
  residual: HONDURAS_RESIDUAL,
})

const INPUT: ResumoInput = {
  enderecoAlvo: 'Rua Honduras',
  bairro: 'Jardim América',
  areaConstruida: 800,
  areaTerreno: 1000,
  programa: { dormitorios: 4, suites: 2, vagas: 10 },
  classeNota: '(retrofit)',
  precoPretendido: 12_000_000,
  precoPedidoReal: 10_500_000,
  precoAnuncioRecomendado: 11_500_000,
  metaFechamento: { min: 10_000_000, max: 10_500_000 },
  dataEmissao: '09/06/2026',
}

describe('buildResumoModel — header e ficha', () => {
  const m = buildResumoModel(COMPUTATION, SOURCE, INPUT)

  it('título "ACM · {rua}"', () => expect(m.header.titulo).toBe('ACM · Rua Honduras'))
  it('data de emissão injetada', () => expect(m.header.dataEmissao).toBe('09/06/2026'))
  it('imóvel = rua · bairro', () => expect(m.ficha.imovel).toBe('Rua Honduras · Jardim América'))
  it('construído/terreno', () => {
    expect(m.ficha.construido).toBe(800)
    expect(m.ficha.terreno).toBe(1000)
  })
  it('programa formatado', () => expect(m.ficha.programa).toBe('4 dorm · 2 suítes · 10 vagas'))
  it('Score do alvo = B', () => expect(m.ficha.score).toBe('B'))
})

describe('buildResumoModel — faixa capa H-3', () => {
  const m = buildResumoModel(COMPUTATION, SOURCE, INPUT)

  it('4 cards sem co-âncora na capa', () => {
    expect(m.faixa).toHaveLength(4)
    expect(m.faixa[0].rotulo).toBe('Pretendido')
    expect(m.faixa[1].rotulo).toBe('Anúncio real')
    expect(m.faixa[2].rotulo).toMatch(/^Mercado/)
    expect(m.faixa[3].rotulo).toBe('Fechamento')
    expect(m.faixa.map((f) => f.rotulo).join('|')).not.toMatch(/Co-âncora/)
  })
  it('Mercado em faixa (headline) ou ponto de referência', () => {
    if (m.faixa[2].faixa) {
      expect(m.faixa[2].valor).toBeNull()
      expect(m.faixa[2].faixa).toEqual(COMPUTATION.headline.mercado)
    } else {
      expect(m.faixa[2].valor).toBe(COMPUTATION.headline.referencia.valorMercado)
    }
  })
  it('Fechamento usa faixa (meta do consultor) e é destaque', () => {
    expect(m.faixa[3].faixa).toEqual({ min: 10_000_000, max: 10_500_000 })
    expect(m.faixa[3].destaque).toBe(true)
  })
})

describe('buildResumoModel — Top comparáveis', () => {
  const m = buildResumoModel(COMPUTATION, SOURCE, INPUT)

  it('5 linhas', () => expect(m.topComparaveis).toHaveLength(5))
  it('#1 = Chiaffarelli com ★★★ e fonte', () => {
    const r1 = m.topComparaveis[0]
    expect(r1.rank).toBe(1)
    expect(r1.estrelas).toBe('★★★')
    expect(r1.endereco).toBe('R. Maestro Chiaffarelli, 86')
    expect(r1.construido).toBe(466)
    expect(r1.terreno).toBe(1058)
    expect(r1.fonte).toBe('ITBImap (consulta SQL)')
  })
  it('#4 cai para ★', () => expect(m.topComparaveis[3].estrelas).toBe('★'))
  it('R$/m² terreno derivado quando ausente (preço/terreno)', () => {
    // Chiaffarelli: 6.5M / 1058 ≈ 6.143,67
    expect(m.topComparaveis[0].precoM2Terreno).toBeCloseTo(6143.67, 1)
  })
})

describe('buildResumoModel — sensibilidade e conclusão', () => {
  const m = buildResumoModel(COMPUTATION, SOURCE, INPUT)

  it('3 cenários com rótulos da referência', () => {
    expect(m.sensibilidade.map((s) => s.cenario)).toEqual([
      'Todos os 23 negociáveis',
      'Top 5 (mais aderentes)',
      'Top 3 (mais aderentes)',
    ])
  })
  it('conclusão tem 6 linhas', () => expect(m.conclusao).toHaveLength(6))
  it('valor de mercado da conclusão usa headline em faixa (H-4)', () => {
    if (COMPUTATION.headline.mercado.min !== COMPUTATION.headline.mercado.max) {
      expect(m.conclusao[2].valor).toBeNull()
      expect(m.conclusao[2].faixa).toEqual(COMPUTATION.headline.mercado)
    } else {
      expect(m.conclusao[2].valor).toBe(COMPUTATION.headline.referencia.valorMercado)
    }
  })
  it('linha de co-âncora cita o lote', () =>
    expect(m.conclusao[3].rotulo).toContain('1.000 m²'))
  it('parecer menciona anúncio recomendado e due diligence', () => {
    expect(m.parecer).toContain('R$ 11.500.000')
    expect(m.parecer).toContain('due diligence')
  })
})

describe('buildResumoModel — robustez (n<5, campos NULL)', () => {
  // 2 comparáveis, sem terreno/distância, sem fatores nem residual → co-âncora null
  const comparaveisPequeno = HONDURAS_COMPARAVEIS.slice(0, 2).map((c) => ({
    ...c,
    areaTerreno: null,
    distancia: null,
    precoPedido: null,
  }))
  const compPequeno = computeLaudo({
    target: HONDURAS_TARGET,
    comparaveis: comparaveisPequeno,
  })
  const sourcePequeno: ResumoSourceComparable[] = comparaveisPequeno.map((c) => ({
    endereco: c.endereco,
    areaConstruida: c.areaConstruida,
    areaTerreno: null,
    preco: c.preco,
  }))
  const inputMin: ResumoInput = {
    enderecoAlvo: 'Rua Teste',
    areaConstruida: 300,
    areaTerreno: 400,
    dataEmissao: '01/01/2026',
  }

  it('não lança e ainda monta as seções', () => {
    expect(() => buildResumoModel(compPequeno, sourcePequeno, inputMin)).not.toThrow()
    const m = buildResumoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.topComparaveis.length).toBeLessThanOrEqual(2)
    expect(m.conclusao).toHaveLength(6)
    expect(m.faixa).toHaveLength(4)
  })
  it('sem residual: capa sem card co-âncora; bullet sem co-âncora', () => {
    const m = buildResumoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.faixa.map((f) => f.rotulo).join('|')).not.toMatch(/Co-âncora/)
    expect(m.sintese.bullets.some((b) => b.includes('co-âncora'))).toBe(false)
  })
  it('terreno NULL → coluna de terreno "—" (null) no Top', () => {
    const m = buildResumoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.topComparaveis[0].terreno).toBeNull()
  })
  it('programa ausente → null', () => {
    const m = buildResumoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.ficha.programa).toBeNull()
  })
  it('mapaUrl ausente → null', () => {
    const m = buildResumoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.mapaUrl).toBeNull()
  })
  it('meta de fechamento default = faixaFechamento computada', () => {
    const m = buildResumoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.faixa[3].faixa).toEqual(compPequeno.faixaFechamento)
  })
})

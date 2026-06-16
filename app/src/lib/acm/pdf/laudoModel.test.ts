import { describe, it, expect } from 'vitest'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import { buildLaudoModel, type LaudoSourceComparable, type LaudoInput } from './laudoModel'

/** Comparáveis da fixture → fonte rica do laudo (Sec. 5 + 7.1). */
const SOURCE: LaudoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c, i) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: c.isVendaReal ? 'ITBImap' : 'Portal',
  fonteRef: `PMSP-${String(i).padStart(4, '0')}`,
  codigoRef: `PMSP-${String(i).padStart(4, '0')}`,
  bairro: 'Jardim América',
  suites: 3,
  vagas: 4,
  dormitorios: 4,
  sqlCadastral: `140720${String(i).padStart(4, '0')}`,
  statusAnuncio: c.precoPedido != null ? 'anúncio confirmado' : 'off-market',
  fonteAnuncio: c.isVendaReal ? 'ITBImap (consulta SQL)' : 'Portal',
  isVendaReal: c.isVendaReal,
}))

const COMPUTATION = computeLaudo({
  target: HONDURAS_TARGET,
  comparaveis: HONDURAS_COMPARAVEIS,
  fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
  residual: HONDURAS_RESIDUAL,
})

const INPUT: LaudoInput = {
  enderecoAlvo: 'Rua Honduras',
  bairro: 'Jardim América',
  proprietario: 'Clarisia Ramos',
  areaConstruida: 800,
  areaTerreno: 1000,
  programa: { dormitorios: 4, suites: 2, vagas: 10 },
  classeTexto: 'Necessita Ajustes / Retrofit Leve',
  precoPretendido: 12_000_000,
  precoPedidoReal: 10_500_000,
  precoAnuncioRecomendado: 11_500_000,
  metaFechamento: { min: 10_000_000, max: 10_500_000 },
  dataEmissao: '09/06/2026',
  refAnuncioReal: 'Cheznous, ref. 73232',
  residualParams: HONDURAS_RESIDUAL,
}

describe('buildLaudoModel — header e faixa', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('header com proprietário, localização e programa', () => {
    expect(m.header.proprietario).toBe('Clarisia Ramos')
    expect(m.header.localizacao).toBe('Rua Honduras')
    expect(m.header.bairro).toBe('Jardim América')
    expect(m.header.programa.construido).toBe(800)
    expect(m.header.programa.terreno).toBe(1000)
    expect(m.header.programa.dormSuites).toBe('4 dorm · 2 suítes')
    expect(m.header.programa.garagem).toBe('10 vagas')
  })
  it('Score do alvo = B (computado pela 8.2)', () => expect(m.header.score).toBe('B'))
  it('data de emissão injetada', () => expect(m.header.dataEmissao).toBe('09/06/2026'))
  it('faixa de 5 cards na ordem da referência', () => {
    expect(m.faixa.map((f) => f.rotulo)).toEqual([
      'Pretendido',
      'Anúncio real',
      'Mercado (ACM)',
      'Co-âncora terreno',
      'Fechamento',
    ])
    expect(m.faixa[2].valor).toBe(COMPUTATION.valorMercado)
    expect(m.faixa[3].valor).toBe(COMPUTATION.coAncoraTerreno)
    expect(m.faixa[4].destaque).toBe(true)
  })
})

describe('buildLaudoModel — números vêm da 8.2 (zero recálculo)', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('Sec. 1 usa valorMercado e valorFechamento computados', () => {
    expect(m.sec1.valorMercado.valor).toBe(COMPUTATION.valorMercado)
    expect(m.sec1.fechamentoEstrategico.valor).toBe(COMPUTATION.valorFechamento)
  })
  it('Sec. 9 espelha os 3 cenários de sensibilidade da 8.2', () => {
    expect(m.sec9.cenarios).toHaveLength(3)
    expect(m.sec9.cenarios[0].cenario).toBe('Todos os 23 negociáveis')
    expect(m.sec9.cenarios[0].valorMercado).toBe(COMPUTATION.sensibilidade[0].valorMercado)
    expect(m.sec9.cenarios[0].valorFechamento).toBe(COMPUTATION.sensibilidade[0].valorFechamento)
  })
  it('Sec. 10 tabela com 6 linhas e co-âncora = residual computado', () => {
    expect(m.sec10.tabela).toHaveLength(6)
    expect(m.sec10.tabela[3].valor).toBe(COMPUTATION.coAncoraTerreno)
  })
})

describe('buildLaudoModel — Sec. 7 Top N + rastreabilidade', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('Top 5 ordenado por aderência (8.2)', () => {
    expect(m.sec7.linhas).toHaveLength(5)
    expect(m.sec7.linhas[0].rank).toBe(1)
    expect(m.sec7.linhas[0].faixa).toBe('Top 3')
    expect(m.sec7.linhas[3].faixa).toBe('Top 5')
  })
  it('rastreabilidade (7.1) traça SQL/status/fonte por comparável', () => {
    expect(m.sec7.rastreabilidade.linhas).toHaveLength(5)
    expect(m.sec7.rastreabilidade.linhas[0].sql).toMatch(/^140720/)
    expect(m.sec7.rastreabilidade.linhas[0].fonte).toContain('ITBImap')
  })
  it('deságio medido vem da 8.2 quando há anúncio recuperado', () => {
    expect(COMPUTATION.desagioMedidoPercent).not.toBeNull()
    expect(m.sec7.rastreabilidade.desagios.length).toBeGreaterThan(0)
  })
})

describe('buildLaudoModel — Sec. 5 tabela completa', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('tabela completa = todos os comparáveis', () => {
    expect(m.sec5.linhas).toHaveLength(HONDURAS_COMPARAVEIS.length)
  })
  it('Top 3 marcados com ★★★ e Top 4–5 com ★', () => {
    const top3 = m.sec5.linhas.filter((l) => l.topMark === '★★★')
    const top45 = m.sec5.linhas.filter((l) => l.topMark === '★')
    expect(top3).toHaveLength(3)
    expect(top45).toHaveLength(2)
  })
  it('R$/m² construído derivado de preço/área quando ausente', () => {
    const chiaffarelli = m.sec5.linhas.find((l) => l.bairroRua.includes('Chiaffarelli'))
    // 6.5M / 466 ≈ 13.948
    expect(chiaffarelli?.precoM2Construido).toBeCloseTo(13948.5, 0)
  })
})

describe('buildLaudoModel — Sec. 8 terreno (residual + efeito-escala)', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('breakdown do residual reusa ResidualLandParams e fecha na co-âncora', () => {
    expect(m.sec8.residual.length).toBeGreaterThan(0)
    const total = m.sec8.residual.find((r) => r.total)
    expect(total?.valor).toBe(COMPUTATION.coAncoraTerreno)
  })
  it('efeito-escala = 3 faixas da 8.2', () => {
    expect(m.sec8.escala).toHaveLength(3)
    expect(m.sec8.escala[2].faixa).toContain('800')
  })
  it('métricas de terreno trazem min/p25/mediana/p75/máx', () => {
    expect(m.sec8.metricas).toHaveLength(2)
    const area = m.sec8.metricas[0]
    expect(area.min).not.toBeNull()
    expect(area.max).not.toBeNull()
    expect((area.max as number) >= (area.min as number)).toBe(true)
  })
})

describe('buildLaudoModel — todas as 10 seções presentes', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('snapshot estrutural das seções', () => {
    expect(m.sumario.objetivos.length).toBeGreaterThanOrEqual(4)
    expect(m.sec1.parecerTecnico).toContain('Score B')
    expect(m.sec2.fatores).toHaveLength(4)
    expect(m.sec3.indice).toHaveLength(5)
    expect(m.sec4.criterios.length).toBeGreaterThanOrEqual(5)
    expect(m.sec4.regua).toHaveLength(4)
    expect(m.sec5.linhas.length).toBe(23)
    expect(m.sec6).toBeDefined()
    expect(m.sec7.motivos.length).toBeGreaterThan(0)
    expect(m.sec8.perfis.length).toBeGreaterThan(0)
    expect(m.sec9.cenarios).toHaveLength(3)
    expect(m.sec10.condicionantes.length).toBeGreaterThan(0)
    expect(m.sec10.parecerFinal).toContain('R$')
  })
})

describe('buildLaudoModel — robustez (n<5, campos NULL, sem residual)', () => {
  const comparaveisPequeno = HONDURAS_COMPARAVEIS.slice(0, 2).map((c) => ({
    ...c,
    areaTerreno: null,
    distancia: null,
    precoPedido: null,
  }))
  const compPequeno = computeLaudo({ target: HONDURAS_TARGET, comparaveis: comparaveisPequeno })
  const sourcePequeno: LaudoSourceComparable[] = comparaveisPequeno.map((c) => ({
    endereco: c.endereco,
    areaConstruida: c.areaConstruida,
    areaTerreno: null,
    preco: c.preco,
  }))
  const inputMin: LaudoInput = {
    enderecoAlvo: 'Rua Teste',
    areaConstruida: 300,
    areaTerreno: 400,
    dataEmissao: '01/01/2026',
  }

  it('não lança e monta as 10 seções', () => {
    expect(() => buildLaudoModel(compPequeno, sourcePequeno, inputMin)).not.toThrow()
    const m = buildLaudoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.sec5.linhas.length).toBeLessThanOrEqual(2)
    expect(m.sec10.tabela).toHaveLength(6)
    expect(m.faixa).toHaveLength(5)
  })
  it('co-âncora null → faixa card null e sem breakdown residual', () => {
    const m = buildLaudoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.faixa[3].valor).toBeNull()
    expect(m.sec8.residual).toHaveLength(0)
  })
  it('terreno NULL → métricas de terreno vazias (null), sem quebrar', () => {
    const m = buildLaudoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.sec8.metricas[0].min).toBeNull()
  })
  it('programa ausente → dormSuites/garagem null', () => {
    const m = buildLaudoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.header.programa.dormSuites).toBeNull()
    expect(m.header.programa.garagem).toBeNull()
  })
  it('meta de fechamento default = faixaFechamento computada', () => {
    const m = buildLaudoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.faixa[4].faixa).toEqual(compPequeno.faixaFechamento)
  })
})

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
    // Story 9.10: headline em faixa — card Mercado (ACM) reporta min–max dos cenários.
    expect(m.faixa[2].valor).toBeNull()
    expect(m.faixa[2].faixa).toEqual(COMPUTATION.headline.mercado)
    expect(m.faixa[3].valor).toBe(COMPUTATION.coAncoraTerreno)
    expect(m.faixa[4].destaque).toBe(true)
  })
})

describe('buildLaudoModel — headline em faixa (Story 9.10, decisão founder 06-Jul)', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('Sec. 1: valor de mercado em faixa, com referência aderente e teto na nota', () => {
    expect(m.sec1.valorMercado.valor).toBeNull()
    expect(m.sec1.valorMercado.faixa).toEqual(COMPUTATION.headline.mercado)
    expect(m.sec1.valorMercado.nota).toContain('cenário aderente Top 3')
    expect(m.sec1.valorMercado.nota).toContain('teto: todos os 23')
  })
  it('Sec. 10: linha de valor de mercado vira faixa na tabela de conclusão', () => {
    const row = m.sec10.tabela[2]
    expect(row.rotulo).toContain('Valor de mercado')
    expect(row.valor).toBeNull()
    expect(row.faixa).toEqual(COMPUTATION.headline.mercado)
  })
  it('textos-template reportam faixa + referência (sumário, parecer, Sec. 10 intro)', () => {
    const faixaMercado = COMPUTATION.headline.mercado
    expect(faixaMercado.min).toBeLessThan(faixaMercado.max)
    expect(m.sumario.paragrafo).toContain('cenário aderente Top 3')
    expect(m.sec1.parecerTecnico).toContain('cenário aderente Top 3')
    expect(m.sec10.intro).toContain('cenário aderente Top 3')
  })
  it('Sec. 9: leitura registra a política de headline (aderente = referência, amplo = teto)', () => {
    expect(m.sec9.leitura).toContain('recorte aderente (Top 3)')
    expect(m.sec9.leitura).toContain('teto')
  })
  it('headline nunca é o cenário de maior valor como ponto único (auditoria §3.1)', () => {
    expect(m.faixa[2].valor).not.toBe(COMPUTATION.headline.teto.valorMercado)
    expect(m.sec1.valorMercado.valor).not.toBe(COMPUTATION.headline.teto.valorMercado)
  })
})

describe('buildLaudoModel — números vêm da 8.2 (zero recálculo)', () => {
  const m = buildLaudoModel(COMPUTATION, SOURCE, INPUT)

  it('Sec. 1 usa headline/valorFechamento computados (zero recálculo)', () => {
    expect(m.sec1.valorMercado.faixa).toEqual(COMPUTATION.headline.mercado)
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

describe('buildLaudoModel — homogeneização 1.3 (Story 9.11: bairro real + deflação)', () => {
  const SERIE = [
    { mes: '2024-06', indice: 100 },
    { mes: '2026-06', indice: 120 },
  ]
  const comparaveisHomog = HONDURAS_COMPARAVEIS.map((c, i) => ({
    ...c,
    bairroReal: i < 16 ? 'Jardim Paulista' : 'Jardim América',
    dataVenda: '2024-06',
  }))
  const compHomog = computeLaudo({
    target: HONDURAS_TARGET,
    comparaveis: comparaveisHomog,
    fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
    homogeneizacao: { indice: 'FipeZap', serie: SERIE, dataReferencia: '2026-06' },
  })
  const m = buildLaudoModel(compHomog, SOURCE, INPUT)

  it('Sec. 3: composição por bairro real verificado substitui o texto genérico', () => {
    expect(m.sec3.composicaoBairro).toContain('bairro real verificado via CEP')
    expect(m.sec3.composicaoBairro).toContain('Jardim Paulista — 16 comparáveis')
    expect(m.sec3.composicaoBairro).toContain('Jardim América — 7 comparáveis')
  })
  it('Sec. 4: critério de atualização temporal registrado quando deflação aplicada', () => {
    const row = m.sec4.criterios.find((c) => c.criterio === 'Atualização temporal')
    expect(row).toBeDefined()
    expect(row!.parametro).toContain('FipeZap')
    expect(row!.parametro).toContain('2026-06')
    expect(row!.justificativa).toContain('23 de 23 comparáveis ajustados')
  })
  it('sem homogeneização → texto genérico e sem critério temporal (legado intacto)', () => {
    const mLegado = buildLaudoModel(COMPUTATION, SOURCE, INPUT)
    expect(mLegado.sec3.composicaoBairro).toContain('microrregião de valorização homogênea')
    expect(mLegado.sec4.criterios.some((c) => c.criterio === 'Atualização temporal')).toBe(false)
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
  it('cenários coincidentes (n≤3) → headline degenera para ponto único, sem faixa', () => {
    expect(compPequeno.headline.mercado.min).toBe(compPequeno.headline.mercado.max)
    const m = buildLaudoModel(compPequeno, sourcePequeno, inputMin)
    expect(m.faixa[2].faixa).toBeNull()
    expect(m.faixa[2].valor).toBe(compPequeno.headline.referencia.valorMercado)
    expect(m.sec1.valorMercado.faixa).toBeNull()
    expect(m.sec1.valorMercado.nota).toContain('/m²')
  })
})

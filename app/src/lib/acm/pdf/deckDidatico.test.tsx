import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { computeLaudo } from '@/lib/acm/methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from '@/lib/acm/honduras.fixture'
import type { LaudoSourceComparable } from './laudoModel'
import { buildDeckModel, type DeckInput } from './deckModel'
import { buildDidaticoModel, type DidaticoInput } from './didaticoModel'
import { DeckDocument } from './DeckDocument'
import { DidaticoDocument } from './DidaticoDocument'

const SOURCE: LaudoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c, i) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: 'ITBImap',
  codigoRef: `PMSP-${String(i).padStart(4, '0')}`,
  sqlCadastral: `140720${String(i).padStart(4, '0')}`,
  statusAnuncio: c.precoPedido != null ? 'anúncio confirmado' : 'off-market',
  fonteAnuncio: 'ITBImap (consulta SQL)',
  isVendaReal: c.isVendaReal,
}))

const COMPUTATION = computeLaudo({
  target: HONDURAS_TARGET,
  comparaveis: HONDURAS_COMPARAVEIS,
  fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
  residual: HONDURAS_RESIDUAL,
})

const BASE = {
  enderecoAlvo: 'Rua Honduras',
  bairro: 'Jardim América',
  proprietario: 'Clarisia Ramos',
  areaConstruida: 800,
  areaTerreno: 1000,
  programa: { dormitorios: 4, suites: 2, vagas: 10 },
  precoPretendido: 12_000_000,
  precoPedidoReal: 10_500_000,
  precoAnuncioRecomendado: 11_500_000,
  metaFechamento: { min: 10_000_000, max: 10_500_000 },
  dataEmissao: '09/06/2026',
  residualParams: HONDURAS_RESIDUAL,
}

describe('buildDeckModel — consistência com a 8.2 (AC3)', () => {
  const m = buildDeckModel(COMPUTATION, SOURCE, BASE as DeckInput)
  it('usa os mesmos números do laudo', () => {
    expect(m.duasFrentes.usuario.valor).toBe(COMPUTATION.valorFechamento)
    expect(m.duasFrentes.terreno.valor).toBe(COMPUTATION.coAncoraTerreno)
    expect(m.recomendacao.meta).toEqual(BASE.metaFechamento)
  })
  it('Top 5 da sensibilidade reflete a 8.2', () => {
    expect(m.sensibilidade.cenarios).toHaveLength(3)
    expect(m.sensibilidade.cenarios[0].valorMercado).toBe(COMPUTATION.sensibilidade[0].valorMercado)
    expect(m.topComparaveis).toHaveLength(5)
  })
  it('nota da sensibilidade reporta mercado em faixa H-3 via headline (H-4)', () => {
    expect(m.sensibilidade.nota).toMatch(/Mercado R\$ /)
    if (COMPUTATION.headline.mercado.min !== COMPUTATION.headline.mercado.max) {
      expect(m.sensibilidade.nota).toContain('referência')
    }
  })
  it('institucional templado presente', () => {
    expect(m.pauta.length).toBeGreaterThanOrEqual(7)
    expect(m.remaxMundo.length).toBe(3)
    expect(m.diferenciais.length).toBe(4)
  })
})

describe('buildDidaticoModel — fórmula = pesos reais (AC2/AC3)', () => {
  const m = buildDidaticoModel(COMPUTATION, SOURCE, BASE as DidaticoInput)
  it('fórmula de aderência usa os pesos 50/20/30 da metodologia', () => {
    expect(m.parte1.aderencia.formula).toContain('0,5')
    expect(m.parte1.aderencia.formula).toContain('0,2')
    expect(m.parte1.aderencia.formula).toContain('0,3')
  })
  it('Score régua com 4 níveis e efeito-escala com 3 faixas', () => {
    expect(m.parte1.score.regua).toHaveLength(4)
    expect(m.parte2.terreno.faixas).toHaveLength(3)
  })
  it('validação Top 10 traça SQL/status/fonte', () => {
    expect(m.parte4.top.length).toBe(10)
    expect(m.parte4.top[0].sql).toMatch(/^140720/)
  })
  it('sensibilidade espelha a 8.2', () => {
    expect(m.parte2.sensibilidade.cenarios[0].valorFechamento).toBe(COMPUTATION.sensibilidade[0].valorFechamento)
  })
  it('mercado reportado em faixa H-3 via headline, não ponto (H-4)', () => {
    expect(m.parte2.construido).toContain('reportado em faixa')
    expect(m.parte2.sensibilidade.nota).toContain('mercado em')
    if (COMPUTATION.headline.mercado.min !== COMPUTATION.headline.mercado.max) {
      expect(m.parte2.construido).toContain('referência')
    }
  })
})

describe('DeckDocument / DidaticoDocument — render (AC6)', () => {
  it('deck (paisagem) Honduras completo → %PDF-', async () => {
    const model = buildDeckModel(COMPUTATION, SOURCE, BASE as DeckInput)
    const buf = await renderToBuffer(<DeckDocument model={model} />)
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)

  it('didático (retrato) Honduras completo → %PDF-', async () => {
    const model = buildDidaticoModel(COMPUTATION, SOURCE, BASE as DidaticoInput)
    const buf = await renderToBuffer(<DidaticoDocument model={model} />)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)

  it('amostra pequena (n=2, NULL, sem mapa/residual) não quebra deck nem didático', async () => {
    const pequeno = HONDURAS_COMPARAVEIS.slice(0, 2).map((c) => ({
      ...c,
      areaTerreno: null,
      distancia: null,
      precoPedido: null,
    }))
    const comp = computeLaudo({ target: HONDURAS_TARGET, comparaveis: pequeno })
    const src: LaudoSourceComparable[] = pequeno.map((c) => ({
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: null,
      preco: c.preco,
    }))
    const input = { enderecoAlvo: 'Rua Teste', areaConstruida: 300, areaTerreno: 400, dataEmissao: '01/01/2026' }
    const deck = await renderToBuffer(<DeckDocument model={buildDeckModel(comp, src, input as DeckInput)} />)
    const did = await renderToBuffer(<DidaticoDocument model={buildDidaticoModel(comp, src, input as DidaticoInput)} />)
    expect(deck.subarray(0, 5).toString()).toBe('%PDF-')
    expect(did.subarray(0, 5).toString()).toBe('%PDF-')
  }, 30_000)
})

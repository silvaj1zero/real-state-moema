import { describe, it, expect } from 'vitest'
import { computeLaudo } from './methodology'
import {
  calcularIndiceBairro,
  INDICE_BAIRRO_BANDA_DEFAULT_PCT,
  triangularComIndiceBairro,
} from './indiceBairro'
import { buildLaudoModel, type LaudoSourceComparable } from './pdf/laudoModel'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('indiceBairro (Story 9.27 C-3)', () => {
  it('AC1 — agrega por bairro×tipologia', () => {
    const idx = calcularIndiceBairro([
      { bairroReal: 'Moema', tipologia: 'casa', preco: 2_000_000, areaConstruida: 200 },
      { bairroReal: 'Moema', tipologia: 'casa', preco: 2_200_000, areaConstruida: 200 },
      { bairroReal: 'Moema', tipologia: 'apartamento', preco: 1_000_000, areaConstruida: 100 },
      { bairroReal: 'Vila Olímpia', tipologia: 'casa', preco: 3_000_000, areaConstruida: 200 },
    ])
    expect(idx.porBairro.length).toBe(3)
    const moemaCasa = idx.porBairro.find((l) => l.bairro === 'Moema' && l.tipologia === 'casa')!
    expect(moemaCasa.n).toBe(2)
    expect(moemaCasa.medianaPrecoM2).toBe(10_500)
  })

  it('AC4 — opt-in: sem índice → inerte', () => {
    const t = triangularComIndiceBairro(null, {
      bairroAlvo: 'Moema',
      tipologiaAlvo: 'casa',
      headlinePrecoM2: 11_000,
    })
    expect(t.aplicada).toBe(false)
    expect(t.aviso).toBeNull()
  })

  it('AC2/AC5 — coerente vs incoerente', () => {
    const idx = calcularIndiceBairro([
      { bairroReal: 'Moema', tipologia: 'casa', preco: 2_000_000, areaConstruida: 200 },
      { bairroReal: 'Moema', tipologia: 'casa', preco: 2_000_000, areaConstruida: 200 },
    ])
    const ok = triangularComIndiceBairro(idx, {
      bairroAlvo: 'Moema',
      tipologiaAlvo: 'casa',
      headlinePrecoM2: 10_500, // +5% vs 10k
      bandaPct: INDICE_BAIRRO_BANDA_DEFAULT_PCT,
    })
    expect(ok.aplicada).toBe(true)
    expect(ok.incoerente).toBe(false)
    expect(ok.aviso).toBeNull()

    const bad = triangularComIndiceBairro(idx, {
      bairroAlvo: 'Moema',
      tipologiaAlvo: 'casa',
      headlinePrecoM2: 15_000, // +50%
      bandaPct: 20,
    })
    expect(bad.incoerente).toBe(true)
    expect(bad.aviso?.codigo).toBe('bairro_incoerente')
    expect(bad.notaFundamentacao).toMatch(/triangulação de coerência/i)
  })

  it('AC3 — nunca âncora: buildLaudoModel com/sem índice (toggle real)', () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    const source: LaudoSourceComparable[] = HONDURAS_COMPARAVEIS.map((c) => ({
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: c.areaTerreno ?? null,
      preco: c.preco,
      distancia: c.distancia ?? null,
      isVendaReal: c.isVendaReal,
    }))
    const baseInput = {
      enderecoAlvo: 'Rua Honduras',
      bairro: 'Jardim América',
      areaConstruida: 800,
      areaTerreno: 1000,
      dataEmissao: '10/07/2026',
    }

    // Índice sintético FORA da banda (headline Honduras ~18k/m² vs índice 5k)
    const indice = calcularIndiceBairro([
      {
        bairroReal: 'Jardim América',
        tipologia: 'casa',
        preco: 5_000_000,
        areaConstruida: 1_000,
      },
      {
        bairroReal: 'Jardim América',
        tipologia: 'casa',
        preco: 5_000_000,
        areaConstruida: 1_000,
      },
    ])

    const off = buildLaudoModel(computation, source, baseInput)
    const on = buildLaudoModel(computation, source, {
      ...baseInput,
      indiceBairro: indice,
      tipologiaAlvoIndice: 'casa',
      bairroAlvoIndice: 'Jardim América',
    })

    // Números-âncora do model (vêm do computation) idênticos com índice ON/OFF
    expect(on.sec1.valorMercado.faixa).toEqual(off.sec1.valorMercado.faixa)
    expect(on.sec1.valorMercado.valor).toBe(off.sec1.valorMercado.valor)
    expect(on.faixa.map((f) => f.faixa ?? f.valor)).toEqual(off.faixa.map((f) => f.faixa ?? f.valor))
    expect(on.sec9.cenarios.map((c) => c.valorMercado)).toEqual(
      off.sec9.cenarios.map((c) => c.valorMercado),
    )
    expect(on.triangulacaoBairro.aplicada).toBe(true)
    expect(off.triangulacaoBairro.aplicada).toBe(false)
    // Índice ligado: nota de triangulação na fundamentação; sem mudar headline
    expect(on.sec10.fundamentacao.some((s) => /triangulação de coerência/i.test(s))).toBe(true)
    expect(off.sec10.fundamentacao.some((s) => /triangulação de coerência/i.test(s))).toBe(false)
  })
})

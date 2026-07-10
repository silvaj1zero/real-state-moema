/**
 * Story 9.12 — travas da ingestão H-1 (série FipeZap real + datas/CEPs dos 23).
 * Falha aqui = dado ingerido divergiu do contrato do mecanismo (Story 9.11) ou
 * da cobertura 1:1 com o fixture congelado.
 */
import { describe, expect, it } from 'vitest'

import { computeLaudo } from '../methodology'
import {
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_TARGET,
} from '../honduras.fixture'
import {
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from './fipezapSpVendaResidencial'
import {
  HONDURAS_ALVO_CEP,
  HONDURAS_HOMOGENEIZACAO,
  HONDURAS_VENDAS,
  hondurasComparaveisHomogeneizados,
} from './hondurasVendas'

describe('série FipeZap SP venda residencial (Story 9.12 AC1)', () => {
  it('cobre 2024-01 até a última competência publicada, sem buracos', () => {
    expect(FIPEZAP_SP_VENDA_RESIDENCIAL[0].mes).toBe('2024-01')
    expect(FIPEZAP_SP_VENDA_RESIDENCIAL.at(-1)?.mes).toBe(FIPEZAP_SP_ULTIMA_COMPETENCIA)
    for (let i = 1; i < FIPEZAP_SP_VENDA_RESIDENCIAL.length; i++) {
      const [ano, mes] = FIPEZAP_SP_VENDA_RESIDENCIAL[i - 1].mes.split('-').map(Number)
      const seguinte = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`
      expect(FIPEZAP_SP_VENDA_RESIDENCIAL[i].mes).toBe(seguinte)
    }
  })

  it('todos os pontos têm formato YYYY-MM e índice positivo', () => {
    for (const p of FIPEZAP_SP_VENDA_RESIDENCIAL) {
      expect(p.mes).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
      expect(p.indice).toBeGreaterThan(0)
    }
  })
})

describe('registros de venda dos 23 comparáveis (Story 9.12 AC2/AC3)', () => {
  it('cobre 1:1 os endereços do fixture, sem duplicatas', () => {
    const registros = new Set(HONDURAS_VENDAS.map((v) => v.endereco))
    const fixture = new Set(HONDURAS_COMPARAVEIS.map((c) => c.endereco))
    expect(HONDURAS_VENDAS).toHaveLength(23)
    expect(registros.size).toBe(23)
    expect(registros).toEqual(fixture)
  })

  it('dataVenda é a competência da dataTransacao e existe na série FipeZap', () => {
    const meses = new Set(FIPEZAP_SP_VENDA_RESIDENCIAL.map((p) => p.mes))
    for (const v of HONDURAS_VENDAS) {
      expect(v.dataTransacao.startsWith(v.dataVenda)).toBe(true)
      expect(v.dataTransacao).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(meses.has(v.dataVenda)).toBe(true)
    }
  })

  it('SQLs são únicos e os do Top 5 batem com o laudo Sec. 7.1', () => {
    const sqls = HONDURAS_VENDAS.map((v) => v.sql)
    expect(new Set(sqls).size).toBe(23)
    const porEndereco = new Map(HONDURAS_VENDAS.map((v) => [v.endereco, v.sql]))
    expect(porEndereco.get('R. Maestro Chiaffarelli, 86')).toBe('1407200046')
    expect(porEndereco.get('R. Marechal Bitencourt, 101')).toBe('1613200226')
    expect(porEndereco.get('R. Cons. Torres Homem, 399')).toBe('1608500314')
    expect(porEndereco.get('R. Henrique Martins')).toBe('3609200431')
    expect(porEndereco.get('R. Canadá, 111')).toBe('1405400056')
  })

  it('composição por bairro real (CEP): 16 JP + 5 JA + 2 JE; alvo é Jardim Paulista', () => {
    const contagem = new Map<string, number>()
    for (const v of HONDURAS_VENDAS) {
      expect(v.cep).toMatch(/^\d{5}-\d{3}$/)
      contagem.set(v.bairroReal, (contagem.get(v.bairroReal) ?? 0) + 1)
    }
    expect(contagem.get('Jardim Paulista')).toBe(16)
    expect(contagem.get('Jardim América')).toBe(5)
    expect(contagem.get('Jardim Europa')).toBe(2)
    expect(HONDURAS_ALVO_CEP.bairroReal).toBe('Jardim Paulista')
  })
})

describe('merge com o fixture + computeLaudo homogeneizado (Story 9.12 AC4)', () => {
  it('enriquece os 23 sem alterar os campos congelados do fixture', () => {
    const enriquecidos = hondurasComparaveisHomogeneizados()
    expect(enriquecidos).toHaveLength(23)
    enriquecidos.forEach((c, i) => {
      const base = HONDURAS_COMPARAVEIS[i]
      expect(c.endereco).toBe(base.endereco)
      expect(c.preco).toBe(base.preco)
      expect(c.areaConstruida).toBe(base.areaConstruida)
      expect(c.dataVenda).toBeTruthy()
      expect(c.bairroReal).toBeTruthy()
    })
  })

  it('computeLaudo aplica a deflação a 23/23 (semAjuste vazio, fatores ≥ 1)', () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: hondurasComparaveisHomogeneizados(),
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      homogeneizacao: HONDURAS_HOMOGENEIZACAO,
    })
    expect(computation.homogeneizacao.aplicada).toBe(true)
    expect(computation.homogeneizacao.semAjuste).toEqual([])
    expect(computation.homogeneizacao.ajustes).toHaveLength(23)
    // Série crescente com referência na última competência → deflação só corrige para cima.
    for (const ajuste of computation.homogeneizacao.ajustes) {
      expect(ajuste.fator).toBeGreaterThanOrEqual(1)
      expect(ajuste.precoAjustado).toBeGreaterThanOrEqual(ajuste.precoOriginal)
    }
  })

  it('composição por bairro no computation reflete a apuração por CEP', () => {
    const computation = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: hondurasComparaveisHomogeneizados(),
      homogeneizacao: HONDURAS_HOMOGENEIZACAO,
    })
    expect(
      computation.composicaoBairros.map(({ bairro, n }) => ({ bairro, n })),
    ).toEqual([
      { bairro: 'Jardim Paulista', n: 16 },
      { bairro: 'Jardim América', n: 5 },
      { bairro: 'Jardim Europa', n: 2 },
    ])
  })

  it('deságio medido permanece invariante à deflação (AC2 da Story 9.11)', () => {
    const sem = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: hondurasComparaveisHomogeneizados(),
    })
    const com = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: hondurasComparaveisHomogeneizados(),
      homogeneizacao: HONDURAS_HOMOGENEIZACAO,
    })
    expect(com.desagioMedidoPercent).toBe(sem.desagioMedidoPercent)
  })
})

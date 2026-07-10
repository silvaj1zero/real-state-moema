import { describe, it, expect } from 'vitest'

import { computeLaudo, type AcmComparable } from '@/lib/acm/methodology'
import { FIPEZAP_SP_ULTIMA_COMPETENCIA } from '@/lib/acm/data/fipezapSpVendaResidencial'
import { buildComputeOptions } from './computeOptions'

/** Amostra mínima de fechamentos reais para o cálculo (aderência simples). */
const comparaveis: AcmComparable[] = [
  { endereco: 'Rua A, 100', areaConstruida: 200, areaTerreno: 300, preco: 2_000_000, distancia: 120, isVendaReal: true, dataVenda: '2024-01' },
  { endereco: 'Rua B, 200', areaConstruida: 210, areaTerreno: 320, preco: 2_100_000, distancia: 180, isVendaReal: true, dataVenda: '2024-06' },
  { endereco: 'Rua C, 300', areaConstruida: 205, areaTerreno: 310, preco: 2_050_000, distancia: 220, isVendaReal: true, dataVenda: '2025-01' },
]

const baseForm = {
  areaConstruida: 200,
  areaTerreno: 300,
  homogeneizacaoAtiva: false,
} as const

describe('buildComputeOptions', () => {
  it('AC6 — formulário mínimo é paridade com o target puro (backward-compat)', () => {
    const slice = buildComputeOptions({ ...baseForm })
    // Sem endereço/vagas/preço/estado, o target não ganha campos extras.
    expect(slice.target).toEqual({ areaConstruida: 200, areaTerreno: 300 })
    expect(slice.homogeneizacao).toBeUndefined()
    expect(slice.propertyType).toBeUndefined()

    const puro = computeLaudo({ target: { areaConstruida: 200, areaTerreno: 300 }, comparaveis, raio: 1000 })
    const viaHelper = computeLaudo({ ...slice, comparaveis, raio: 1000 })
    expect(viaHelper.valorMercado).toBe(puro.valorMercado)
    expect(viaHelper.headline.mercado).toEqual(puro.headline.mercado)
    expect(viaHelper.homogeneizacao.aplicada).toBe(false)
  })

  it('AC1 — endereço/vagas/preço pretendido alimentam o guard-rail (auto-referência)', () => {
    // Comparável que É o próprio alvo: mesma rua + distância < 50 m (R1).
    const comComAlvo: AcmComparable[] = [
      ...comparaveis,
      { endereco: 'Rua Alvo, 129', areaConstruida: 200, areaTerreno: 300, preco: 5_000_000, distancia: 10, isVendaReal: true },
    ]
    const slice = buildComputeOptions({
      ...baseForm,
      endereco: 'Rua Alvo, 123',
      vagas: 2,
      precoPretendido: 5_000_000,
    })
    expect(slice.target.endereco).toBe('Rua Alvo, 123')
    expect(slice.target.vagas).toBe(2)
    expect(slice.target.precoPretendido).toBe(5_000_000)

    const computation = computeLaudo({ ...slice, comparaveis: comComAlvo, raio: 1000 })
    expect(computation.autoReferenciasExcluidas.length).toBeGreaterThan(0)
    expect(computation.autoReferenciasExcluidas.some((f) => f.endereco.includes('Rua Alvo'))).toBe(true)
  })

  it('AC2 — homogeneização ON aplica a série FipeZap na competência de referência', () => {
    const slice = buildComputeOptions({ ...baseForm, homogeneizacaoAtiva: true })
    expect(slice.homogeneizacao?.dataReferencia).toBe(FIPEZAP_SP_ULTIMA_COMPETENCIA)

    const computation = computeLaudo({ ...slice, comparaveis, raio: 1000 })
    expect(computation.homogeneizacao.aplicada).toBe(true)
    expect(computation.homogeneizacao.dataReferencia).toBe(FIPEZAP_SP_ULTIMA_COMPETENCIA)
    // Todos têm dataVenda → todos deflacionados (nenhum em semAjuste).
    expect(computation.homogeneizacao.ajustes.length).toBe(3)
    expect(computation.homogeneizacao.semAjuste.length).toBe(0)
  })

  it('AC2 — homogeneização OFF mantém aplicada=false', () => {
    const slice = buildComputeOptions({ ...baseForm, homogeneizacaoAtiva: false })
    const computation = computeLaudo({ ...slice, comparaveis, raio: 1000 })
    expect(computation.homogeneizacao.aplicada).toBe(false)
  })

  it('AC2 — comparáveis sem dataVenda entram em semAjuste (comportamento 9.11)', () => {
    const semData: AcmComparable[] = comparaveis.map((c) => ({ ...c, dataVenda: null }))
    const slice = buildComputeOptions({ ...baseForm, homogeneizacaoAtiva: true })
    const computation = computeLaudo({ ...slice, comparaveis: semData, raio: 1000 })
    expect(computation.homogeneizacao.semAjuste.length).toBe(3)
    expect(computation.homogeneizacao.ajustes.length).toBe(0)
  })

  it('AC3 — estado C aplica deságio de −7,5% no computation', () => {
    const slice = buildComputeOptions({ ...baseForm, estadoConservacao: 'C' })
    expect(slice.target.estadoConservacao).toBe('C')
    const computation = computeLaudo({ ...slice, comparaveis, raio: 1000 })
    expect(computation.desagioTratado.estadoConservacao).toBe('C')
    expect(computation.desagioTratado.desagioEstadoPct).toBeCloseTo(0.075, 5)
  })

  it('AC3 — estado ausente não escolhe deságio (faixa conservadora 9.14)', () => {
    const slice = buildComputeOptions({ ...baseForm })
    const computation = computeLaudo({ ...slice, comparaveis, raio: 1000 })
    expect(computation.desagioTratado.desagioEstadoPct).toBeNull()
    expect(computation.desagioTratado.cenarioAplicado).toBeNull()
  })

  it('AC4 — propertyType alimenta o gate R5 (opt-in)', () => {
    const slice = buildComputeOptions({ ...baseForm, propertyType: 'casa' })
    expect(slice.propertyType).toBe('casa')
    const computation = computeLaudo({ ...slice, comparaveis, raio: 1000 })
    expect(computation.r5.aplicado).toBe(true)
  })
})

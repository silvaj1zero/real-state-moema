import { describe, it, expect } from 'vitest'
import { computeLaudo, desagioMedido } from './methodology'
import {
  avisoDesagioForaPrior,
  desagioMedidoGraduado,
  extractDoorNumber,
  validarAnuncioVenda,
} from './validacaoAnuncio'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('validarAnuncioVenda (Story 9.26 C-5)', () => {
  it('extractDoorNumber', () => {
    expect(extractDoorNumber('R. Marechal Bitencourt, 101')).toBe('101')
    expect(extractDoorNumber('R DR X 110')).toBe('110')
    expect(extractDoorNumber('R. Henrique Martins')).toBeNull()
  })

  it('AC1 — confirmado: número + área', () => {
    const r = validarAnuncioVenda(
      { endereco: 'R. Teste, 10', areaConstruida: 100, preco: 900_000 },
      { endereco: 'R. Teste, 10', area: 100, precoPedido: 1_000_000 },
    )
    expect(r.nivel).toBe('confirmado')
    expect(r.pistas).toEqual(expect.arrayContaining(['numero_porta', 'mesma_rua']))
    expect(r.desagioReal).toBeCloseTo(0.1, 4)
  })

  it('AC1 — parcial: mesma rua sem número', () => {
    const r = validarAnuncioVenda(
      { endereco: 'R. Teste, 10', areaConstruida: 100, preco: 900_000 },
      { endereco: 'R. Teste, 99', precoPedido: 1_000_000 },
    )
    expect(r.nivel).toBe('parcial')
    expect(r.desagioReal).toBeNull()
  })

  it('AC1 — nao_recuperavel: sem anúncio', () => {
    const r = validarAnuncioVenda(
      { endereco: 'R. Teste, 10', areaConstruida: 100, preco: 900_000 },
      null,
    )
    expect(r.nivel).toBe('nao_recuperavel')
    expect(r.pistas).toEqual([])
  })

  it('AC2 — desagioMedidoGraduado zero drift Honduras vs desagioMedido', () => {
    const legado = desagioMedido(HONDURAS_COMPARAVEIS)
    const g = desagioMedidoGraduado(HONDURAS_COMPARAVEIS)
    expect(g.percent).toBe(legado)
    expect(g.nConfirmado).toBeGreaterThanOrEqual(2)
  })

  it('AC2 — computeLaudo desagioMedidoPercent zero drift', () => {
    const r = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    expect(r.desagioMedidoPercent).toBe(desagioMedido(HONDURAS_COMPARAVEIS))
    expect(r.desagioGraduado.nConfirmado).toBeGreaterThanOrEqual(0)
    // passaporte C-5 aditivo nos que têm precoPedido
    const comPedido = r.passaportes.filter((p) => p.confiancaC5 != null)
    expect(comPedido.length).toBeGreaterThanOrEqual(2)
  })

  it('AC3 — prior SP: aviso quando fora da banda 8–12%', () => {
    expect(avisoDesagioForaPrior(-10)).toBeNull() // 10% dentro
    expect(avisoDesagioForaPrior(-12.7)?.codigo).toBe('desagio_fora_prior_sp')
    expect(avisoDesagioForaPrior(-5)?.severidade).toBe('info')
    expect(avisoDesagioForaPrior(null)).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { computeLaudo, type AcmComparable } from '@/lib/acm/methodology'
import { AcmAvisosPanel, headlineFaixaTexto } from './AcmAvisosPanel'
import { buildComputeOptions } from './computeOptions'

const comparaveis: AcmComparable[] = [
  { endereco: 'Rua A, 100', areaConstruida: 200, areaTerreno: 300, preco: 2_000_000, distancia: 120, isVendaReal: true, dataVenda: '2024-01' },
  { endereco: 'Rua B, 200', areaConstruida: 210, areaTerreno: 320, preco: 2_400_000, distancia: 180, isVendaReal: true, dataVenda: '2024-06' },
  { endereco: 'Rua C, 300', areaConstruida: 205, areaTerreno: 310, preco: 2_050_000, distancia: 220, isVendaReal: true, dataVenda: '2025-01' },
]

describe('AcmAvisosPanel', () => {
  it('AC5 — exibe o headline em faixa no formato H-3 "Mercado R$ X–Y (referência Z)"', () => {
    const computation = computeLaudo({
      target: { areaConstruida: 200, areaTerreno: 300 },
      comparaveis,
      raio: 1000,
    })
    render(React.createElement(AcmAvisosPanel, { computation }))
    const headline = screen.getByTestId('acm-headline-faixa').textContent ?? ''
    expect(headline).toMatch(/^Mercado R\$/)
    // Formato faixa quando os cenários divergem: contém "referência".
    if (computation.headline.mercado.min !== computation.headline.mercado.max) {
      expect(headline).toContain('referência')
      expect(headline).toContain('–')
    }
  })

  it('headlineFaixaTexto colapsa em ponto único quando min === max', () => {
    const computation = computeLaudo({
      target: { areaConstruida: 200, areaTerreno: 300 },
      comparaveis,
      raio: 1000,
    })
    const forced = {
      ...computation,
      headline: { ...computation.headline, mercado: { min: 1_000_000, max: 1_000_000 } },
    }
    const texto = headlineFaixaTexto(forced)
    expect(texto).not.toContain('–')
    expect(texto).not.toContain('referência')
  })

  it('AC1 — quando há auto-referências excluídas, exibe contagem + endereço + motivo', () => {
    const comComAlvo: AcmComparable[] = [
      ...comparaveis,
      { endereco: 'Rua Alvo, 129', areaConstruida: 200, areaTerreno: 300, preco: 5_000_000, distancia: 10, isVendaReal: true },
    ]
    const computation = computeLaudo({
      ...buildComputeOptions({
        areaConstruida: 200,
        areaTerreno: 300,
        endereco: 'Rua Alvo, 123',
        vagas: 2,
        precoPretendido: 5_000_000,
        homogeneizacaoAtiva: false,
      }),
      comparaveis: comComAlvo,
      raio: 1000,
    })
    expect(computation.autoReferenciasExcluidas.length).toBeGreaterThan(0)

    render(React.createElement(AcmAvisosPanel, { computation }))
    const bloco = screen.getByTestId('acm-auto-referencias')
    expect(bloco.textContent).toContain('Rua Alvo')
    expect(bloco.textContent).toMatch(/excluído/i)
  })

  it('não renderiza o bloco de auto-referência quando não há exclusões', () => {
    const computation = computeLaudo({
      target: { areaConstruida: 200, areaTerreno: 300 },
      comparaveis,
      raio: 1000,
    })
    render(React.createElement(AcmAvisosPanel, { computation }))
    expect(screen.queryByTestId('acm-auto-referencias')).toBeNull()
  })
})

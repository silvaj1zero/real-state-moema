import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./OwnerLookupModal', () => ({
  OwnerLookupModal: () => <div data-testid="owner-modal" />,
}))

import { OwnerLookupButton, isResidencialTipologia } from './OwnerLookupButton'

const baseProps = {
  edificioId: 'e1',
  edificioNome: 'Ed. X',
  endereco: 'Rua Y, 1',
  consultantId: 'c1',
}

describe('isResidencialTipologia (AC1 — adaptação ao schema real)', () => {
  it('residencial_*/misto/desconhecida → true', () => {
    expect(isResidencialTipologia('residencial_vertical')).toBe(true)
    expect(isResidencialTipologia('residencial_horizontal')).toBe(true)
    expect(isResidencialTipologia('misto')).toBe(true)
    expect(isResidencialTipologia(null)).toBe(true)
    expect(isResidencialTipologia(undefined)).toBe(true)
  })

  it('comercial/outro → false', () => {
    expect(isResidencialTipologia('comercial')).toBe(false)
    expect(isResidencialTipologia('outro')).toBe(false)
  })
})

describe('OwnerLookupButton', () => {
  it('renderiza com tooltip de custo e aria-label (AC1/AC9)', () => {
    render(<OwnerLookupButton {...baseProps} tipologia="residencial_vertical" />)
    const btn = screen.getByRole('button', { name: /Consultar proprietário via cartório/ })
    expect(btn.getAttribute('title')).toBe('Consulta cartório (R$0,28)')
    expect(screen.getByText('Quem é o dono?')).toBeTruthy()
  })

  it('não renderiza para edifício comercial (AC1)', () => {
    const { container } = render(<OwnerLookupButton {...baseProps} tipologia="comercial" />)
    expect(container.innerHTML).toBe('')
  })

  it('abre o modal ao clicar', () => {
    render(<OwnerLookupButton {...baseProps} tipologia="misto" />)
    screen.getByRole('button').click()
    expect(screen.findByTestId('owner-modal')).toBeTruthy()
  })
})

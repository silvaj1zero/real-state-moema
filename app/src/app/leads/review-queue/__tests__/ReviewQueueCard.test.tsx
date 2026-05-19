import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewQueueCard, type ReviewQueueListing } from '@/components/ReviewQueueCard'

const submitReviewDecision = vi.fn()
const revealPhone = vi.fn()

vi.mock('@/app/leads/review-queue/actions', () => ({
  submitReviewDecision: (...args: unknown[]) => submitReviewDecision(...args),
  revealPhone: (...args: unknown[]) => revealPhone(...args),
}))

const baseListing: ReviewQueueListing = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  portal: 'zap',
  external_id: 'zap-123',
  url: 'https://www.zapimoveis.com.br/imovel/zap-123',
  endereco: 'Rua das Flores, 100',
  bairro: 'Moema',
  preco: 1_250_000,
  area_m2: 85,
  quartos: 2,
  tipologia: 'Apartamento',
  classification: 'for_sale_by_owner',
  classification_confidence: 0.55,
  classification_signals: ['ddd_mobile', 'no_creci_match', 'single_listing'],
  created_at: '2026-05-14T10:00:00Z',
}

describe('ReviewQueueCard — Story 7.8 AC3/AC4', () => {
  beforeEach(() => {
    submitReviewDecision.mockReset()
    revealPhone.mockReset()
  })

  it('renders portal label + external_id (AC3)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    expect(screen.getByText('Zap')).toBeInTheDocument()
    expect(screen.getByText('zap-123')).toBeInTheDocument()
  })

  it('renders address + bairro + formatted price (AC3)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    expect(screen.getByText('Rua das Flores, 100')).toBeInTheDocument()
    expect(screen.getByText('Moema')).toBeInTheDocument()
    // Brazilian currency uses period as thousand separator; we just assert key digits
    expect(screen.getByText(/1\.250\.000/)).toBeInTheDocument()
  })

  it('renders area, quartos, tipologia (AC3)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    expect(screen.getByText('85 m²')).toBeInTheDocument()
    expect(screen.getByText('2 quartos')).toBeInTheDocument()
    expect(screen.getByText('Apartamento')).toBeInTheDocument()
  })

  it('renders classification badge with confidence percent (AC3)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    expect(screen.getByText('for_sale_by_owner')).toBeInTheDocument()
    expect(screen.getByText(/55%/)).toBeInTheDocument()
  })

  it('renders classification signals as chips (AC3)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    expect(screen.getByText('ddd_mobile')).toBeInTheDocument()
    expect(screen.getByText('no_creci_match')).toBeInTheDocument()
    expect(screen.getByText('single_listing')).toBeInTheDocument()
  })

  it('renders link to original portal opening in new tab (AC3)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    const link = screen.getByRole('link', { name: /anúncio original/i })
    expect(link).toHaveAttribute(
      'href',
      'https://www.zapimoveis.com.br/imovel/zap-123'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders 3 action buttons with aria-labels (AC4 + AC9)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    expect(
      screen.getByRole('button', { name: /confirmar como fisbo/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /marcar como imobiliária/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /descartar este anúncio/i })
    ).toBeInTheDocument()
  })

  it('calls submitReviewDecision with confirmed_fisbo (AC4)', async () => {
    submitReviewDecision.mockResolvedValueOnce({
      ok: true,
      data: { listingId: baseListing.id, action: 'confirmed_fisbo' },
    })
    render(<ReviewQueueCard listing={baseListing} />)
    fireEvent.click(
      screen.getByRole('button', { name: /confirmar como fisbo/i })
    )
    await waitFor(() =>
      expect(submitReviewDecision).toHaveBeenCalledWith({
        listingId: baseListing.id,
        action: 'confirmed_fisbo',
      })
    )
  })

  it('shows decided state after action succeeds', async () => {
    submitReviewDecision.mockResolvedValueOnce({
      ok: true,
      data: { listingId: baseListing.id, action: 'discarded' },
    })
    render(<ReviewQueueCard listing={baseListing} />)
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }))
    await waitFor(() =>
      expect(screen.getByTestId('card-decided')).toBeInTheDocument()
    )
  })

  it('shows error message when action fails', async () => {
    submitReviewDecision.mockResolvedValueOnce({
      ok: false,
      error: 'db down',
    })
    render(<ReviewQueueCard listing={baseListing} />)
    fireEvent.click(
      screen.getByRole('button', { name: /confirmar como fisbo/i })
    )
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('db down')
    )
  })

  it('opens reveal-phone modal on click (AC3 LGPD gate)', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    fireEvent.click(
      screen.getByRole('button', { name: /revelar telefone/i })
    )
    expect(screen.getByTestId('reveal-modal')).toBeInTheDocument()
    expect(screen.getByText(/aviso lgpd/i)).toBeInTheDocument()
  })

  it('disables Revelar button until consent checkbox is checked', () => {
    render(<ReviewQueueCard listing={baseListing} />)
    fireEvent.click(
      screen.getByRole('button', { name: /revelar telefone/i })
    )
    const revealBtn = screen.getByRole('button', { name: 'Revelar' })
    expect(revealBtn).toBeDisabled()
    fireEvent.click(
      screen.getByLabelText(/confirmar consentimento lgpd/i)
    )
    expect(revealBtn).not.toBeDisabled()
  })

  it('calls revealPhone with consent=true after acknowledging (AC3 + AC10)', async () => {
    revealPhone.mockResolvedValueOnce({
      ok: true,
      data: { listingId: baseListing.id },
    })
    render(<ReviewQueueCard listing={baseListing} />)
    fireEvent.click(
      screen.getByRole('button', { name: /revelar telefone/i })
    )
    fireEvent.click(
      screen.getByLabelText(/confirmar consentimento lgpd/i)
    )
    fireEvent.click(screen.getByRole('button', { name: 'Revelar' }))
    await waitFor(() =>
      expect(revealPhone).toHaveBeenCalledWith({
        listingId: baseListing.id,
        consent: true,
      })
    )
  })

  it('handles null endereco / preco / area gracefully', () => {
    render(
      <ReviewQueueCard
        listing={{
          ...baseListing,
          endereco: null,
          preco: null,
          area_m2: null,
          quartos: null,
          tipologia: null,
        }}
      />
    )
    expect(screen.getByText('Endereço não informado')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

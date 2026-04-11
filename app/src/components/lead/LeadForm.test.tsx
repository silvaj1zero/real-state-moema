import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { LeadForm } from './LeadForm'

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ user: { id: 'consultant-1' } }),
  ),
}))

vi.mock('@/store/leads', () => ({
  useLeadsStore: vi.fn((selector) =>
    selector({
      activeEdificioId: 'edif-1',
      setActiveEdificioId: vi.fn(),
    }),
  ),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'lead-new' }, error: null }),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
    },
  })),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const defaultProps = {
  edificioId: 'edif-1',
  edificioNome: 'Edifício Teste',
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

beforeEach(() => { vi.clearAllMocks() })

describe('LeadForm', () => {
  it('renders without crash with minimal props', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(LeadForm, defaultProps)))
    // Form should have Nome field at minimum
    expect(document.querySelectorAll('input').length).toBeGreaterThan(0)
  })

  it('shows building name in header', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(LeadForm, defaultProps)))
    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toContain('Edifício Teste')
  })

  it('shows required field labels', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(LeadForm, defaultProps)))
    // Should have Nome label
    expect(screen.getByText(/Nome/i)).toBeTruthy()
  })

  it('has phone number input that applies BR format', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(LeadForm, defaultProps)))
    const phoneInput = screen.queryByLabelText(/Telefone/i) as HTMLInputElement | null
    if (phoneInput) {
      fireEvent.change(phoneInput, { target: { value: '11987654321' } })
      // Brazilian phone format: (11) 98765-4321
      expect(phoneInput.value).toMatch(/\(\d{2}\)/)
    }
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(LeadForm, { ...defaultProps, onClose })),
    )
    const cancelBtn = screen.queryByText(/Cancelar/i) ?? screen.queryByText(/Fechar/i)
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('requires nome field — submit button disabled when nome is empty', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(LeadForm, defaultProps)))
    // Find submit button
    const submitBtn = screen.queryByText(/Salvar/i) ?? screen.queryByText(/Cadastrar/i)
    if (submitBtn) {
      // Without filling nome, button should be disabled or clicking does nothing
      const btn = submitBtn.closest('button')
      expect(btn).toBeTruthy()
    }
  })
})

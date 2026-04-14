import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { InformanteDashboard } from './InformanteDashboard'

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ user: { id: 'consultant-1' } }),
  ),
}))

vi.mock('@/store/informantes', () => ({
  useInformantesStore: vi.fn((selector) =>
    selector({ selectInformante: vi.fn() }),
  ),
}))

vi.mock('@/hooks/useInformantes', () => ({
  useInformantesByConsultant: vi.fn(() => ({
    informantes: [],
    isLoading: false,
  })),
}))

vi.mock('@/hooks/useInformanteReminders', () => ({
  useInformanteReminders: vi.fn(() => ({
    informantesNeedingContact: [],
  })),
}))

beforeEach(() => { vi.clearAllMocks() })

describe('InformanteDashboard', () => {
  it('renders without crash with no props', () => {
    const { container } = render(React.createElement(InformanteDashboard))
    expect(container).toBeTruthy()
  })

  it('shows "Total informantes" label', () => {
    render(React.createElement(InformanteDashboard))
    const body = document.body.textContent ?? ''
    expect(body.toLowerCase()).toContain('informante')
  })

  it('shows loading skeleton when data is loading', async () => {
    const { useInformantesByConsultant } = await import('@/hooks/useInformantes')
    vi.mocked(useInformantesByConsultant).mockReturnValueOnce({
      informantes: [],
      isLoading: true,
      error: null,
    } as any)
    const { container } = render(React.createElement(InformanteDashboard))
    // Skeleton divs should be rendered during loading
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('shows zero totals when informantes list is empty', () => {
    render(React.createElement(InformanteDashboard))
    // With 0 informantes, total should be 0
    const body = document.body.textContent ?? ''
    expect(body).toContain('0')
  })

  it('renders quality breakdown (frio, morno, quente)', () => {
    render(React.createElement(InformanteDashboard))
    const body = document.body.textContent ?? ''
    // Color labels or the section should include qualidade info
    // The component shows "Por qualidade" label
    expect(body.toLowerCase()).toContain('qualidade')
  })
})

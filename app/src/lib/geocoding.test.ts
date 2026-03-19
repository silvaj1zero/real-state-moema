import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for geocoding tests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import after mock
const { geocodeAddress } = await import('./geocoding')

describe('geocodeAddress', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'test-token-123')
    mockFetch.mockReset()
  })

  it('should geocode a valid address', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            center: [-46.66, -23.59],
            place_name: 'Rua Canario, 123 - Moema, Sao Paulo',
            relevance: 0.95,
          },
        ],
      }),
    })

    const result = await geocodeAddress('Rua Canario, 123 - Moema')

    expect(result).not.toBeNull()
    expect(result!.lat).toBe(-23.59)
    expect(result!.lng).toBe(-46.66)
    expect(result!.placeName).toBe('Rua Canario, 123 - Moema, Sao Paulo')
    expect(result!.confidence).toBe(0.95)
  })

  it('should return null when no results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    })

    const result = await geocodeAddress('Endereco Inexistente')
    expect(result).toBeNull()
  })

  it('should return null on API error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 })

    const result = await geocodeAddress('Qualquer endereco')
    expect(result).toBeNull()
  })

  it('should include Moema bbox in request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    })

    await geocodeAddress('Test address')

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('bbox=-46.68,-23.62,-46.63,-23.57')
    expect(calledUrl).toContain('country=br')
    expect(calledUrl).toContain('limit=1')
  })
})

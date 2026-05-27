import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ReviewActionSchema,
  ReviewDecisionSchema,
  BulkReviewDecisionSchema,
  RevealPhoneInputSchema,
} from '../schemas'

// =============================================================================
// Pure schema validation tests (no Supabase mock needed)
// =============================================================================

describe('Zod schemas — Story 7.8 AC6', () => {
  describe('ReviewActionSchema', () => {
    it('accepts all 6 valid actions', () => {
      const actions = [
        'confirmed_fisbo',
        'confirmed_other',
        'rejected_is_broker',
        'rejected_is_construtora',
        'discarded',
        'skipped',
      ]
      for (const a of actions) {
        expect(ReviewActionSchema.safeParse(a).success).toBe(true)
      }
    })

    it('rejects unknown action', () => {
      expect(ReviewActionSchema.safeParse('approved').success).toBe(false)
    })
  })

  describe('ReviewDecisionSchema', () => {
    it('requires UUID listingId', () => {
      const r = ReviewDecisionSchema.safeParse({
        listingId: 'not-a-uuid',
        action: 'confirmed_fisbo',
      })
      expect(r.success).toBe(false)
    })

    it('accepts valid UUID + action', () => {
      const r = ReviewDecisionSchema.safeParse({
        listingId: '11111111-2222-4333-8444-555555555555',
        action: 'discarded',
      })
      expect(r.success).toBe(true)
    })

    it('accepts optional notes <= 500 chars', () => {
      const r = ReviewDecisionSchema.safeParse({
        listingId: '11111111-2222-4333-8444-555555555555',
        action: 'confirmed_fisbo',
        notes: 'curta nota',
      })
      expect(r.success).toBe(true)
    })

    it('rejects notes > 500 chars', () => {
      const r = ReviewDecisionSchema.safeParse({
        listingId: '11111111-2222-4333-8444-555555555555',
        action: 'confirmed_fisbo',
        notes: 'x'.repeat(501),
      })
      expect(r.success).toBe(false)
    })
  })

  describe('BulkReviewDecisionSchema', () => {
    const id = '11111111-2222-4333-8444-555555555555'

    it('requires at least 1 id', () => {
      const r = BulkReviewDecisionSchema.safeParse({
        listingIds: [],
        action: 'discarded',
      })
      expect(r.success).toBe(false)
    })

    it('accepts 1-50 ids', () => {
      const r = BulkReviewDecisionSchema.safeParse({
        listingIds: [id, id],
        action: 'discarded',
      })
      expect(r.success).toBe(true)
    })

    it('rejects > 50 ids', () => {
      const r = BulkReviewDecisionSchema.safeParse({
        listingIds: Array(51).fill(id),
        action: 'discarded',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('RevealPhoneInputSchema', () => {
    it('requires consent=true literal', () => {
      const r = RevealPhoneInputSchema.safeParse({
        listingId: '11111111-2222-4333-8444-555555555555',
        consent: false,
      })
      expect(r.success).toBe(false)
    })

    it('accepts consent=true', () => {
      const r = RevealPhoneInputSchema.safeParse({
        listingId: '11111111-2222-4333-8444-555555555555',
        consent: true,
      })
      expect(r.success).toBe(true)
    })
  })
})

// =============================================================================
// Server Action tests — mock supabase client
// =============================================================================

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockSupabase),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/lgpd-audit', () => ({
  logLGPDAccess: vi.fn(async () => undefined),
}))

describe('submitReviewDecision', () => {
  const VALID_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when input invalid', async () => {
    const { submitReviewDecision } = await import('../actions')
    const res = await submitReviewDecision({
      listingId: 'bad',
      // @ts-expect-error testing invalid input
      action: 'wrong',
    })
    expect(res.ok).toBe(false)
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const { submitReviewDecision } = await import('../actions')
    const res = await submitReviewDecision({
      listingId: VALID_ID,
      action: 'confirmed_fisbo',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/autenticado/i)
  })

  it('updates scraped_listings with decision + user + timestamp', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    mockSupabase.from.mockReturnValue({ update })

    const { submitReviewDecision } = await import('../actions')
    const res = await submitReviewDecision({
      listingId: VALID_ID,
      action: 'confirmed_fisbo',
    })

    expect(res.ok).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('scraped_listings')
    const payload = update.mock.calls[0][0]
    expect(payload.review_status).toBe('confirmed_fisbo')
    expect(payload.review_decided_by).toBe('user-1')
    expect(payload.review_decided_at).toEqual(expect.any(String))
    expect(eq).toHaveBeenCalledWith('id', VALID_ID)
  })

  it('returns error when supabase update fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db down' } })
    mockSupabase.from.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) })

    const { submitReviewDecision } = await import('../actions')
    const res = await submitReviewDecision({
      listingId: VALID_ID,
      action: 'discarded',
    })
    expect(res.ok).toBe(false)
  })
})

describe('submitBulkReviewDecision', () => {
  const VALID_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

  beforeEach(() => vi.clearAllMocks())

  it('updates many rows in single .in() call', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })
    const inFn = vi.fn().mockResolvedValue({ error: null, count: 3 })
    const update = vi.fn().mockReturnValue({ in: inFn })
    mockSupabase.from.mockReturnValue({ update })

    const { submitBulkReviewDecision } = await import('../actions')
    const res = await submitBulkReviewDecision({
      listingIds: [VALID_ID, VALID_ID, VALID_ID],
      action: 'discarded',
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.count).toBe(3)
    expect(inFn).toHaveBeenCalledWith('id', [VALID_ID, VALID_ID, VALID_ID])
  })
})

describe('revealPhone', () => {
  const VALID_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

  beforeEach(() => vi.clearAllMocks())

  it('rejects without consent', async () => {
    const { revealPhone } = await import('../actions')
    const res = await revealPhone({
      listingId: VALID_ID,
      // @ts-expect-error testing invalid input
      consent: false,
    })
    expect(res.ok).toBe(false)
  })

  it('logs LGPD audit + succeeds when consent=true', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })
    const audit = await import('@/lib/lgpd-audit')

    const { revealPhone } = await import('../actions')
    const res = await revealPhone({ listingId: VALID_ID, consent: true })

    expect(res.ok).toBe(true)
    expect(audit.logLGPDAccess).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        action: 'reveal_phone',
        legalBasis: 'legitimate_interest',
        userId: 'user-1',
        listingId: VALID_ID,
      })
    )
  })

  it('returns error when audit log throws', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })
    const audit = await import('@/lib/lgpd-audit')
    vi.mocked(audit.logLGPDAccess).mockRejectedValueOnce(
      new Error('audit failed')
    )

    const { revealPhone } = await import('../actions')
    const res = await revealPhone({ listingId: VALID_ID, consent: true })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/audit failed/)
  })
})

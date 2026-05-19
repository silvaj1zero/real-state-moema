'use server'

/**
 * Server Actions — Review Queue (Story 7.8 AC4 / AC6).
 *
 * Server Actions over API Routes: chosen for tighter coupling to RSC page,
 * automatic CSRF protection, and zero extra fetch boilerplate from client.
 * UPDATEs run under the user's auth session — RLS enforces row visibility.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logLGPDAccess } from '@/lib/lgpd-audit'

// =============================================================================
// Zod schemas (AC6)
// =============================================================================

export const ReviewActionSchema = z.enum([
  'confirmed_fisbo',
  'confirmed_other',
  'rejected_is_broker',
  'rejected_is_construtora',
  'discarded',
  'skipped',
])

export type ReviewAction = z.infer<typeof ReviewActionSchema>

export const ReviewDecisionSchema = z.object({
  listingId: z.string().uuid({ message: 'listingId deve ser UUID' }),
  action: ReviewActionSchema,
  notes: z.string().max(500).optional(),
})

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>

export const BulkReviewDecisionSchema = z.object({
  listingIds: z
    .array(z.string().uuid())
    .min(1, 'Selecione ao menos 1 anúncio')
    .max(50, 'Máximo 50 por batch'),
  action: ReviewActionSchema,
})

export type BulkReviewDecision = z.infer<typeof BulkReviewDecisionSchema>

export const RevealPhoneInputSchema = z.object({
  listingId: z.string().uuid(),
  consent: z.literal(true, {
    message: 'É preciso confirmar o consentimento LGPD para revelar telefone.',
  }),
})

export type RevealPhoneInput = z.infer<typeof RevealPhoneInputSchema>

// =============================================================================
// Action result envelope
// =============================================================================

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// =============================================================================
// submitReviewDecision — single card decision (AC4)
// =============================================================================

export async function submitReviewDecision(
  raw: ReviewDecision
): Promise<ActionResult<{ listingId: string; action: ReviewAction }>> {
  const parsed = ReviewDecisionSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Input inválido' }
  }

  const { listingId, action, notes } = parsed.data
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Não autenticado' }
  }

  const { error } = await supabase
    .from('scraped_listings')
    .update({
      review_status: action,
      review_decided_by: user.id,
      review_decided_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', listingId)

  if (error) {
    return { ok: false, error: `Falha ao salvar decisão: ${error.message}` }
  }

  revalidatePath('/leads/review-queue')
  return { ok: true, data: { listingId, action } }
}

// =============================================================================
// submitBulkReviewDecision — batch action (AC7)
// =============================================================================

export async function submitBulkReviewDecision(
  raw: BulkReviewDecision
): Promise<ActionResult<{ count: number }>> {
  const parsed = BulkReviewDecisionSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Input inválido' }
  }

  const { listingIds, action } = parsed.data
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Não autenticado' }
  }

  const { error, count } = await supabase
    .from('scraped_listings')
    .update(
      {
        review_status: action,
        review_decided_by: user.id,
        review_decided_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .in('id', listingIds)

  if (error) {
    return { ok: false, error: `Falha em batch: ${error.message}` }
  }

  revalidatePath('/leads/review-queue')
  return { ok: true, data: { count: count ?? listingIds.length } }
}

// =============================================================================
// revealPhone — LGPD-gated phone reveal (AC3 + AC10)
// =============================================================================

export async function revealPhone(
  raw: RevealPhoneInput
): Promise<ActionResult<{ listingId: string }>> {
  const parsed = RevealPhoneInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Consentimento ausente' }
  }

  const { listingId } = parsed.data
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Não autenticado' }
  }

  try {
    await logLGPDAccess(supabase, {
      userId: user.id,
      listingId,
      action: 'reveal_phone',
      legalBasis: 'legitimate_interest',
      evidence: {
        listing_id: listingId,
        source: 'review-queue',
        consent_acknowledged: true,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha no audit log'
    return { ok: false, error: message }
  }

  return { ok: true, data: { listingId } }
}

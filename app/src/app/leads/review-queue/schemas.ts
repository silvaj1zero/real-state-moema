/**
 * Zod schemas + types for Review Queue Server Actions (Story 7.8).
 *
 * Extracted from actions.ts: Next.js 15 enforces that `'use server'` files
 * may only export async functions at runtime. Zod schemas are runtime values
 * (non-async), so they must live in a regular module and be imported by
 * actions.ts. Types are erased at compile time but are colocated with their
 * schemas for cohesion.
 */

import { z } from 'zod'

// =============================================================================
// Action enum
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

// =============================================================================
// Single decision
// =============================================================================

export const ReviewDecisionSchema = z.object({
  listingId: z.string().uuid({ message: 'listingId deve ser UUID' }),
  action: ReviewActionSchema,
  notes: z.string().max(500).optional(),
})

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>

// =============================================================================
// Bulk decision
// =============================================================================

export const BulkReviewDecisionSchema = z.object({
  listingIds: z
    .array(z.string().uuid())
    .min(1, 'Selecione ao menos 1 anúncio')
    .max(50, 'Máximo 50 por batch'),
  action: ReviewActionSchema,
})

export type BulkReviewDecision = z.infer<typeof BulkReviewDecisionSchema>

// =============================================================================
// Phone reveal
// =============================================================================

export const RevealPhoneInputSchema = z.object({
  listingId: z.string().uuid(),
  consent: z.literal(true, {
    message: 'É preciso confirmar o consentimento LGPD para revelar telefone.',
  }),
})

export type RevealPhoneInput = z.infer<typeof RevealPhoneInputSchema>

// =============================================================================
// Action result envelope (shared)
// =============================================================================

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

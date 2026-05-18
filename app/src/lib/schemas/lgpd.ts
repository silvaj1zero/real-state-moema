/**
 * LGPD Zod schemas — Epic 7 Story 7.10.
 *
 * Self-contained schemas for the opt-out endpoint and admin processing.
 * TODO(7.1 follow-up): if story 7.1 publishes a shared "phone" / "email"
 * primitive, refactor to import from `@/lib/schemas/epic7/*`.
 */

import { z } from 'zod'

// E.164-ish — Brazilian phone format, tolerating common operator inputs.
// Accepts: +5511999998888, 5511999998888, 11999998888, (11) 99999-8888.
// Normalises to digits only on parse via .transform().
const PHONE_REGEX = /^[+\d()\s-]{8,20}$/

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_REGEX, 'Telefone inválido (use formato brasileiro com DDD)')
  .transform((s) => s.replace(/\D/g, ''))
  .refine((s) => s.length >= 10 && s.length <= 13, {
    message: 'Telefone deve ter entre 10 e 13 dígitos',
  })

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('E-mail inválido')

/**
 * POST /api/lgpd/opt-out payload.
 * At least one of `telefone` or `email` must be provided.
 */
export const optOutRequestSchema = z
  .object({
    telefone: phoneSchema.optional(),
    email: emailSchema.optional(),
    evidence: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => Boolean(data.telefone || data.email),
    {
      message: 'Forneça telefone OU email para identificar o titular',
      path: ['telefone'],
    }
  )

export type OptOutRequestInput = z.infer<typeof optOutRequestSchema>

/**
 * POST /api/admin/lgpd/process-opt-out payload.
 */
export const processOptOutSchema = z.object({
  protocol_number: z
    .string()
    .trim()
    .regex(/^OPT-\d{4}-\d{2}-\d{2}-[A-Z0-9]{4,8}$/, 'Protocol number malformed'),
})

export type ProcessOptOutInput = z.infer<typeof processOptOutSchema>

/**
 * Generates a protocol number for opt-out requests.
 * Format: `OPT-YYYY-MM-DD-XXXX` (XXXX = 4 hex chars random).
 */
export function generateProtocolNumber(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')
  return `OPT-${yyyy}-${mm}-${dd}-${rand}`
}

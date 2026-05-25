'use server'

/**
 * Server Actions — Validation Workshop (Story 7.9 AC2).
 *
 * Server Actions over API Routes: tight coupling com o RSC page, CSRF
 * automatico, e UPDATEs rodam sob a sessao do usuario logado (RLS
 * aplica). Guard de role=admin e feito no Server Component da pagina;
 * aqui repetimos a checagem como defense in depth.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// =============================================================================
// Schemas
// =============================================================================

export const LucianaDecisionSchema = z.enum([
  'is_fisbo',
  'not_fisbo',
  'unknown',
])

export type LucianaDecision = z.infer<typeof LucianaDecisionSchema>

export const SaveDecisionSchema = z.object({
  batchId: z.string().uuid({ message: 'batchId deve ser UUID' }),
  decision: LucianaDecisionSchema,
  notes: z.string().max(500).optional(),
})

export type SaveDecisionInput = z.infer<typeof SaveDecisionSchema>

// =============================================================================
// Action result envelope
// =============================================================================

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// =============================================================================
// saveDecision — grava decisao da Luciana sobre 1 card
// =============================================================================

export async function saveDecision(
  raw: SaveDecisionInput
): Promise<ActionResult<{ batchId: string; decision: LucianaDecision }>> {
  const parsed = SaveDecisionSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Input invalido',
    }
  }

  const { batchId, decision, notes } = parsed.data
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Nao autenticado' }
  }

  // Defense in depth — admin guard tambem na pagina.
  const role =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ??
    (user.user_metadata as Record<string, unknown> | undefined)?.role
  if (role !== 'admin') {
    return { ok: false, error: 'Apenas admins podem registrar decisoes' }
  }

  const { error } = await supabase
    .from('validation_batch_001')
    .update({
      luciana_decision: decision,
      luciana_notes: notes ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', batchId)

  if (error) {
    return { ok: false, error: `Falha ao salvar decisao: ${error.message}` }
  }

  revalidatePath('/admin/validation-workshop')
  return { ok: true, data: { batchId, decision } }
}

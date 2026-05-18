import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  optOutRequestSchema,
  generateProtocolNumber,
} from '@/lib/schemas/lgpd'

export const runtime = 'nodejs'

/**
 * POST /api/lgpd/opt-out — Epic 7 Story 7.10 AC5 (was AC3 in mission notes).
 *
 * Public endpoint. Anonymous callers submit telefone/email to request removal
 * of any leads matching those identifiers. Returns a protocol number for
 * tracking. SLA: 15 calendar days for manual processing by admin.
 *
 * Security:
 *   - No auth required (LGPD Art. 18 — direito do titular).
 *   - Validation enforced via Zod schema.
 *   - Audit log entry created for every accepted request.
 *   - Rate limiting deferred to Wave B (volume Wave A < 10/mo, manual review).
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parsed = optOutRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_failed',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    )
  }

  const { telefone, email, evidence } = parsed.data
  const protocolNumber = generateProtocolNumber()

  const supabase = createAdminClient()

  // Insert opt-out request (anonymous insert allowed via RLS policy).
  const { error: insertError } = await supabase
    .from('lgpd_opt_out_requests')
    .insert({
      protocol_number: protocolNumber,
      telefone: telefone ?? null,
      email: email ?? null,
      evidence: evidence ?? null,
      status: 'pending',
    })

  if (insertError) {
    return NextResponse.json(
      { error: 'failed_to_register_request', detail: insertError.message },
      { status: 500 }
    )
  }

  // Audit log — record opt-out request (no user_id; titular is anonymous).
  await supabase.from('lgpd_audit_log').insert({
    user_id: null,
    lead_id: null,
    action: 'opt_out_request',
    legal_basis: 'legal_obligation',
    evidence: {
      protocol_number: protocolNumber,
      has_phone: Boolean(telefone),
      has_email: Boolean(email),
      submitted_at: new Date().toISOString(),
    },
  })

  // 202 Accepted — request will be processed manually within SLA.
  return NextResponse.json(
    {
      protocol_number: protocolNumber,
      status: 'pending',
      sla_days: 15,
      message:
        'Solicitação registrada. O processamento será concluído em até 15 dias corridos. Guarde o número de protocolo.',
    },
    { status: 202 }
  )
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { processOptOutSchema } from '@/lib/schemas/lgpd'

export const runtime = 'nodejs'

/**
 * POST /api/admin/lgpd/process-opt-out — Epic 7 Story 7.10 AC6.
 *
 * Admin-only. Calls `fn_lgpd_process_opt_out(protocol_number)` which:
 *   1. Locks the opt-out request row.
 *   2. Iterates over `leads` matching telefone/email (via vault decrypt).
 *   3. Calls `fn_lgpd_anonymize_lead` for each match (purges vault secrets,
 *      anonymises the row, audits).
 *   4. Marks the opt-out request as completed.
 *
 * Returns: { protocol_number, matched, status }.
 */
export async function POST(request: Request) {
  // AuthN: must be authenticated via Supabase session.
  const userClient = await createServerSupabaseClient()
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // AuthZ: role=admin in JWT claims (or app_metadata.role).
  const roleClaim =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ??
    (user.user_metadata as Record<string, unknown> | undefined)?.role
  if (roleClaim !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = processOptOutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // Use service role for the RPC so RLS does not block reading vault secrets.
  // (The RPC itself is SECURITY DEFINER, but logging is cleaner via admin client.)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('fn_lgpd_process_opt_out', {
    p_protocol_number: parsed.data.protocol_number,
  })

  if (error) {
    return NextResponse.json(
      { error: 'process_failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 200 })
}

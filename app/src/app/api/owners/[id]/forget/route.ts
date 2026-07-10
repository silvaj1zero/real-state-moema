import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const idSchema = z.uuid()

/**
 * POST /api/owners/:id/forget — Story 6.6 (AC10, LGPD "esquecer dados").
 *
 * Chama fn_anonimize_owner_lookup (SECURITY INVOKER): o UPDATE passa pela
 * RLS, entao apenas o consultor dono da linha consegue anonimizar. Zera
 * nome, matricula, mascara do documento e raw_response.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userClient = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json(
      { error: 'validation_failed', message: 'id deve ser um UUID' },
      { status: 400 },
    )
  }

  const { data, error } = await userClient.rpc('fn_anonimize_owner_lookup', {
    p_id: parsedId.data,
  })

  if (error) {
    console.error('owner_lookup forget error:', error.message)
    return NextResponse.json({ error: 'forget_failed', message: error.message }, { status: 500 })
  }

  if (!data) {
    // RLS fez o UPDATE nao encontrar a linha: inexistente OU de outro consultor.
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  console.log(JSON.stringify({ event: 'owner_lookup_forget', lookup_id: parsedId.data }))
  return NextResponse.json({ forgotten: true })
}

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ownerLookupRequestSchema } from '@/lib/schemas/owner-lookup'
import { consultarCartorioArisp } from '@/lib/infosimples'
import { createSupabaseOwnerLookupStore } from '@/lib/owner-lookup-store'
import { executeOwnerLookup, ownerLookupConfigFromEnv } from '@/lib/owner-lookup-service'

export const runtime = 'nodejs'

/**
 * POST /api/owners/lookup — Story 6.6 (AC1).
 *
 * Body: { edificio_id } OU { sql_lote, endereco }.
 * Pipeline: resolve lote → cache 90d → rate limit (429) → budget (402) →
 * flag (503, fronteira da API paga) → Infosimples → persiste + feed.
 * Payload/status codes documentados em @/lib/schemas/owner-lookup.
 */
export async function POST(request: Request) {
  const userClient = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'validation_failed', message: 'JSON invalido' }, { status: 400 })
  }

  const parsed = ownerLookupRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_failed',
        message: 'Body deve ser { edificio_id } ou { sql_lote, endereco }',
      },
      { status: 400 },
    )
  }

  const input =
    'edificio_id' in parsed.data
      ? { consultantId: user.id, edificioId: parsed.data.edificio_id }
      : { consultantId: user.id, sqlLote: parsed.data.sql_lote, endereco: parsed.data.endereco }

  try {
    const start = Date.now()

    const outcome = await executeOwnerLookup(input, {
      store: createSupabaseOwnerLookupStore(userClient),
      consultar: (sqlLote) => consultarCartorioArisp(sqlLote),
      config: ownerLookupConfigFromEnv(),
    })

    switch (outcome.kind) {
      case 'ok':
        // Observabilidade (nota tecnica): log estruturado sem raw_response.
        console.log(
          JSON.stringify({
            event: 'owner_lookup',
            edificio_id: outcome.body.edificio_id,
            status: outcome.body.status,
            cache_hit: outcome.body.cache_hit,
            elapsed_ms: Date.now() - start,
            cost_brl: outcome.body.custo_brl,
          }),
        )
        return NextResponse.json(outcome.body, { status: outcome.httpStatus })

      case 'edificio_not_found':
        return NextResponse.json(
          { error: 'edificio_not_found', message: 'Edificio nao encontrado' },
          { status: 404 },
        )

      case 'sql_lote_unresolved':
        return NextResponse.json(
          {
            error: 'sql_lote_unresolved',
            message: 'Nao foi possivel resolver o SQL do lote (GeoSampa indisponivel ou sem lote no ponto)',
          },
          { status: 404 },
        )

      case 'rate_limited':
        return NextResponse.json(
          { error: 'rate_limit_exceeded', ...outcome.usage },
          { status: 429, headers: { 'Retry-After': String(outcome.retryAfterSeconds) } },
        )

      case 'budget_exceeded':
        return NextResponse.json(
          { error: 'budget_exceeded', ...outcome.usage },
          { status: 402 },
        )

      case 'disabled':
        return NextResponse.json(
          {
            error: 'owner_lookup_disabled',
            message: 'Consulta a cartorio desativada (aguardando contratacao da API Infosimples)',
            ...outcome.usage,
          },
          { status: 503 },
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('owner_lookup error:', message)
    return NextResponse.json({ error: 'lookup_failed', message }, { status: 500 })
  }
}

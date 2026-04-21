import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HistoryQuerySchema } from '@/lib/schemas/search'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/history?consultant_id=xxx
 * Retorna últimas 20 buscas do consultor.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const parsed = HistoryQuerySchema.safeParse({
      consultant_id: url.searchParams.get('consultant_id'),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('portal_searches')
      .select(
        'id, consultant_id, status, search_params, portals, results_count, new_listings_count, fisbo_count, apify_run_ids, apify_cost_usd, error_message, started_at, completed_at, created_at, updated_at'
      )
      .eq('consultant_id', parsed.data.consultant_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, hint: error.hint ?? undefined },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * GET /api/search/history?consultant_id=xxx
 *
 * Proxy for portal_searches query — bypasses PostgREST schema cache.
 * Called by useSearchHistory hook.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const consultantId = url.searchParams.get('consultant_id')

    if (!consultantId) {
      return NextResponse.json({ error: 'consultant_id required' }, { status: 400 })
    }

    const sql = getDb()

    const results = await sql`
      SELECT id, consultant_id, status, search_params, portals,
             results_count, new_listings_count, fisbo_count,
             apify_run_ids, apify_cost_usd, error_message,
             started_at, completed_at, created_at, updated_at
      FROM portal_searches
      WHERE consultant_id = ${consultantId}::uuid
      ORDER BY created_at DESC
      LIMIT 20
    `

    return NextResponse.json(results)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

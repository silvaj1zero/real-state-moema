import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processParametricSearch, checkRateLimit } from '@/lib/apify-parametric'
import type { PortalSearchParams } from '@/lib/supabase/types'

/**
 * POST /api/search/parametric
 *
 * Story 6.2 — Trigger parametric search on portals.
 * Returns search_id immediately, processes asynchronously.
 *
 * Body: {
 *   consultant_id: string,
 *   portals: ['zap', 'olx', 'vivareal'],
 *   params: PortalSearchParams
 * }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { consultant_id, portals, params } = body as {
    consultant_id: string
    portals: string[]
    params: PortalSearchParams
  }

  if (!consultant_id || !portals?.length) {
    return NextResponse.json(
      { error: 'consultant_id and portals are required' },
      { status: 400 }
    )
  }

  // AC5: Rate limit — 5 searches per hour
  const rateCheck = await checkRateLimit(consultant_id)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 5 searches per hour.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
    )
  }

  // AC5: Cost estimate — reject if > $2.00
  const estimatedCost = portals.length * 200 * 0.002
  if (estimatedCost > 2.0) {
    return NextResponse.json(
      { error: `Estimated cost $${estimatedCost.toFixed(2)} exceeds max $2.00. Reduce portals or items.` },
      { status: 400 }
    )
  }

  // Check APIFY_TOKEN
  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(
      { error: 'APIFY_TOKEN not configured. Use CSV import as fallback.' },
      { status: 503 }
    )
  }

  const supabase = createAdminClient()

  // Create search record
  const { data: search, error } = await supabase
    .from('portal_searches')
    .insert({
      consultant_id,
      status: 'pending',
      search_params: params,
      portals,
    })
    .select('id')
    .single()

  if (error || !search) {
    return NextResponse.json(
      { error: `Failed to create search: ${error?.message}` },
      { status: 500 }
    )
  }

  // AC2: Async processing — fire and forget
  // In Vercel, this continues after response is sent
  const processingPromise = processParametricSearch(
    search.id,
    consultant_id,
    portals,
    params
  ).catch(async (err) => {
    // Mark as failed if processing throws
    await supabase
      .from('portal_searches')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown processing error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', search.id)
  })

  // Use waitUntil if available (Vercel Edge/Serverless)
  if (typeof globalThis !== 'undefined' && 'waitUntil' in globalThis) {
    ;(globalThis as unknown as { waitUntil: (p: Promise<unknown>) => void }).waitUntil(processingPromise)
  } else {
    // Fallback: let it run in background (Node.js)
    void processingPromise
  }

  return NextResponse.json({
    search_id: search.id,
    status: 'pending',
  })
}

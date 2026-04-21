import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/db
 *
 * Diagnóstico do schema cache do PostgREST. Protegido por CRON_SECRET.
 * Testa tabelas/funções do Epic 6 para identificar se o cache precisa reload.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const started = Date.now()

  const checks: Record<string, { ok: boolean; status?: number; code?: string; message?: string }> = {}

  // Check 1: legacy table (should always work)
  const r1 = await supabase.from('consultores').select('id').limit(1)
  checks.consultores = r1.error
    ? { ok: false, code: r1.error.code, message: r1.error.message }
    : { ok: true }

  // Check 2: scraped_listings base (should be in cache)
  const r2 = await supabase.from('scraped_listings').select('id').limit(1)
  checks.scraped_listings = r2.error
    ? { ok: false, code: r2.error.code, message: r2.error.message }
    : { ok: true }

  // Check 3: Epic 6 contact column (requires schema cache reload)
  const r3 = await supabase.from('scraped_listings').select('id,nome_anunciante').limit(1)
  checks.scraped_listings_contact_cols = r3.error
    ? { ok: false, code: r3.error.code, message: r3.error.message }
    : { ok: true }

  // Check 4: Epic 6 portal_searches table (requires schema cache reload)
  const r4 = await supabase.from('portal_searches').select('id').limit(1)
  checks.portal_searches = r4.error
    ? { ok: false, code: r4.error.code, message: r4.error.message }
    : { ok: true }

  // Check 5: Epic 6 RPC function (requires schema cache reload)
  const r5 = await supabase.rpc('fn_scraped_listings_parametric', {
    p_lat: -23.6,
    p_lng: -46.66,
    p_raio_metros: 100,
    p_limit: 1,
  })
  checks.fn_scraped_listings_parametric = r5.error
    ? { ok: false, code: r5.error.code, message: r5.error.message }
    : { ok: true }

  const epic6Healthy =
    checks.scraped_listings_contact_cols.ok &&
    checks.portal_searches.ok &&
    checks.fn_scraped_listings_parametric.ok

  return NextResponse.json({
    status: epic6Healthy ? 'ok' : 'degraded',
    elapsed_ms: Date.now() - started,
    checks,
    remediation: epic6Healthy
      ? undefined
      : 'PostgREST schema cache is stale. Run the SQL in docs/UNBLOCK-POSTGREST.sql via Supabase SQL Editor.',
  })
}

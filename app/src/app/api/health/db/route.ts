import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/db
 *
 * Health check para conexão direta ao Postgres (postgres.js via Supavisor pooler).
 * Protegido por CRON_SECRET (Bearer token).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  try {
    const sql = getDb()
    const rows = await sql`SELECT 1 AS ok, current_database() AS db, current_user AS "user", version() AS version`
    const elapsed = Date.now() - started
    return NextResponse.json({
      status: 'ok',
      elapsed_ms: elapsed,
      result: rows[0],
      host: (process.env.DB_HOST || 'aws-1-sa-east-1.pooler.supabase.com').trim(),
    })
  } catch (err) {
    const elapsed = Date.now() - started
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const code = err instanceof Error && 'code' in err ? (err as { code?: string }).code : undefined
    return NextResponse.json(
      {
        status: 'error',
        elapsed_ms: elapsed,
        error: msg,
        code,
        host: (process.env.DB_HOST || 'aws-1-sa-east-1.pooler.supabase.com').trim(),
      },
      { status: 500 }
    )
  }
}

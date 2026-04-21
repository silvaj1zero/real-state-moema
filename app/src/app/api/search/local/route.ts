import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LocalSearchSchema } from '@/lib/schemas/search'

export const dynamic = 'force-dynamic'

/**
 * POST /api/search/local
 * Busca imóveis em scraped_listings via RPC fn_scraped_listings_parametric.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = LocalSearchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('fn_scraped_listings_parametric', parsed.data)

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

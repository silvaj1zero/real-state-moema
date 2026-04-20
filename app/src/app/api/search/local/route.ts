import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * POST /api/search/local
 *
 * Proxy for fn_scraped_listings_parametric — bypasses PostgREST schema cache.
 * Called by useLocalSearch hook.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      p_lat, p_lng, p_raio_metros = 2000,
      p_quartos_min, p_quartos_max,
      p_area_min, p_area_max,
      p_preco_min, p_preco_max,
      p_bairros, p_fisbo_only = false,
      p_portal, p_limit = 100,
    } = body

    if (p_lat == null || p_lng == null) {
      return NextResponse.json({ error: 'p_lat and p_lng are required' }, { status: 400 })
    }

    const sql = getDb()

    const results = await sql`
      SELECT
        sl.id, sl.portal, sl.external_id, sl.url,
        sl.tipo_anunciante, sl.endereco, sl.endereco_normalizado,
        sl.bairro, sl.preco, sl.area_m2, sl.preco_m2,
        sl.tipologia, sl.quartos, sl.descricao,
        sl.is_fisbo, sl.is_active,
        sl.first_seen_at, sl.last_seen_at, sl.removed_at,
        sl.preco_anterior, sl.matched_edificio_id,
        sl.match_method, sl.match_distance_m,
        sl.nome_anunciante, sl.telefone_anunciante,
        sl.email_anunciante, sl.whatsapp_anunciante,
        sl.creci_anunciante,
        ST_Distance(
          sl.coordinates,
          ST_SetSRID(ST_MakePoint(${p_lng}, ${p_lat}), 4326)::geography
        ) AS distancia_m
      FROM scraped_listings sl
      WHERE sl.is_active = true
        AND sl.coordinates IS NOT NULL
        AND ST_DWithin(
          sl.coordinates,
          ST_SetSRID(ST_MakePoint(${p_lng}, ${p_lat}), 4326)::geography,
          ${p_raio_metros}
        )
        AND (${p_quartos_min}::int IS NULL OR sl.quartos >= ${p_quartos_min ?? null}::int)
        AND (${p_quartos_max}::int IS NULL OR sl.quartos <= ${p_quartos_max ?? null}::int)
        AND (${p_area_min}::numeric IS NULL OR sl.area_m2 >= ${p_area_min ?? null}::numeric)
        AND (${p_area_max}::numeric IS NULL OR sl.area_m2 <= ${p_area_max ?? null}::numeric)
        AND (${p_preco_min}::numeric IS NULL OR sl.preco >= ${p_preco_min ?? null}::numeric)
        AND (${p_preco_max}::numeric IS NULL OR sl.preco <= ${p_preco_max ?? null}::numeric)
        AND (${p_bairros}::text[] IS NULL OR sl.bairro = ANY(${p_bairros ?? null}::text[]))
        AND (${p_fisbo_only}::boolean = false OR sl.is_fisbo = true)
        AND (${p_portal}::text IS NULL OR sl.portal::text = ${p_portal ?? null}::text)
      ORDER BY distancia_m ASC
      LIMIT ${p_limit}
    `

    return NextResponse.json(results)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

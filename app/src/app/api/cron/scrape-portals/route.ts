import { NextResponse } from 'next/server'
import { createAdminClient, verifyCronSecret } from '@/lib/supabase/admin'
import {
  runActor,
  waitForRun,
  getDatasetItems,
  normalizeListing,
  ACTOR_IDS,
  MOEMA_SEARCH_INPUT,
} from '@/lib/apify'
import type { NormalizedListing } from '@/lib/apify'

/**
 * POST /api/cron/scrape-portals
 *
 * Story 3.4, AC1/AC2/AC5/AC6/AC7
 * Scrapes ZAP (daily), OLX/VivaReal (weekly) via Apify Actors.
 * Triggered by Vercel Cron or manual "Run Now" button.
 *
 * Query params:
 *   ?portal=zap   — scrape only ZAP (default: all configured)
 *   ?portal=olx
 *   ?portal=vivareal
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const portalParam = url.searchParams.get('portal')
  const portals = portalParam
    ? [portalParam as 'zap' | 'olx' | 'vivareal']
    : (['zap', 'olx', 'vivareal'] as const)

  const supabase = createAdminClient()
  const results: Record<string, { collected: number; new: number; updated: number; fisbo: number; errors: string[] }> = {}

  for (const portal of portals) {
    const actorId = ACTOR_IDS[portal]
    if (!actorId) {
      results[portal] = { collected: 0, new: 0, updated: 0, fisbo: 0, errors: [`No APIFY_ACTOR_${portal.toUpperCase()} configured`] }
      continue
    }

    try {
      // 1. Run Apify Actor
      const run = await runActor(actorId, MOEMA_SEARCH_INPUT)

      // 2. Wait for completion
      const completed = await waitForRun(run.id)

      // 3. Fetch results
      const rawItems = await getDatasetItems(completed.defaultDatasetId)

      // 4. Normalize and upsert
      const listings: NormalizedListing[] = rawItems
        .map((item) => normalizeListing(item, portal))
        .filter((l): l is NormalizedListing => l !== null)

      let newCount = 0
      let updatedCount = 0
      let fisboCount = 0
      const errors: string[] = []

      // Process in batches of 50
      for (let i = 0; i < listings.length; i += 50) {
        const batch = listings.slice(i, i + 50)

        for (const listing of batch) {
          // Check if listing already exists
          const { data: existing } = await supabase
            .from('scraped_listings')
            .select('id, preco, is_active')
            .eq('portal', listing.portal)
            .eq('external_id', listing.external_id)
            .maybeSingle()

          if (existing) {
            // Update existing: last_seen_at, price change detection (AC7)
            const updateData: Record<string, unknown> = {
              last_seen_at: new Date().toISOString(),
              is_active: true,
            }

            // Price change detection — trigger handles >10% notification
            if (listing.preco && existing.preco && listing.preco !== existing.preco) {
              updateData.preco = listing.preco
              updateData.preco_m2 = listing.preco_m2
            }

            // Re-activate if was removed
            if (!existing.is_active) {
              updateData.removed_at = null
            }

            const { error } = await supabase
              .from('scraped_listings')
              .update(updateData)
              .eq('id', existing.id)

            if (error) errors.push(`Update ${listing.external_id}: ${error.message}`)
            else updatedCount++
          } else {
            // Insert new listing
            const insertData: Record<string, unknown> = {
              portal: listing.portal,
              external_id: listing.external_id,
              url: listing.url,
              tipo_anunciante: listing.tipo_anunciante,
              endereco: listing.endereco,
              bairro: listing.bairro,
              preco: listing.preco,
              area_m2: listing.area_m2,
              preco_m2: listing.preco_m2,
              tipologia: listing.tipologia,
              quartos: listing.quartos,
              descricao: listing.descricao,
              is_fisbo: listing.is_fisbo,
              is_active: true,
              geocoding_status: listing.lat ? 'success' : 'pending',
            }

            // If portal provided coordinates, store them
            if (listing.lat && listing.lng) {
              // Use RPC to set geography point
              const { error } = await supabase.rpc('fn_insert_scraped_listing_with_coords', {
                ...insertData,
                p_lat: listing.lat,
                p_lng: listing.lng,
              })

              if (error) {
                // Fallback: insert without coordinates
                const { error: fallbackErr } = await supabase
                  .from('scraped_listings')
                  .insert(insertData)
                if (fallbackErr) errors.push(`Insert ${listing.external_id}: ${fallbackErr.message}`)
                else newCount++
              } else {
                newCount++
              }
            } else {
              const { error } = await supabase.from('scraped_listings').insert(insertData)
              if (error) errors.push(`Insert ${listing.external_id}: ${error.message}`)
              else newCount++
            }

            if (listing.is_fisbo) fisboCount++
          }
        }
      }

      // AC6: Detect removed listings — active listings NOT in current scrape
      const currentExternalIds = listings.map((l) => l.external_id)
      if (currentExternalIds.length > 0) {
        const { error: removeErr } = await supabase
          .from('scraped_listings')
          .update({ is_active: false, removed_at: new Date().toISOString() })
          .eq('portal', portal)
          .eq('is_active', true)
          .not('external_id', 'in', `(${currentExternalIds.map((id) => `"${id}"`).join(',')})`)

        if (removeErr) errors.push(`Removal detection: ${removeErr.message}`)
      }

      results[portal] = {
        collected: listings.length,
        new: newCount,
        updated: updatedCount,
        fisbo: fisboCount,
        errors,
      }

      // Log to intelligence_feed (AC5)
      await supabase.from('intelligence_feed').insert({
        consultant_id: '00000000-0000-0000-0000-000000000000', // System-level, will be distributed by trigger
        tipo: 'sync_completo',
        prioridade: 'baixa',
        titulo: `Varredura ${portal.toUpperCase()} concluida`,
        descricao: `Coletados: ${listings.length} | Novos: ${newCount} | Atualizados: ${updatedCount} | FISBO: ${fisboCount}`,
        metadata: results[portal],
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results[portal] = { collected: 0, new: 0, updated: 0, fisbo: 0, errors: [msg] }
    }
  }

  return NextResponse.json({ success: true, results })
}

/** GET — health check */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    portals: {
      zap: { configured: !!ACTOR_IDS.zap },
      olx: { configured: !!ACTOR_IDS.olx },
      vivareal: { configured: !!ACTOR_IDS.vivareal },
    },
  })
}

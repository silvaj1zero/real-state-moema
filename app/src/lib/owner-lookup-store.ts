/**
 * Adapter Supabase do OwnerLookupStore — Story 6.6.
 *
 * Camada fina de I/O: toda a logica de guarda/decisao mora em
 * `owner-lookup-service.ts` (testada com store fake). Aqui e so query.
 * Roda com o client AUTENTICADO (RLS por consultant_id — AC3).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OwnerLookup } from '@/lib/supabase/types'
import type { OwnerLookupStore } from '@/lib/owner-lookup-service'
import { parseCoordinates } from '@/lib/coordinates'
import { fetchSqlLoteByPoint } from '@/lib/geosampa'

export function createSupabaseOwnerLookupStore(client: SupabaseClient): OwnerLookupStore {
  return {
    async findCached({ edificioId, sqlLote, sinceIso }) {
      if (!edificioId && !sqlLote) return null

      let query = client
        .from('owner_lookups')
        .select('*')
        .eq('status', 'success')
        .gt('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(1)

      query = edificioId ? query.eq('edificio_id', edificioId) : query.eq('sql_lote', sqlLote!)

      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(`owner_lookups cache query failed: ${error.message}`)
      return (data as OwnerLookup | null) ?? null
    },

    async getRateWindow(consultantId) {
      const { data, error } = await client.rpc('fn_check_owner_lookup_rate_limit', {
        p_consultant_id: consultantId,
      })
      if (error) throw new Error(`rate limit check failed: ${error.message}`)
      const parsed = (data ?? {}) as { count?: number; oldest_at?: string | null }
      return { count: parsed.count ?? 0, oldestAt: parsed.oldest_at ?? null }
    },

    async sumCostCurrentMonth(consultantId) {
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const { data, error } = await client
        .from('owner_lookups')
        .select('custo_brl')
        .eq('consultant_id', consultantId)
        .gte('created_at', monthStart)
      if (error) throw new Error(`budget query failed: ${error.message}`)
      return ((data ?? []) as Array<{ custo_brl: number | string }>).reduce(
        (sum, r) => sum + Number(r.custo_brl ?? 0),
        0,
      )
    },

    async resolveEdificio(edificioId) {
      const { data, error } = await client
        .from('edificios')
        .select('sql_lote, endereco, coordinates')
        .eq('id', edificioId)
        .maybeSingle()
      if (error) throw new Error(`edificio query failed: ${error.message}`)
      if (!data) return null

      const row = data as { sql_lote: string | null; endereco: string | null; coordinates: string | null }
      if (row.sql_lote) return { sqlLote: row.sql_lote, endereco: row.endereco }

      // Fallback GeoSampa (AC1a): lote por INTERSECTS com o ponto do edificio.
      // Nao persiste em edificios (RLS de escrita restrita) — so usa na consulta.
      const point = parseCoordinates(row.coordinates)
      const sqlLote = point ? await fetchSqlLoteByPoint(point.lng, point.lat) : null
      return { sqlLote, endereco: row.endereco }
    },

    async insertLookup(row) {
      const { data, error } = await client
        .from('owner_lookups')
        .insert(row)
        .select('*')
        .single()
      if (error) throw new Error(`owner_lookups insert failed: ${error.message}`)
      return data as OwnerLookup
    },

    async recordCacheHit(lookup) {
      // Incremento read-modify-write: aceitável — telemetria de MVP
      // single-consultant; corrida só subcontaria um hit.
      const { error } = await client
        .from('owner_lookups')
        .update({
          cache_hit_count: (lookup.cache_hit_count ?? 0) + 1,
          last_cache_hit_at: new Date().toISOString(),
        })
        .eq('id', lookup.id)
      if (error) throw new Error(`cache hit telemetry failed: ${error.message}`)
    },

    async insertFeedEvent(evt) {
      const { error } = await client.from('intelligence_feed').insert({
        consultant_id: evt.consultant_id,
        tipo: 'owner_lookup_completo',
        prioridade: 'media',
        titulo: evt.titulo,
        descricao: null,
        edificio_id: evt.edificio_id,
        metadata: evt.metadata,
        is_read: false,
        is_push_sent: false,
      })
      if (error) throw new Error(`intelligence_feed insert failed: ${error.message}`)
    },
  }
}

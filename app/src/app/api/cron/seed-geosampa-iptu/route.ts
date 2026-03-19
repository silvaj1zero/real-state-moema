import { NextResponse } from 'next/server'
import { createAdminClient, verifyCronSecret } from '@/lib/supabase/admin'

/**
 * POST /api/cron/seed-geosampa-iptu
 *
 * Story 3.5, AC4 — Enrich buildings via GeoSampa IPTU data.
 * Accepts pre-processed CSV/JSON payload with IPTU records.
 *
 * This endpoint processes pre-downloaded IPTU data (from dados.prefeitura.sp.gov.br).
 * The download+parse step happens offline; this endpoint receives the processed records.
 *
 * Body: { records: IptuRecord[] }
 */

interface IptuRecord {
  sql_lote: string
  endereco: string
  lat?: number
  lng?: number
  total_units?: number
  area_construida?: number
  ano_construcao?: number
  padrao_iptu?: string // A/B/C/D/E
  tipo_uso?: string
  num_pavimentos?: number
}

/** Map IPTU padrao (A-E) to system padrao */
function mapPadraoIptu(padrao: string | undefined): string | null {
  if (!padrao) return null
  const upper = padrao.toUpperCase()
  if (upper === 'A' || upper === 'B') return 'alto'
  if (upper === 'C') return 'medio'
  if (upper === 'D' || upper === 'E') return 'popular'
  return null
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { records: IptuRecord[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.records || !Array.isArray(body.records)) {
    return NextResponse.json({ error: 'Body must contain records array' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let enriched = 0
  let newBuildings = 0
  const errors: string[] = []

  for (const record of body.records) {
    try {
      let matchedId: string | null = null

      // Try match by coordinates (30m)
      if (record.lat && record.lng) {
        const { data: nearby } = await supabase.rpc('fn_edificios_no_raio', {
          p_lat: record.lat,
          p_lng: record.lng,
          p_raio_metros: 30,
        })
        if (nearby && nearby.length > 0) {
          matchedId = nearby[0].id
        }
      }

      // Try match by sql_lote
      if (!matchedId && record.sql_lote) {
        const { data: byLote } = await supabase
          .from('edificios')
          .select('id')
          .eq('sql_lote', record.sql_lote)
          .maybeSingle()
        if (byLote) matchedId = byLote.id
      }

      if (matchedId) {
        // Update existing — COALESCE: only fill NULLs (AC5)
        // Check edited_fields to respect manual edits
        const { data: current } = await supabase
          .from('edificios')
          .select('edited_fields, total_units, area_construida, ano_construcao, padrao_iptu, tipo_uso_iptu, num_pavimentos')
          .eq('id', matchedId)
          .single()

        if (current) {
          const editedFields: string[] = current.edited_fields || []
          const updateData: Record<string, unknown> = {}

          if (record.total_units && !current.total_units && !editedFields.includes('total_units')) {
            updateData.total_units = record.total_units
          }
          if (record.area_construida && !current.area_construida && !editedFields.includes('area_construida')) {
            updateData.area_construida = record.area_construida
          }
          if (record.ano_construcao && !current.ano_construcao && !editedFields.includes('ano_construcao')) {
            updateData.ano_construcao = record.ano_construcao
          }
          if (record.padrao_iptu && !current.padrao_iptu && !editedFields.includes('padrao_iptu')) {
            updateData.padrao_iptu = mapPadraoIptu(record.padrao_iptu)
          }
          if (record.tipo_uso && !current.tipo_uso_iptu && !editedFields.includes('tipo_uso_iptu')) {
            updateData.tipo_uso_iptu = record.tipo_uso
          }
          if (record.num_pavimentos && !current.num_pavimentos && !editedFields.includes('num_pavimentos')) {
            updateData.num_pavimentos = record.num_pavimentos
          }
          if (record.sql_lote) {
            updateData.sql_lote = record.sql_lote
          }

          if (Object.keys(updateData).length > 0) {
            updateData.seed_source_secondary = 'geosampa_iptu'
            const { error } = await supabase
              .from('edificios')
              .update(updateData)
              .eq('id', matchedId)

            if (error) errors.push(`Update ${matchedId}: ${error.message}`)
            else enriched++
          }
        }
      } else if (record.endereco) {
        // Insert new building from IPTU data
        const { error: insertErr } = await supabase.from('edificios').insert({
          nome: record.endereco.split(',')[0] || record.endereco,
          endereco: record.endereco,
          origem: 'api',
          seed_source: 'geosampa_iptu',
          seed_source_secondary: 'geosampa_iptu',
          sql_lote: record.sql_lote,
          total_units: record.total_units,
          area_construida: record.area_construida,
          ano_construcao: record.ano_construcao,
          padrao_iptu: mapPadraoIptu(record.padrao_iptu),
          tipo_uso_iptu: record.tipo_uso,
          num_pavimentos: record.num_pavimentos,
          verificado: false,
          cidade: 'São Paulo',
          estado: 'SP',
        })

        if (insertErr) errors.push(`Insert ${record.endereco}: ${insertErr.message}`)
        else newBuildings++
      }
    } catch (err) {
      errors.push(`Record ${record.sql_lote}: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  // Log to feed
  await supabase.from('intelligence_feed').insert({
    consultant_id: '00000000-0000-0000-0000-000000000000',
    tipo: 'seed_completo',
    prioridade: 'baixa',
    titulo: 'Seed GeoSampa IPTU concluido',
    descricao: `Enriquecidos: ${enriched} | Novos: ${newBuildings}`,
    metadata: { fonte: 'geosampa_iptu', edificios_enriquecidos: enriched, novos_edificios: newBuildings },
  })

  return NextResponse.json({ success: true, enriched, new: newBuildings, errors: errors.slice(0, 10) })
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentData {
  enriched_at: string
  anuncios_entorno: NearbyListing[]
  estimativa_m2: MarketEstimate
  fisbo_score: FisboScore
  scraped_match_id: string | null
}

export interface NearbyListing {
  id: string
  endereco: string
  preco: number
  area_m2: number
  portal: string
  is_fisbo: boolean
  tempo_mercado_dias: number
}

export interface MarketEstimate {
  media: number
  mediana: number
  total_comparaveis: number
}

export interface FisboScore {
  score: number
  sinais: string[]
}

// ---------------------------------------------------------------------------
// FISBO Score calculation
// ---------------------------------------------------------------------------

export function calculateFisboScore(
  nearbyListings: NearbyListing[],
  matchedListing: NearbyListing | null,
  totalUnits: number | null,
): FisboScore {
  let score = 0
  const sinais: string[] = []

  // +30 if FISBO in same building
  if (matchedListing?.is_fisbo) {
    score += 30
    sinais.push('FISBO no mesmo edifício (+30)')
  }

  // +20 if proprietário nearby
  const propNearby = nearbyListings.filter((l) => l.is_fisbo).length
  if (propNearby > 0 && !matchedListing?.is_fisbo) {
    score += 20
    sinais.push(`${propNearby} anúncio(s) FISBO no entorno (+20)`)
  }

  // +15 if large building
  if (totalUnits && totalUnits > 20) {
    score += 15
    sinais.push(`Edifício grande: ${totalUnits} unidades (+15)`)
  }

  // +10 if long time on market
  const longMarket = nearbyListings.filter((l) => l.tempo_mercado_dias > 90).length
  if (longMarket > 0) {
    score += 10
    sinais.push(`${longMarket} listing(s) > 90 dias no mercado (+10)`)
  }

  // +10 if recent price reduction
  // (would need price history data — simplified here)

  return { score: Math.min(score, 100), sinais }
}

// ---------------------------------------------------------------------------
// useLeadEnrichment — fetch existing enrichment data
// ---------------------------------------------------------------------------

export function useLeadEnrichment(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-enrichment', leadId],
    queryFn: async (): Promise<EnrichmentData | null> => {
      if (!leadId) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('enrichment_data')
        .eq('id', leadId)
        .single()

      if (error || !data?.enrichment_data) return null
      return data.enrichment_data as EnrichmentData
    },
    enabled: !!leadId,
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useEnrichLead — on-demand enrichment mutation
// ---------------------------------------------------------------------------

export function useEnrichLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leadId,
      edificioId,
      consultantId,
      lat,
      lng,
    }: {
      leadId: string
      edificioId: string
      consultantId: string
      lat: number
      lng: number
    }): Promise<EnrichmentData> => {
      const supabase = createClient()

      // Parallel queries with 10s timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const [nearbyResult, comparaveisResult, edificioResult] = await Promise.allSettled([
          // Nearby scraped listings (100m)
          supabase
            .from('scraped_listings')
            .select('id, endereco, preco, area_m2, portal, is_fisbo, first_seen_at, matched_edificio_id, is_active')
            .eq('is_active', true)
            .limit(10),

          // Comparáveis for market estimate
          supabase.rpc('fn_comparaveis_no_raio', {
            p_lat: lat,
            p_lng: lng,
            p_consultant_id: consultantId,
            p_raio_metros: 500,
          }),

          // Building data for FISBO score
          supabase
            .from('edificios')
            .select('total_units')
            .eq('id', edificioId)
            .single(),
        ])

        // Process nearby listings
        const nearbyRaw =
          nearbyResult.status === 'fulfilled' ? (nearbyResult.value.data ?? []) : []
        const now = new Date()
        const anuncios_entorno: NearbyListing[] = nearbyRaw.slice(0, 10).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          endereco: (l.endereco as string) || 'N/A',
          preco: (l.preco as number) || 0,
          area_m2: (l.area_m2 as number) || 0,
          portal: (l.portal as string) || 'outro',
          is_fisbo: (l.is_fisbo as boolean) || false,
          tempo_mercado_dias: Math.floor(
            (now.getTime() - new Date(l.first_seen_at as string).getTime()) / 86400000,
          ),
        }))

        // Market estimate
        const comparaveisRaw =
          comparaveisResult.status === 'fulfilled' ? (comparaveisResult.value.data ?? []) : []
        const precos = comparaveisRaw.map((c: Record<string, unknown>) => c.preco_m2 as number).filter((p: number) => p > 0)
        const media = precos.length > 0 ? precos.reduce((s: number, p: number) => s + p, 0) / precos.length : 0
        const sorted = [...precos].sort((a: number, b: number) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const mediana =
          sorted.length === 0
            ? 0
            : sorted.length % 2 !== 0
              ? sorted[mid]
              : (sorted[mid - 1] + sorted[mid]) / 2

        const estimativa_m2: MarketEstimate = {
          media: Math.round(media * 100) / 100,
          mediana: Math.round(mediana * 100) / 100,
          total_comparaveis: comparaveisRaw.length,
        }

        // FISBO score
        const totalUnits =
          edificioResult.status === 'fulfilled'
            ? (edificioResult.value.data?.total_units as number | null)
            : null
        const matchedListing = anuncios_entorno.find(
          (l) => nearbyRaw.some((r: Record<string, unknown>) => r.id === l.id && r.matched_edificio_id === edificioId),
        ) || null
        const fisbo_score = calculateFisboScore(anuncios_entorno, matchedListing, totalUnits)

        const enrichmentData: EnrichmentData = {
          enriched_at: new Date().toISOString(),
          anuncios_entorno,
          estimativa_m2,
          fisbo_score,
          scraped_match_id: matchedListing?.id || null,
        }

        // Save to lead
        await supabase
          .from('leads')
          .update({ enrichment_data: enrichmentData })
          .eq('id', leadId)

        return enrichmentData
      } finally {
        clearTimeout(timeout)
      }
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-enrichment', vars.leadId] })
    },
  })
}

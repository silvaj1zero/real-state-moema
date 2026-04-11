'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  AcmComparavel,
  ComparavelNoRaio,
  FonteComparavel,
  ScrapedListing,
} from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const acmKeys = {
  all: ['acm'] as const,
  comparaveis: (lat: number, lng: number, consultantId: string, raio: number) =>
    ['acm', 'comparaveis', lat, lng, consultantId, raio] as const,
  scrapedInRadius: (lat: number, lng: number, raio: number) =>
    ['acm', 'scraped', lat, lng, raio] as const,
}

// ---------------------------------------------------------------------------
// useComparaveis — fetch comparáveis via fn_comparaveis_no_raio RPC
// ---------------------------------------------------------------------------

export function useComparaveis(
  lat: number | null,
  lng: number | null,
  consultantId: string | null,
  raio: number = 500,
) {
  const query = useQuery({
    queryKey: acmKeys.comparaveis(lat ?? 0, lng ?? 0, consultantId ?? '', raio),
    queryFn: async (): Promise<ComparavelNoRaio[]> => {
      if (!lat || !lng || !consultantId) return []

      const supabase = createClient()
      const { data, error } = await supabase.rpc('fn_comparaveis_no_raio', {
        p_lat: lat,
        p_lng: lng,
        p_consultant_id: consultantId,
        p_raio_metros: raio,
      })

      if (error) {
        throw new Error(`Failed to fetch comparáveis: ${error.message}`)
      }

      return (data ?? []) as ComparavelNoRaio[]
    },
    enabled: !!lat && !!lng && !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    comparaveis: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useScrapedInRadius — fetch active scraped listings in radius for import
// ---------------------------------------------------------------------------

export function useScrapedInRadius(
  lat: number | null,
  lng: number | null,
  raio: number = 500,
) {
  const query = useQuery({
    queryKey: acmKeys.scrapedInRadius(lat ?? 0, lng ?? 0, raio),
    queryFn: async (): Promise<ScrapedListing[]> => {
      if (!lat || !lng) return []

      const supabase = createClient()
      // Use PostGIS ST_DWithin via raw SQL or a view
      // For now, fetch active listings and filter client-side using coordinates
      // In production, this should be an RPC or view with PostGIS
      const { data, error } = await supabase
        .from('scraped_listings')
        .select('*')
        .eq('is_active', true)

      if (error) {
        throw new Error(`Failed to fetch scraped listings: ${error.message}`)
      }

      return (data ?? []) as ScrapedListing[]
    },
    enabled: !!lat && !!lng,
    staleTime: 60 * 1000,
  })

  return {
    scrapedListings: query.data ?? [],
    isLoading: query.isLoading,
  }
}

// ---------------------------------------------------------------------------
// useCreateComparavel — mutation to add manual comparable
// ---------------------------------------------------------------------------

export interface CreateComparavelInput {
  consultant_id: string
  edificio_referencia_id?: string
  endereco: string
  coordinates_lat?: number
  coordinates_lng?: number
  area_m2: number
  preco: number
  is_venda_real: boolean
  data_referencia?: string
  notas?: string
}

export function useCreateComparavel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateComparavelInput): Promise<AcmComparavel> => {
      const supabase = createClient()

      const preco_m2 = input.area_m2 > 0 ? input.preco / input.area_m2 : 0

      // Build coordinates as PostGIS point if lat/lng provided
      let coordinatesValue: string | null = null
      if (input.coordinates_lat && input.coordinates_lng) {
        coordinatesValue = `SRID=4326;POINT(${input.coordinates_lng} ${input.coordinates_lat})`
      }

      const insertData = {
        consultant_id: input.consultant_id,
        edificio_referencia_id: input.edificio_referencia_id || null,
        endereco: input.endereco,
        coordinates: coordinatesValue,
        area_m2: input.area_m2,
        preco: input.preco,
        preco_m2: Math.round(preco_m2 * 100) / 100,
        is_venda_real: input.is_venda_real,
        fonte: 'manual' as FonteComparavel,
        data_referencia: input.data_referencia || new Date().toISOString().split('T')[0],
        notas: input.notas || null,
      }

      const { data, error } = await supabase
        .from('acm_comparaveis')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create comparável: ${error.message}`)
      }

      return data as AcmComparavel
    },

    onSettled: () => {
      // Invalidate all ACM queries to refetch
      queryClient.invalidateQueries({ queryKey: acmKeys.all })
    },
  })
}

// ---------------------------------------------------------------------------
// useImportFromScraping — mutation to import scraped listings as comparáveis
// ---------------------------------------------------------------------------

export interface ImportScrapingInput {
  consultant_id: string
  listings: ScrapedListing[]
}

export function useImportFromScraping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ImportScrapingInput): Promise<AcmComparavel[]> => {
      const supabase = createClient()

      const inserts = input.listings.map((listing) => ({
        consultant_id: input.consultant_id,
        endereco: listing.endereco || 'Endereço desconhecido',
        coordinates: listing.coordinates,
        area_m2: listing.area_m2 || 0,
        preco: listing.preco || 0,
        preco_m2: listing.preco_m2 || 0,
        is_venda_real: false,
        fonte: 'scraping' as FonteComparavel,
        scraped_listing_id: listing.id,
        data_referencia: listing.last_seen_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      }))

      const { data, error } = await supabase
        .from('acm_comparaveis')
        .insert(inserts)
        .select()

      if (error) {
        throw new Error(`Failed to import scraped listings: ${error.message}`)
      }

      return (data ?? []) as AcmComparavel[]
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: acmKeys.all })
    },
  })
}

// ---------------------------------------------------------------------------
// ACM Calculation utilities
// ---------------------------------------------------------------------------

export interface AcmCalculations {
  mediaPrecoM2: number
  medianaPrecoM2: number
  tendenciaPercent: number | null
  totalComparaveis: number
  countManual: number
  countScraping: number
}

export function calculateAcmStats(comparaveis: ComparavelNoRaio[]): AcmCalculations {
  if (comparaveis.length === 0) {
    return {
      mediaPrecoM2: 0,
      medianaPrecoM2: 0,
      tendenciaPercent: null,
      totalComparaveis: 0,
      countManual: 0,
      countScraping: 0,
    }
  }

  const precos = comparaveis.map((c) => c.preco_m2).filter((p) => p > 0)

  // Média
  const mediaPrecoM2 =
    precos.length > 0 ? precos.reduce((sum, p) => sum + p, 0) / precos.length : 0

  // Mediana
  const sorted = [...precos].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianaPrecoM2 =
    sorted.length === 0
      ? 0
      : sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2

  // Contagens
  const countManual = comparaveis.filter((c) => c.fonte === 'manual').length
  const countScraping = comparaveis.filter((c) => c.fonte === 'scraping').length

  return {
    mediaPrecoM2: Math.round(mediaPrecoM2 * 100) / 100,
    medianaPrecoM2: Math.round(medianaPrecoM2 * 100) / 100,
    tendenciaPercent: null, // TODO: calculate from data_referencia when enough data
    totalComparaveis: comparaveis.length,
    countManual,
    countScraping,
  }
}

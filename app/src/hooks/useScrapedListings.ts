'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ScrapedListing } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const scrapedKeys = {
  all: ['scraped-listings'] as const,
  stats: ['scraped-listings', 'stats'] as const,
}

// ---------------------------------------------------------------------------
// useScrapedListings — fetch all active listings
// ---------------------------------------------------------------------------

export function useScrapedListings() {
  return useQuery({
    queryKey: scrapedKeys.all,
    queryFn: async (): Promise<ScrapedListing[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('scraped_listings')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Error fetching scraped listings:', error)
        return []
      }
      return (data ?? []) as ScrapedListing[]
    },
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useScrapedStats — aggregate metrics
// ---------------------------------------------------------------------------

export interface ScrapedStats {
  totalActive: number
  totalFisbo: number
  totalInactive: number
  byPortal: Record<string, number>
}

export function useScrapedStats() {
  return useQuery({
    queryKey: scrapedKeys.stats,
    queryFn: async (): Promise<ScrapedStats> => {
      const supabase = createClient()

      const [activeResult, fisboResult, inactiveResult] = await Promise.all([
        supabase.from('scraped_listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('scraped_listings').select('*', { count: 'exact', head: true }).eq('is_fisbo', true).eq('is_active', true),
        supabase.from('scraped_listings').select('*', { count: 'exact', head: true }).eq('is_active', false),
      ])

      return {
        totalActive: activeResult.count ?? 0,
        totalFisbo: fisboResult.count ?? 0,
        totalInactive: inactiveResult.count ?? 0,
        byPortal: {}, // Would need GROUP BY — simplified
      }
    },
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useCsvImport — parse and insert CSV listings
// ---------------------------------------------------------------------------

export interface CsvRow {
  endereco: string
  preco: number
  area_m2: number
  quartos?: number
  tipo_anunciante?: string
  url?: string
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''))
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

    const endereco = row['endereco'] || row['endereço'] || row['address']
    const preco = parseFloat(row['preco'] || row['preço'] || row['price'] || '0')
    const area = parseFloat(row['area_m2'] || row['area'] || row['m2'] || '0')

    if (!endereco || preco <= 0 || area <= 0) continue

    rows.push({
      endereco,
      preco,
      area_m2: area,
      quartos: parseInt(row['quartos'] || row['rooms'] || '0') || undefined,
      tipo_anunciante: row['tipo_anunciante'] || row['tipo'] || 'desconhecido',
      url: row['url'] || undefined,
    })
  }

  return rows
}

export function useCsvImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (csvText: string): Promise<{ imported: number; errors: string[] }> => {
      const rows = parseCsv(csvText)
      if (rows.length === 0) {
        return { imported: 0, errors: ['Nenhuma linha válida encontrada no CSV.'] }
      }

      const supabase = createClient()
      const errors: string[] = []
      let imported = 0

      // Insert in batches of 50
      const batchSize = 50
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map((row) => ({
          portal: 'outro' as const,
          external_id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          endereco: row.endereco,
          preco: row.preco,
          area_m2: row.area_m2,
          preco_m2: row.area_m2 > 0 ? Math.round((row.preco / row.area_m2) * 100) / 100 : 0,
          quartos: row.quartos || null,
          tipo_anunciante: row.tipo_anunciante || 'desconhecido',
          url: row.url || null,
          is_fisbo: row.tipo_anunciante === 'proprietario',
          geocoding_status: 'pending' as const,
          is_active: true,
        }))

        const { error } = await supabase.from('scraped_listings').insert(batch)
        if (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        } else {
          imported += batch.length
        }
      }

      return { imported, errors }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scrapedKeys.all })
      queryClient.invalidateQueries({ queryKey: scrapedKeys.stats })
    },
  })
}

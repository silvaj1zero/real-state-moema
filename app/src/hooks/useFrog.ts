'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FrogContact, FonteFrog } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const frogKeys = {
  all: ['frog'] as const,
  stats: (consultantId: string) => ['frog', 'stats', consultantId] as const,
  contacts: (consultantId: string, categoria?: FonteFrog) =>
    categoria
      ? (['frog', 'contacts', consultantId, categoria] as const)
      : (['frog', 'contacts', consultantId] as const),
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrogCategoryStats {
  categoria: FonteFrog
  leadCount: number
  conversionRate: number // 0-100
  trend: 'up' | 'down' | 'stable'
}

export interface FrogStats {
  categories: FrogCategoryStats[]
  totalLeads: number
}

// ---------------------------------------------------------------------------
// FROG colors and labels
// ---------------------------------------------------------------------------

export const FROG_CONFIG: Record<FonteFrog, { label: string; fullLabel: string; color: string }> = {
  familia: { label: 'F', fullLabel: 'Fam\u00edlia', color: '#DC1431' },
  relacionamentos: { label: 'R', fullLabel: 'Relacionamentos', color: '#003DA5' },
  organizacoes: { label: 'O', fullLabel: 'Organiza\u00e7\u00f5es', color: '#D97706' },
  geografia: { label: 'G', fullLabel: 'Geografia', color: '#22C55E' },
}

export const FROG_CATEGORIES: FonteFrog[] = [
  'familia',
  'relacionamentos',
  'organizacoes',
  'geografia',
]

// ---------------------------------------------------------------------------
// Suggestions for empty categories
// ---------------------------------------------------------------------------

export const FROG_SUGGESTIONS: Record<FonteFrog, string> = {
  familia: 'Converse com familiares sobre oportunidades imobili\u00e1rias na regi\u00e3o',
  relacionamentos: 'Contate amigos e conhecidos que possam ter interesse em vender',
  organizacoes: 'Participe de um evento de networking ou associa\u00e7\u00e3o do bairro',
  geografia: 'Explore novos edif\u00edcios e converse com zeladores da regi\u00e3o',
}

// ---------------------------------------------------------------------------
// useFrogStats — leads by FROG category with conversion rates
// ---------------------------------------------------------------------------

export function useFrogStats(consultantId: string | null) {
  const query = useQuery({
    queryKey: frogKeys.stats(consultantId ?? ''),
    queryFn: async (): Promise<FrogStats> => {
      if (!consultantId) {
        return { categories: [], totalLeads: 0 }
      }

      const supabase = createClient()

      // Fetch all leads with fonte_frog
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, fonte_frog, etapa_funil')
        .eq('consultant_id', consultantId)
        .not('fonte_frog', 'is', null)

      if (error) {
        console.error('Error fetching FROG stats:', error)
        return { categories: [], totalLeads: 0 }
      }

      const allLeads = leads ?? []
      const totalLeads = allLeads.length

      // Count per category
      const categoryCounts: Record<FonteFrog, { total: number; converted: number }> = {
        familia: { total: 0, converted: 0 },
        relacionamentos: { total: 0, converted: 0 },
        organizacoes: { total: 0, converted: 0 },
        geografia: { total: 0, converted: 0 },
      }

      // Stages considered "converted" (past V2)
      const convertedStages = new Set([
        'representacao',
        'venda',
      ])

      for (const lead of allLeads) {
        const cat = lead.fonte_frog as FonteFrog
        if (categoryCounts[cat]) {
          categoryCounts[cat].total++
          if (convertedStages.has(lead.etapa_funil)) {
            categoryCounts[cat].converted++
          }
        }
      }

      // Fetch recent leads (last 30 days) for trend calculation
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString()

      const { data: recentLeads } = await supabase
        .from('leads')
        .select('fonte_frog')
        .eq('consultant_id', consultantId)
        .not('fonte_frog', 'is', null)
        .gte('created_at', thirtyDaysAgo)

      const recentCounts: Record<string, number> = {}
      for (const l of recentLeads ?? []) {
        const cat = l.fonte_frog as string
        recentCounts[cat] = (recentCounts[cat] || 0) + 1
      }

      const categories: FrogCategoryStats[] = FROG_CATEGORIES.map((cat) => {
        const { total, converted } = categoryCounts[cat]
        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
        const recentCount = recentCounts[cat] || 0

        // Simple trend: if recent count > 30% of total, trending up
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (total > 0 && recentCount > total * 0.3) {
          trend = 'up'
        } else if (total > 3 && recentCount === 0) {
          trend = 'down'
        }

        return { categoria: cat, leadCount: total, conversionRate, trend }
      })

      return { categories, totalLeads }
    },
    enabled: !!consultantId,
    staleTime: 60 * 1000,
  })

  return {
    stats: query.data ?? { categories: [], totalLeads: 0 },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useFrogContacts — fetch FROG contacts (embaixadores)
// ---------------------------------------------------------------------------

export function useFrogContacts(consultantId: string | null, categoria?: FonteFrog) {
  const query = useQuery({
    queryKey: frogKeys.contacts(consultantId ?? '', categoria),
    queryFn: async (): Promise<FrogContact[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      let q = supabase
        .from('frog_contacts')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('leads_gerados', { ascending: false })

      if (categoria) {
        q = q.eq('categoria', categoria)
      }

      const { data, error } = await q

      if (error) {
        console.error('Error fetching FROG contacts:', error)
        return []
      }

      return (data ?? []) as FrogContact[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useCreateFrogContact — mutation to create ambassador
// ---------------------------------------------------------------------------

export interface CreateFrogContactInput {
  consultant_id: string
  nome: string
  categoria: FonteFrog
  telefone?: string
  email?: string
  notas?: string
}

export function useCreateFrogContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateFrogContactInput): Promise<FrogContact> => {
      const supabase = createClient()

      const insertData = {
        consultant_id: input.consultant_id,
        nome: input.nome,
        categoria: input.categoria,
        telefone_encrypted: input.telefone || null,
        email: input.email || null,
        notas: input.notas || null,
        leads_gerados: 0,
      }

      const { data, error } = await supabase
        .from('frog_contacts')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create FROG contact: ${error.message}`)
      }

      return data as FrogContact
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: frogKeys.contacts(input.consultant_id),
      })
      queryClient.invalidateQueries({
        queryKey: frogKeys.stats(input.consultant_id),
      })
    },
  })
}

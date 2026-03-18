'use client'

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TipoFeed =
  | 'novo_fisbo'
  | 'reducao_preco'
  | 'ex_imobiliaria_fisbo'
  | 'novo_raio_desbloqueado'
  | 'lead_parado'
  | 'agendamento_proximo'
  | 'seed_completo'
  | 'sync_completo'

export type PrioridadeFeed = 'alta' | 'media' | 'baixa'

export interface FeedItem {
  id: string
  consultant_id: string
  tipo: TipoFeed
  prioridade: PrioridadeFeed
  titulo: string
  descricao: string | null
  coordinates: string | null
  edificio_id: string | null
  lead_id: string | null
  scraped_listing_id: string | null
  metadata: Record<string, unknown> | null
  is_read: boolean
  is_push_sent: boolean
  created_at: string
}

export interface FeedFilters {
  tipos: TipoFeed[]
  prioridades: PrioridadeFeed[]
  periodo: 'hoje' | 'semana' | 'mes' | 'todos'
  apenasNaoLidos: boolean
}

export const DEFAULT_FILTERS: FeedFilters = {
  tipos: [],
  prioridades: ['alta', 'media'],
  periodo: 'semana',
  apenasNaoLidos: true,
}

// ---------------------------------------------------------------------------
// Feed icon/color config
// ---------------------------------------------------------------------------

export const FEED_TYPE_CONFIG: Record<TipoFeed, { icon: string; color: string; label: string }> = {
  novo_fisbo: { icon: 'home-plus', color: '#22C55E', label: 'Novo FISBO' },
  reducao_preco: { icon: 'trending-down', color: '#F97316', label: 'Redução Preço' },
  ex_imobiliaria_fisbo: { icon: 'repeat', color: '#EF4444', label: 'Ex-Imob → FISBO' },
  novo_raio_desbloqueado: { icon: 'target', color: '#3B82F6', label: 'Novo Raio' },
  lead_parado: { icon: 'clock', color: '#F59E0B', label: 'Lead Parado' },
  agendamento_proximo: { icon: 'calendar', color: '#3B82F6', label: 'Agendamento' },
  seed_completo: { icon: 'database', color: '#6B7280', label: 'Seed' },
  sync_completo: { icon: 'refresh', color: '#6B7280', label: 'Sync' },
}

export const PRIORIDADE_COLORS: Record<PrioridadeFeed, string> = {
  alta: '#EF4444',
  media: '#F59E0B',
  baixa: '#9CA3AF',
}

// ---------------------------------------------------------------------------
// useFeed — infinite scroll feed
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

function getPeriodFilter(periodo: string): string | null {
  const now = new Date()
  if (periodo === 'hoje') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (periodo === 'semana') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (periodo === 'mes') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    return d.toISOString()
  }
  return null
}

export function useFeed(consultantId: string | null, filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ['feed', consultantId, filters],
    queryFn: async ({ pageParam = 0 }): Promise<FeedItem[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      let q = supabase
        .from('intelligence_feed')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      if (filters.apenasNaoLidos) {
        q = q.eq('is_read', false)
      }

      if (filters.tipos.length > 0) {
        q = q.in('tipo', filters.tipos)
      }

      if (filters.prioridades.length > 0) {
        q = q.in('prioridade', filters.prioridades)
      }

      const periodStart = getPeriodFilter(filters.periodo)
      if (periodStart) {
        q = q.gte('created_at', periodStart)
      }

      const { data, error } = await q

      if (error) {
        console.error('Error fetching feed:', error)
        return []
      }

      return (data ?? []) as FeedItem[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
    },
    enabled: !!consultantId,
    staleTime: 15 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useFeedUnreadCount — badge count
// ---------------------------------------------------------------------------

export function useFeedUnreadCount(consultantId: string | null) {
  return useQuery({
    queryKey: ['feed', 'count', consultantId],
    queryFn: async (): Promise<number> => {
      if (!consultantId) return 0
      const supabase = createClient()
      const { count, error } = await supabase
        .from('intelligence_feed')
        .select('*', { count: 'exact', head: true })
        .eq('consultant_id', consultantId)
        .eq('is_read', false)

      if (error) return 0
      return count ?? 0
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useMarkRead — mark single or all as read
// ---------------------------------------------------------------------------

export function useMarkFeedRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, consultantId, all }: { id?: string; consultantId: string; all?: boolean }) => {
      const supabase = createClient()

      if (all) {
        await supabase
          .from('intelligence_feed')
          .update({ is_read: true })
          .eq('consultant_id', consultantId)
          .eq('is_read', false)
      } else if (id) {
        await supabase
          .from('intelligence_feed')
          .update({ is_read: true })
          .eq('id', id)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Relative time formatting
// ---------------------------------------------------------------------------

export function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffH < 24) return `há ${diffH}h`
  if (diffD === 1) return 'ontem'
  if (diffD < 7) return `${diffD} dias atrás`
  return date.toLocaleDateString('pt-BR')
}

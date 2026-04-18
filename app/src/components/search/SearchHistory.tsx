'use client'

import { Clock, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useSearchHistory } from '@/hooks/useParametricSearch'
import { useSearchStore } from '@/store/search'
import type { PortalSearch, PortalSearchParams } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface SearchHistoryProps {
  consultantId: string
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  pending: { icon: Loader2, color: 'text-amber-500', label: 'Pendente' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Em andamento' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Concluida' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Falhou' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelada' },
}

export function SearchHistory({ consultantId }: SearchHistoryProps) {
  const { data: searches, isLoading } = useSearchHistory(consultantId)
  const updateFilters = useSearchStore((s) => s.updateFilters)
  const setTipoTransacao = useSearchStore((s) => s.setTipoTransacao)
  const setRadius = useSearchStore((s) => s.setRadius)
  const setCenter = useSearchStore((s) => s.setCenter)

  function loadFiltersFromSearch(search: PortalSearch) {
    const params = search.search_params as PortalSearchParams
    if (!params) return

    updateFilters({
      quartos_min: params.quartos_min ?? null,
      quartos_max: params.quartos_max ?? null,
      suites_min: params.suites_min ?? null,
      banheiros_min: params.banheiros_min ?? null,
      banheiros_max: params.banheiros_max ?? null,
      area_min: params.area_min ?? null,
      area_max: params.area_max ?? null,
      preco_min: params.preco_min ?? null,
      preco_max: params.preco_max ?? null,
    })

    if (params.tipo_transacao) setTipoTransacao(params.tipo_transacao)
    if (params.raio_metros) setRadius(params.raio_metros)
    if (params.center_lat != null && params.center_lng != null) {
      setCenter({ lat: params.center_lat, lng: params.center_lng })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const recentSearches = (searches ?? []).slice(0, 10)

  if (recentSearches.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="size-6 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-400">Nenhuma busca anterior.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recentSearches.map((search) => (
        <SearchHistoryItem
          key={search.id}
          search={search}
          onLoadFilters={() => loadFiltersFromSearch(search)}
        />
      ))}
    </div>
  )
}

function SearchHistoryItem({
  search,
  onLoadFilters,
}: {
  search: PortalSearch
  onLoadFilters: () => void
}) {
  const statusCfg = STATUS_CONFIG[search.status] || STATUS_CONFIG.failed
  const StatusIcon = statusCfg.icon

  const paramsSummary = buildSummary(search.search_params as PortalSearchParams)
  const dateStr = formatRelativeDate(search.created_at)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Date + status */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">{dateStr}</span>
            <span className={cn('flex items-center gap-1 text-[10px] font-medium', statusCfg.color)}>
              <StatusIcon className={cn('size-3', (search.status === 'pending' || search.status === 'running') && 'animate-spin')} />
              {statusCfg.label}
            </span>
          </div>

          {/* Params summary */}
          <p className="text-xs text-gray-600 truncate">{paramsSummary}</p>

          {/* Results count */}
          {search.status === 'completed' && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {search.results_count} resultado{search.results_count !== 1 ? 's' : ''}
              {search.new_listings_count > 0 && ` | ${search.new_listings_count} novos`}
              {search.fisbo_count > 0 && ` | ${search.fisbo_count} FISBO`}
            </p>
          )}
        </div>

        {/* Repetir button */}
        <button
          onClick={onLoadFilters}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="size-3" />
          Repetir
        </button>
      </div>
    </div>
  )
}

function buildSummary(params: PortalSearchParams | null): string {
  if (!params) return 'Sem filtros'
  const parts: string[] = []
  if (params.quartos_min != null) parts.push(`${params.quartos_min}+ quartos`)
  if (params.area_min != null || params.area_max != null) {
    parts.push(`${params.area_min ?? '?'}-${params.area_max ?? '?'} m²`)
  }
  if (params.preco_min != null || params.preco_max != null) {
    const min = params.preco_min ? `${Math.round(params.preco_min / 1000)}K` : '?'
    const max = params.preco_max ? `${Math.round(params.preco_max / 1000)}K` : '?'
    parts.push(`R$${min}-${max}`)
  }
  if (params.raio_metros) parts.push(`raio ${params.raio_metros}m`)
  if (params.portais?.length) parts.push(params.portais.join(', '))
  return parts.join(' | ') || 'Sem filtros'
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Agora'
  if (diffMin < 60) return `${diffMin}min atras`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atras`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Ontem'
  if (diffD < 7) return `${diffD} dias atras`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

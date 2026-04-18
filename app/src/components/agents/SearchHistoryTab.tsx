'use client'

import { useState, useMemo } from 'react'
import { Search, Clock, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { useSearchHistory } from '@/hooks/useParametricSearch'
import type { PortalSearch } from '@/lib/supabase/types'

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  running: { label: 'Buscando...', bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { label: 'Concluida', bg: 'bg-green-100', text: 'text-green-700' },
  failed: { label: 'Falhou', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'Cancelada', bg: 'bg-gray-100', text: 'text-gray-500' },
}

interface SearchHistoryTabProps {
  consultantId: string
}

export function SearchHistoryTab({ consultantId }: SearchHistoryTabProps) {
  const { data: searches, isLoading } = useSearchHistory(consultantId)

  const stats = useMemo(() => {
    if (!searches?.length) return { total: 0, totalResults: 0, totalFisbo: 0, totalNew: 0 }
    return {
      total: searches.length,
      totalResults: searches.reduce((s, x) => s + (x.results_count || 0), 0),
      totalFisbo: searches.reduce((s, x) => s + (x.fisbo_count || 0), 0),
      totalNew: searches.reduce((s, x) => s + (x.new_listings_count || 0), 0),
    }
  }, [searches])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Stats header */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard icon={<Search className="size-4" />} label="Buscas" value={stats.total} />
        <StatCard icon={<TrendingUp className="size-4" />} label="Resultados" value={stats.totalResults} />
        <StatCard icon={<Users className="size-4" />} label="FISBO" value={stats.totalFisbo} color="text-green-600" />
        <StatCard icon={<AlertCircle className="size-4" />} label="Novos" value={stats.totalNew} color="text-blue-600" />
      </div>

      {/* Search list */}
      {!searches?.length ? (
        <div className="text-center py-8 text-gray-400">
          <Search className="size-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nenhuma busca parametrica realizada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {searches.map((search) => (
            <SearchCard key={search.id} search={search} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color = 'text-gray-900',
}: {
  icon: React.ReactNode
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-2.5 text-center">
      <div className="flex items-center justify-center text-gray-400 mb-1">{icon}</div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  )
}

function SearchCard({ search }: { search: PortalSearch }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_STYLES[search.status] || STATUS_STYLES.pending
  const params = search.search_params

  const paramsSummary = useMemo(() => {
    const parts: string[] = []
    if (params.quartos_min != null) parts.push(`${params.quartos_min}q+`)
    if (params.area_min != null || params.area_max != null) {
      parts.push(`${params.area_min || '?'}-${params.area_max || '?'}m²`)
    }
    if (params.preco_min != null || params.preco_max != null) {
      const min = params.preco_min ? `${(params.preco_min / 1000).toFixed(0)}K` : '?'
      const max = params.preco_max ? `${(params.preco_max / 1000).toFixed(0)}K` : '?'
      parts.push(`R$${min}-${max}`)
    }
    if (params.bairros?.length) parts.push(params.bairros[0])
    if (params.raio_metros) parts.push(`${params.raio_metros}m`)
    return parts.join(', ') || 'Sem filtros'
  }, [params])

  const dateStr = new Date(search.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">{dateStr}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-700 truncate">{paramsSummary}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{search.results_count}</p>
          <p className="text-[10px] text-gray-400">resultados</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Portais</span>
            <span className="font-medium">{search.portals.join(', ').toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Novos</span>
            <span className="font-medium text-blue-600">{search.new_listings_count}</span>
          </div>
          <div className="flex justify-between">
            <span>FISBO</span>
            <span className="font-medium text-green-600">{search.fisbo_count}</span>
          </div>
          {search.apify_cost_usd != null && (
            <div className="flex justify-between">
              <span>Custo Apify</span>
              <span>${search.apify_cost_usd.toFixed(4)}</span>
            </div>
          )}
          {search.error_message && (
            <p className="text-red-500 mt-1">{search.error_message}</p>
          )}
        </div>
      )}
    </div>
  )
}

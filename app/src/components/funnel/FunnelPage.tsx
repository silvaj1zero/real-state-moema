'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useFunnelStats } from '@/hooks/useFunnel'
import { useFunnelStore } from '@/store/funnel'
import { FunnelTabs } from '@/components/funnel/FunnelTabs'
import { FunnelKanban } from '@/components/funnel/FunnelKanban'
import { TransitionModal } from '@/components/funnel/TransitionModal'
import { cn } from '@/lib/utils'
import { ErrorBanner } from '@/components/ui/ErrorBanner'

// ---------------------------------------------------------------------------
// useMediaQuery hook (SSR-safe)
// ---------------------------------------------------------------------------

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

interface FilterState {
  edificio: string | null
  origem: string | null
  dateFrom: string | null
  dateTo: string | null
}

// ---------------------------------------------------------------------------
// FunnelPage — Main funnel page (responsive)
// ---------------------------------------------------------------------------

export function FunnelPage() {
  const user = useAuthStore((s) => s.user)
  const { stats, isLoading: statsLoading, error: statsError, refetch } = useFunnelStats(user?.id ?? null)
  const transitionModalOpen = useFunnelStore((s) => s.transitionModalOpen)

  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    edificio: null,
    origem: null,
    dateFrom: null,
    dateTo: null,
  })

  const hasActiveFilters = Object.values(filters).some((v) => v !== null)

  const clearFilters = useCallback(() => {
    setFilters({ edificio: null, origem: null, dateFrom: null, dateTo: null })
  }, [])

  // Build stage counts map from stats
  const stageCounts: Record<string, number> = {}
  for (const stage of stats.stages) {
    stageCounts[stage.etapa] = stage.count
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 safe-area-top">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Funil de Vendas</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {statsLoading ? (
              <span className="inline-block w-16 h-3 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>Total: <span className="font-semibold text-gray-700">{stats.total}</span> leads ativos</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Atualizar"
          >
            <svg
              className={cn('w-4 h-4 text-gray-500', statsLoading && 'animate-spin')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors',
              showFilters && 'bg-gray-100'
            )}
            aria-label="Filtros"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#003DA5] rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {statsError && (
        <ErrorBanner error={statsError} onRetry={() => refetch()} />
      )}

      {/* Filter panel (collapsible) */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#003DA5] font-medium hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Edificio filter */}
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">Edifício</label>
              <input
                type="text"
                placeholder="Buscar edifício..."
                value={filters.edificio ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    edificio: e.target.value || null,
                  }))
                }
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              />
            </div>

            {/* Origem chips */}
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">Origem</label>
              <select
                value={filters.origem ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    origem: e.target.value || null,
                  }))
                }
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              >
                <option value="">Todas</option>
                <option value="digital">Digital</option>
                <option value="placa">Placa</option>
                <option value="zelador">Zelador</option>
                <option value="indicacao">Indicação</option>
                <option value="fisbo_scraping">FISBO</option>
                <option value="referral">Referral</option>
                <option value="captei">Captei</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">De</label>
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    dateFrom: e.target.value || null,
                  }))
                }
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">Até</label>
              <input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    dateTo: e.target.value || null,
                  }))
                }
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main content — responsive */}
      <div className="flex-1 overflow-hidden">
        {isDesktop ? (
          <FunnelKanban stageCounts={stageCounts} />
        ) : (
          <FunnelTabs stageCounts={stageCounts} />
        )}
      </div>

      {/* Transition modal — rendered globally */}
      {transitionModalOpen && <TransitionModal />}
    </div>
  )
}

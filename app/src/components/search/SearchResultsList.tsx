'use client'

import { useState, useMemo } from 'react'
import { Search, User, ExternalLink } from 'lucide-react'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

type FilterTab = 'todos' | 'fisbo' | 'novos'

const PORTAL_COLORS: Record<string, string> = {
  zap: '#8B2FC9',
  olx: '#6E0AD6',
  vivareal: '#FF7900',
  quintoandar: '#E91E63',
  outro: '#6B7280',
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function isNewListing(firstSeenAt: string | null, cutoff: number): boolean {
  if (!firstSeenAt) return false
  return new Date(firstSeenAt).getTime() > cutoff
}

function computeDaysOnMarket(firstSeenAt: string | null, now: number): number | null {
  if (!firstSeenAt) return null
  const seen = new Date(firstSeenAt).getTime()
  return Math.floor((now - seen) / (1000 * 60 * 60 * 24))
}

interface SearchResultsListProps {
  results: ScrapedListingParametric[]
  isLoading: boolean
}

const PAGE_SIZE = 50

export function SearchResultsList({ results, isLoading }: SearchResultsListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('todos')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Snapshot time once via lazy state init (pure — initializer runs once)
  const [cutoff] = useState(() => Date.now() - THREE_DAYS_MS)

  const fisboCount = useMemo(
    () => results.filter((r) => r.is_fisbo).length,
    [results]
  )

  const newCount = useMemo(
    () => results.filter((r) => isNewListing(r.first_seen_at, cutoff)).length,
    [results, cutoff]
  )

  const filtered = useMemo(() => {
    if (activeTab === 'fisbo') return results.filter((r) => r.is_fisbo)
    if (activeTab === 'novos') {
      return results.filter((r) => isNewListing(r.first_seen_at, cutoff))
    }
    return results
  }, [results, activeTab, cutoff])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {results.length} resultado{results.length !== 1 ? 's' : ''}
          {newCount > 0 && (
            <span className="text-[#003DA5] ml-1">| {newCount} novo{newCount !== 1 ? 's' : ''}</span>
          )}
          {fisboCount > 0 && (
            <span className="text-green-600 ml-1">| {fisboCount} FISBO</span>
          )}
        </h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-3">
        {([
          { key: 'todos' as FilterTab, label: 'Todos', count: results.length },
          { key: 'fisbo' as FilterTab, label: 'FISBO', count: fisboCount },
          { key: 'novos' as FilterTab, label: 'Novos', count: newCount },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setVisibleCount(PAGE_SIZE)
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-[#003DA5] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Search className="size-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum resultado encontrado.</p>
          <p className="text-xs text-gray-300 mt-1">
            Ajuste os filtros ou amplie o raio de busca.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <ResultCard key={item.id} item={item} />
          ))}

          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full h-10 rounded-lg border border-gray-200 text-sm text-[#003DA5] font-medium hover:bg-[#003DA5]/5 transition-colors"
            >
              Carregar mais ({filtered.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({ item }: { item: ScrapedListingParametric }) {
  // Snapshot time once via lazy state init (pure — initializer runs once)
  const [now] = useState(() => Date.now())

  const daysOnMarket = useMemo(
    () => computeDaysOnMarket(item.first_seen_at, now),
    [item.first_seen_at, now]
  )

  const portalColor = PORTAL_COLORS[item.portal] || PORTAL_COLORS.outro

  const isNew = useMemo(
    () => isNewListing(item.first_seen_at, now - THREE_DAYS_MS),
    [item.first_seen_at, now]
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* Address */}
        <p className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">
          {item.endereco || item.endereco_normalizado || 'Endereco nao disponivel'}
        </p>
        {/* External link */}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-[#003DA5] shrink-0"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      {/* Price + area */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-base font-bold text-gray-900">
          {item.preco ? formatBRL(item.preco) : 'Preco nao informado'}
        </span>
        {item.area_m2 && (
          <span className="text-xs text-gray-500">{item.area_m2} m²</span>
        )}
        {item.quartos != null && (
          <span className="text-xs text-gray-500">{item.quartos}q</span>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Portal badge */}
        <span
          className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium uppercase"
          style={{ backgroundColor: portalColor }}
        >
          {item.portal}
        </span>

        {/* FISBO badge */}
        {item.is_fisbo && (
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <User className="size-3" />
            FISBO
          </span>
        )}

        {/* New badge */}
        {isNew && (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            Novo
          </span>
        )}

        {/* Days on market */}
        {daysOnMarket != null && (
          <span className="text-[10px] text-gray-400">
            {daysOnMarket === 0 ? 'Hoje' : `${daysOnMarket}d no mercado`}
          </span>
        )}

        {/* Distance */}
        {item.distancia_m != null && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {item.distancia_m < 1000
              ? `${Math.round(item.distancia_m)}m`
              : `${(item.distancia_m / 1000).toFixed(1)}km`}
          </span>
        )}
      </div>

      {/* Anunciante tipo */}
      {item.tipo_anunciante && item.tipo_anunciante !== 'desconhecido' && (
        <p className="text-[10px] text-gray-400 mt-1.5 capitalize">
          {item.tipo_anunciante}
        </p>
      )}
    </div>
  )
}

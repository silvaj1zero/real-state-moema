'use client'

import { useState, useCallback, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import {
  useFeed,
  useMarkFeedRead,
  DEFAULT_FILTERS,
  type FeedFilters,
} from '@/hooks/useFeed'
import { FeedCard } from './FeedCard'
import { FeedFiltersBar } from './FeedFilters'

interface FeedScreenProps {
  consultantId: string
}

export function FeedScreen({ consultantId }: FeedScreenProps) {
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS)
  const markRead = useMarkFeedRead()

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFeed(consultantId, filters)

  const items = data?.pages.flat() ?? []
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Infinite scroll trigger
  const lastItemRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })
      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  )

  function handleMarkRead(id: string) {
    markRead.mutate({ id, consultantId })
  }

  function handleMarkAllRead() {
    markRead.mutate({ consultantId, all: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="size-5 text-[#003DA5]" />
            Inteligência
          </h1>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#003DA5] transition-colors"
          >
            <CheckCheck className="size-3.5" />
            Marcar todos lidos
          </button>
        </div>
        <FeedFiltersBar filters={filters} onChange={setFilters} />
      </div>

      {/* Feed list */}
      <div className="px-4 py-3 space-y-2 pb-20">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="size-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum evento encontrado.</p>
            <p className="text-xs text-gray-300 mt-1">
              Ajuste os filtros ou aguarde novos eventos.
            </p>
          </div>
        ) : (
          <>
            {items.map((item, idx) => (
              <div
                key={item.id}
                ref={idx === items.length - 1 ? lastItemRef : undefined}
              >
                <FeedCard item={item} onMarkRead={handleMarkRead} />
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="text-center py-4">
                <div className="w-5 h-5 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

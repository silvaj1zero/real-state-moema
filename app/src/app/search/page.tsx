'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useSearchStore } from '@/store/search'
import { useMapStore } from '@/store/map'
import { useLocalSearch, useTriggerSearch, useSearchStatus } from '@/hooks/useParametricSearch'
import { SearchAreaSelector } from '@/components/search/SearchAreaSelector'
import { SearchFiltersForm } from '@/components/search/SearchFiltersForm'
import { SearchResultsList } from '@/components/search/SearchResultsList'
import { SearchHistory } from '@/components/search/SearchHistory'
import { SearchProgressBar } from '@/components/search/SearchProgressBar'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const center = useSearchStore((s) => s.center)
  const setCenter = useSearchStore((s) => s.setCenter)
  const radius = useSearchStore((s) => s.radius)
  const setRadius = useSearchStore((s) => s.setRadius)
  const filters = useSearchStore((s) => s.filters)
  const currentSearchId = useSearchStore((s) => s.currentSearchId)
  const searchStatus = useSearchStore((s) => s.searchStatus)
  const setEpicenter = useMapStore((s) => s.setEpicenter)

  const [showHistory, setShowHistory] = useState(false)
  const [localResults, setLocalResults] = useState<ScrapedListingParametric[]>([])

  // Read query params from map navigation (lat, lng, radius)
  useEffect(() => {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const r = searchParams.get('radius')
    if (lat && lng) {
      setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) })
    }
    if (r) {
      setRadius(parseInt(r, 10))
    }
  }, [searchParams, setCenter, setRadius])

  // Local search
  const localSearch = useLocalSearch(
    center?.lat ?? null,
    center?.lng ?? null,
    radius,
    filters
  )

  // Portal search (mutation)
  const triggerSearch = useTriggerSearch()

  // Search status polling
  const { data: statusData } = useSearchStatus(currentSearchId)

  // Determine which results to show
  const portalResults = (statusData?.results ?? []) as ScrapedListingParametric[]
  const displayResults = portalResults.length > 0
    ? portalResults
    : localResults.length > 0
      ? localResults
      : (localSearch.data ?? [])

  const isSearching = searchStatus === 'pending' || searchStatus === 'running'

  const handleSearchLocal = useCallback(() => {
    if (localSearch.data) {
      setLocalResults(localSearch.data)
    }
    localSearch.refetch()
  }, [localSearch])

  const handleSearchPortals = useCallback(() => {
    triggerSearch.mutate()
  }, [triggerSearch])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Search className="size-5 text-[#003DA5]" />
          Busca Portais
        </h1>
        {center && (
          <button
            onClick={() => {
              setEpicenter(center)
              router.push('/')
            }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <MapPin className="size-3.5" />
            Ver no Mapa
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* 1. Area selector */}
        <SearchAreaSelector />

        {/* 2. Filters form */}
        <SearchFiltersForm
          onSearchLocal={handleSearchLocal}
          onSearchPortals={handleSearchPortals}
          isSearchingLocal={localSearch.isFetching}
          isSearchingPortals={triggerSearch.isPending || isSearching}
        />

        {/* 3. Progress bar (when searching) */}
        <SearchProgressBar />

        {/* Error banner */}
        {triggerSearch.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{triggerSearch.error.message}</p>
          </div>
        )}
        {searchStatus === 'failed' && statusData?.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{statusData.error_message}</p>
          </div>
        )}

        {/* 4. Results list */}
        {displayResults.length > 0 || localSearch.isFetching ? (
          <SearchResultsList
            results={displayResults}
            isLoading={localSearch.isFetching}
          />
        ) : null}

        {/* 5. Collapsible search history */}
        {user?.id && (
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-semibold text-gray-900">
                Buscas anteriores
              </span>
              {showHistory ? (
                <ChevronUp className="size-4 text-gray-400" />
              ) : (
                <ChevronDown className="size-4 text-gray-400" />
              )}
            </button>
            {showHistory && (
              <div className="px-4 pb-4">
                <SearchHistory consultantId={user.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

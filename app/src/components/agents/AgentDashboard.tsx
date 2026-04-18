'use client'

import { useState } from 'react'
import { Bot, Activity, Home, Eye, TrendingDown, Upload, RefreshCw, Play, MapPin, Link2, AlertTriangle, Clock } from 'lucide-react'
import { useScrapedListings, useScrapedStats } from '@/hooks/useScrapedListings'
import { useAgentCronLogs, useGeocodingPending, useUnmatchedCount, useRunScraper, useRunGeocode, useRunMatch, useRunCrossRef } from '@/hooks/useAgentOps'
import { CsvImportModal } from './CsvImportModal'
import { CrossRefPanel } from './CrossRefPanel'
import { SearchHistoryTab } from './SearchHistoryTab'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScrapedListing } from '@/lib/supabase/types'

const PORTAL_COLORS: Record<string, string> = {
  zap: 'bg-purple-100 text-purple-700',
  olx: 'bg-orange-100 text-orange-700',
  vivareal: 'bg-green-100 text-green-700',
  quintoandar: 'bg-blue-100 text-blue-700',
  outro: 'bg-gray-100 text-gray-600',
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function timeAgo(date: string): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${mins}min atras`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atras`
  return `${Math.floor(hours / 24)}d atras`
}

type Tab = 'listings' | 'crossrefs' | 'searches'
type ListingFilter = 'all' | 'active' | 'fisbo' | 'inactive'

interface AgentDashboardProps {
  consultantId: string
}

export function AgentDashboard({ consultantId: _consultantId }: AgentDashboardProps) {
  const { data: listings, isLoading } = useScrapedListings()
  const { data: stats } = useScrapedStats()
  const { data: cronLogs } = useAgentCronLogs()
  const { data: geocodingPending } = useGeocodingPending()
  const { data: unmatchedCount } = useUnmatchedCount()

  const runScraper = useRunScraper()
  const runGeocode = useRunGeocode()
  const runMatch = useRunMatch()
  const runCrossRef = useRunCrossRef()

  const [showCsvModal, setShowCsvModal] = useState(false)
  const [filter, setFilter] = useState<ListingFilter>('all')
  const [tab, setTab] = useState<Tab>('listings')

  const filtered = (listings ?? []).filter((l: ScrapedListing) => {
    if (filter === 'active') return l.is_active
    if (filter === 'fisbo') return l.is_fisbo && l.is_active
    if (filter === 'inactive') return !l.is_active
    return true
  })

  const isRunning = runScraper.isPending || runGeocode.isPending || runMatch.isPending || runCrossRef.isPending
  const lastRun = cronLogs?.[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="size-5 text-[#003DA5]" />
            Agentes
          </h1>
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#003DA5] rounded-lg hover:bg-[#002d7a] transition-colors"
          >
            <Upload className="size-3.5" />
            Importar CSV
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setTab('listings')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === 'listings' ? 'bg-[#003DA5] text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            Listings
          </button>
          <button
            onClick={() => setTab('crossrefs')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === 'crossrefs' ? 'bg-[#003DA5] text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            Cross-Refs
          </button>
          <button
            onClick={() => setTab('searches')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === 'searches' ? 'bg-[#003DA5] text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            Buscas
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-20">
        {/* Stats cards (AC9) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Activity className="size-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{stats?.totalActive ?? 0}</p>
            <p className="text-[10px] text-gray-500">Ativos</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Home className="size-4 text-[#22C55E] mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{stats?.totalFisbo ?? 0}</p>
            <p className="text-[10px] text-gray-500">FISBO</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Eye className="size-4 text-gray-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{stats?.totalInactive ?? 0}</p>
            <p className="text-[10px] text-gray-500">Removidos</p>
          </div>
        </div>

        {/* Agent Operations Panel — AC9 enhanced */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
              <RefreshCw className={cn('size-4 text-[#003DA5]', isRunning && 'animate-spin')} />
              Varredura Automatica
            </h3>
            {lastRun && (
              <span className="text-[9px] text-gray-400">
                Ultimo: {timeAgo(lastRun.created_at)}
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => runScraper.mutate(undefined)}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              <Play className="size-3" />
              Varrer Portais
            </button>
            <button
              onClick={() => runGeocode.mutate(50)}
              disabled={isRunning || !geocodingPending}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              <MapPin className="size-3" />
              Geocodificar ({geocodingPending ?? 0})
            </button>
            <button
              onClick={() => runMatch.mutate(100)}
              disabled={isRunning || !unmatchedCount}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              <Home className="size-3" />
              Match Edificios ({unmatchedCount ?? 0})
            </button>
            <button
              onClick={() => runCrossRef.mutate()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
            >
              <Link2 className="size-3" />
              Cross-Reference
            </button>
          </div>

          {/* Status feedback */}
          {runScraper.isError && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-600">
              <AlertTriangle className="size-3" />
              Erro na varredura. Verifique APIFY_TOKEN.
            </div>
          )}
          {runScraper.isSuccess && (
            <div className="text-[10px] text-green-600">Varredura concluida com sucesso.</div>
          )}
          {runGeocode.isSuccess && (
            <div className="text-[10px] text-green-600">Geocodificacao concluida.</div>
          )}
          {runMatch.isSuccess && (
            <div className="text-[10px] text-green-600">Matching concluido.</div>
          )}

          {/* Recent cron logs */}
          {cronLogs && cronLogs.length > 0 && (
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[9px] font-medium text-gray-500 mb-1">Ultimas execucoes</p>
              <div className="space-y-1">
                {cronLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-[9px]">
                    <span className="text-gray-600 truncate flex-1">{log.titulo}</span>
                    <span className="text-gray-400 ml-2 shrink-0">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab content */}
        {tab === 'searches' ? (
          <SearchHistoryTab consultantId={_consultantId} />
        ) : tab === 'crossrefs' ? (
          <CrossRefPanel />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1.5">
              {([
                { id: 'all', label: 'Todos' },
                { id: 'active', label: 'Ativos' },
                { id: 'fisbo', label: 'FISBO' },
                { id: 'inactive', label: 'Removidos' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                    filter === f.id
                      ? 'bg-[#003DA5] text-white'
                      : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Listings table */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bot className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum anuncio encontrado.</p>
                <p className="text-xs mt-1">Use &ldquo;Importar CSV&rdquo; ou &ldquo;Varrer Portais&rdquo; para adicionar dados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.slice(0, 50).map((listing: ScrapedListing) => (
                  <div
                    key={listing.id}
                    className={cn(
                      'bg-white rounded-xl p-3 shadow-sm border',
                      !listing.is_active ? 'opacity-50 border-gray-100' : 'border-gray-200',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-gray-900 truncate flex-1">
                        {listing.endereco || 'Endereco desconhecido'}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize',
                          PORTAL_COLORS[listing.portal] || PORTAL_COLORS.outro,
                        )}>
                          {listing.portal}
                        </span>
                        {listing.is_fisbo && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-green-100 text-green-700">
                            FISBO
                          </span>
                        )}
                        {listing.matched_edificio_id && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-100 text-blue-700">
                            Matched
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      {listing.preco && <span>{formatBRL(listing.preco)}</span>}
                      {listing.area_m2 && <span>{listing.area_m2}m²</span>}
                      {listing.quartos && <span>{listing.quartos}q</span>}
                      {listing.is_active ? (
                        <span className={cn(
                          'ml-auto flex items-center gap-0.5',
                          daysSince(listing.first_seen_at) > 90 ? 'text-red-500 font-medium' :
                          daysSince(listing.first_seen_at) > 30 ? 'text-yellow-600' : 'text-green-600',
                        )}>
                          <Clock className="size-2.5" />
                          {daysSince(listing.first_seen_at)}d
                        </span>
                      ) : (
                        <span className="ml-auto flex items-center gap-0.5 text-gray-400">
                          <Clock className="size-2.5" />
                          Removido {daysSince(listing.removed_at || listing.updated_at)}d
                        </span>
                      )}
                      {listing.preco_anterior && listing.preco && listing.preco < listing.preco_anterior && (
                        <span className="text-red-500 flex items-center gap-0.5">
                          <TrendingDown className="size-3" />
                          {Math.round((1 - listing.preco / listing.preco_anterior) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length > 50 && (
                  <p className="text-center text-[10px] text-gray-400">
                    Mostrando 50 de {filtered.length} anuncios
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CsvImportModal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)} />
    </div>
  )
}

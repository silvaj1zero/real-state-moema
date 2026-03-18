'use client'

import { useState } from 'react'
import { Bot, Activity, Home, Eye, TrendingDown, Upload, RefreshCw } from 'lucide-react'
import { useScrapedListings, useScrapedStats } from '@/hooks/useScrapedListings'
import { CsvImportModal } from './CsvImportModal'
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

interface AgentDashboardProps {
  consultantId: string
}

export function AgentDashboard({ consultantId: _consultantId }: AgentDashboardProps) {
  const { data: listings, isLoading } = useScrapedListings()
  const { data: stats } = useScrapedStats()
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'fisbo' | 'inactive'>('all')

  const filtered = (listings ?? []).filter((l: ScrapedListing) => {
    if (filter === 'active') return l.is_active
    if (filter === 'fisbo') return l.is_fisbo && l.is_active
    if (filter === 'inactive') return !l.is_active
    return true
  })

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

        {/* Cron status placeholder */}
        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="size-4 text-yellow-600" />
            <h3 className="text-xs font-semibold text-yellow-800">Varredura Automatica</h3>
          </div>
          <p className="text-[10px] text-yellow-700">
            Nao configurada. Configure Apify Actors e Edge Functions para ativar varredura automatica de ZAP, OLX e VivaReal.
          </p>
        </div>

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
            <p className="text-xs mt-1">Use &ldquo;Importar CSV&rdquo; para adicionar dados manualmente.</p>
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
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  {listing.preco && <span>{formatBRL(listing.preco)}</span>}
                  {listing.area_m2 && <span>{listing.area_m2}m²</span>}
                  <span className="ml-auto">
                    {listing.is_active
                      ? `${daysSince(listing.first_seen_at)}d no mercado`
                      : `Removido ${daysSince(listing.removed_at || listing.updated_at)}d atras`}
                  </span>
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
      </div>

      <CsvImportModal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)} />
    </div>
  )
}

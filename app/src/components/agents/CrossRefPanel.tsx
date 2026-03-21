'use client'

import { useState } from 'react'
import { Link2, AlertTriangle, Check, X, Clock, Filter } from 'lucide-react'
import { useCrossRefsPending, useCrossRefStats, useTransitionAlerts, useConfirmCrossRef } from '@/hooks/useCrossRefs'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * CrossRefPanel — Story 3.6, AC7
 * Review cross-portal references, confirm/reject merges, view transition alerts.
 * AC7 filters: by score range. Stats include avg time on market (AC3).
 */

type ScoreFilter = 'all' | 'high' | 'medium'

export function CrossRefPanel() {
  const { data: pending, isLoading: loadingPending } = useCrossRefsPending()
  const { data: stats } = useCrossRefStats()
  const { data: transitions } = useTransitionAlerts()
  const confirmMutation = useConfirmCrossRef()
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')

  const filteredPending = (pending ?? []).filter((ref) => {
    if (scoreFilter === 'high') return ref.match_score >= 75
    if (scoreFilter === 'medium') return ref.match_score < 75
    return true
  })

  return (
    <div className="space-y-4">
      {/* Stats — AC7 with avgTimeOnMarket (AC3) */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-white rounded-xl p-2.5 shadow-sm text-center">
          <p className="text-sm font-bold text-gray-900">{stats?.totalGroups ?? 0}</p>
          <p className="text-[9px] text-gray-500">Grupos</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 shadow-sm text-center">
          <p className="text-sm font-bold text-gray-900">{stats?.totalRefs ?? 0}</p>
          <p className="text-[9px] text-gray-500">Cross-Refs</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 shadow-sm text-center">
          <p className="text-sm font-bold text-orange-600">{stats?.pendingReview ?? 0}</p>
          <p className="text-[9px] text-gray-500">Pendentes</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 shadow-sm text-center">
          <p className="text-sm font-bold text-red-600">{stats?.transitions ?? 0}</p>
          <p className="text-[9px] text-gray-500">Transicoes</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 shadow-sm text-center">
          <p className={cn(
            'text-sm font-bold',
            (stats?.avgTimeOnMarket ?? 0) > 90 ? 'text-red-600' :
            (stats?.avgTimeOnMarket ?? 0) > 30 ? 'text-yellow-600' : 'text-green-600',
          )}>
            {stats?.avgTimeOnMarket ?? '—'}
          </p>
          <p className="text-[9px] text-gray-500 flex items-center justify-center gap-0.5">
            <Clock className="size-2.5" />
            Media dias
          </p>
        </div>
      </div>

      {/* Transition alerts — AC2 */}
      {transitions && transitions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-red-500" />
            Ex-Imobiliaria → FISBO
          </h3>
          {transitions.slice(0, 5).map((alert) => (
            <div key={alert.id} className="bg-red-50 rounded-xl p-3 border border-red-200">
              <p className="text-xs font-medium text-red-900 mb-0.5">{alert.titulo}</p>
              <p className="text-[10px] text-red-700">{alert.descricao}</p>
              {alert.metadata?.dias_entre !== undefined && (
                <p className="text-[9px] text-red-500 mt-1">
                  {alert.metadata.dias_entre} dias entre remocao e novo anuncio
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending reviews — AC7 with filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <Link2 className="size-3.5 text-orange-500" />
            Sugestoes de Merge
          </h3>
          <div className="flex items-center gap-1">
            <Filter className="size-3 text-gray-400" />
            {(['all', 'high', 'medium'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setScoreFilter(f)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
                  scoreFilter === f ? 'bg-[#003DA5] text-white' : 'bg-gray-100 text-gray-500',
                )}
              >
                {f === 'all' ? 'Todos' : f === 'high' ? '≥75' : '60-74'}
              </button>
            ))}
          </div>
        </div>

        {loadingPending ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Link2 className="size-6 mx-auto mb-1 opacity-50" />
            <p className="text-[10px]">Nenhuma sugestao {scoreFilter !== 'all' ? 'neste filtro' : 'pendente'}.</p>
          </div>
        ) : (
          filteredPending.map((ref) => (
            <div key={ref.id} className="bg-white rounded-xl p-3 shadow-sm border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-bold',
                  ref.match_score >= 75 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
                )}>
                  Score: {ref.match_score}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => confirmMutation.mutate({ id: ref.id, confirm: true })}
                    disabled={confirmMutation.isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                  >
                    <Check className="size-3" />
                    Merge
                  </button>
                  <button
                    onClick={() => confirmMutation.mutate({ id: ref.id, confirm: false })}
                    disabled={confirmMutation.isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    <X className="size-3" />
                    Rejeitar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* Listing A */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="font-medium text-gray-900 capitalize">{ref.listing_a?.portal ?? '?'}</p>
                  <p className="text-gray-600 truncate">{ref.listing_a?.endereco ?? '...'}</p>
                  <p className="text-gray-500">
                    {ref.listing_a?.preco ? formatBRL(ref.listing_a.preco) : '?'} · {ref.listing_a?.area_m2 ?? '?'}m²
                  </p>
                </div>
                {/* Listing B */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="font-medium text-gray-900 capitalize">{ref.listing_b?.portal ?? '?'}</p>
                  <p className="text-gray-600 truncate">{ref.listing_b?.endereco ?? '...'}</p>
                  <p className="text-gray-500">
                    {ref.listing_b?.preco ? formatBRL(ref.listing_b.preco) : '?'} · {ref.listing_b?.area_m2 ?? '?'}m²
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Brain, Search, TrendingUp, AlertTriangle } from 'lucide-react'
import { useLeadEnrichment, useEnrichLead, type EnrichmentData } from '@/hooks/useLeadEnrichment'
import { relativeTime } from '@/hooks/useFeed'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/format'

const PORTAL_COLORS: Record<string, string> = {
  zap: 'bg-purple-100 text-purple-700',
  olx: 'bg-orange-100 text-orange-700',
  vivareal: 'bg-green-100 text-green-700',
  outro: 'bg-gray-100 text-gray-600',
}

interface EnrichmentScreenProps {
  leadId: string
  leadNome: string
  edificioId: string
  edificioEndereco: string
  consultantId: string
  lat: number
  lng: number
}

export function EnrichmentScreen({
  leadId,
  leadNome,
  edificioId,
  edificioEndereco,
  consultantId,
  lat,
  lng,
}: EnrichmentScreenProps) {
  const router = useRouter()
  const { data: enrichment, isLoading: isLoadingExisting } = useLeadEnrichment(leadId)
  const enrichMutation = useEnrichLead()

  function handleEnrich() {
    enrichMutation.mutate({ leadId, edificioId, consultantId, lat, lng })
  }

  const data: EnrichmentData | null = enrichMutation.data || enrichment || null
  const isEnriching = enrichMutation.isPending

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Brain className="size-4 text-[#003DA5]" />
              Inteligência
            </h1>
            <p className="text-xs text-gray-500 truncate">{leadNome} — {edificioEndereco}</p>
          </div>
          {data && (
            <FisboScoreBadge score={data.fisbo_score.score} />
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Enrich button (AC1) */}
        {!data && !isEnriching && !isLoadingExisting && (
          <div className="text-center py-12">
            <Brain className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">
              Busque inteligência de mercado para este lead.
            </p>
            <button
              onClick={handleEnrich}
              className="px-6 py-3 bg-[#003DA5] text-white font-medium rounded-xl hover:bg-[#002d7a] transition-colors inline-flex items-center gap-2"
            >
              <Search className="size-5" />
              Buscar Inteligência
            </button>
          </div>
        )}

        {/* Loading */}
        {(isEnriching || isLoadingExisting) && !data && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-[#003DA5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Buscando inteligência...</p>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Timestamp + refresh */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                Atualizado {relativeTime(data.enriched_at)}
              </span>
              <button
                onClick={handleEnrich}
                disabled={isEnriching}
                className="text-[10px] text-[#003DA5] font-medium hover:underline disabled:opacity-50"
              >
                {isEnriching ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            {/* Market Estimate (AC4) */}
            <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-200">
              <h2 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <TrendingUp className="size-3.5" />
                Estimativa de Mercado
              </h2>
              {data.estimativa_m2.total_comparaveis > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500">Média/m²</p>
                    <p className="text-sm font-bold text-[#003DA5]">
                      {formatBRL(data.estimativa_m2.media)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Mediana/m²</p>
                    <p className="text-sm font-bold text-green-700">
                      {formatBRL(data.estimativa_m2.mediana)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Comparáveis</p>
                    <p className="text-sm font-bold text-purple-700">
                      {data.estimativa_m2.total_comparaveis}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Sem dados de mercado — cadastre comparáveis na ACM.
                </p>
              )}
            </div>

            {/* FISBO Score (AC5) */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-800">Potencial FISBO</h2>
                <FisboScoreBadge score={data.fisbo_score.score} />
              </div>
              {data.fisbo_score.sinais.length > 0 ? (
                <ul className="space-y-1">
                  {data.fisbo_score.sinais.map((sinal, i) => (
                    <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5">+</span>
                      {sinal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">Nenhum sinal de FISBO detectado.</p>
              )}
            </div>

            {/* Nearby Listings (AC3) */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-800 mb-2">
                Anúncios no Entorno ({data.anuncios_entorno.length})
              </h2>
              {data.anuncios_entorno.length > 0 ? (
                <div className="space-y-2">
                  {data.anuncios_entorno.slice(0, 5).map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center gap-2 text-xs border-b border-gray-50 pb-2 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">{listing.endereco}</p>
                        <p className="text-gray-500">
                          {formatBRL(listing.preco)} · {listing.area_m2}m²
                        </p>
                      </div>
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
                      <span className={cn(
                        'text-[9px] font-medium',
                        listing.tempo_mercado_dias > 90
                          ? 'text-red-500'
                          : listing.tempo_mercado_dias > 30
                            ? 'text-yellow-600'
                            : 'text-green-600',
                      )}>
                        {listing.tempo_mercado_dias}d
                      </span>
                    </div>
                  ))}
                  {data.anuncios_entorno.length > 5 && (
                    <p className="text-[10px] text-[#003DA5] font-medium text-center">
                      Ver todos ({data.anuncios_entorno.length})
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Nenhum anúncio ativo encontrado no raio de 100m.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FISBO Score Badge
// ---------------------------------------------------------------------------

function FisboScoreBadge({ score }: { score: number }) {
  const color = score >= 60 ? 'bg-green-100 text-green-700' : score >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', color)}>
      {score >= 60 && <AlertTriangle className="size-3 inline mr-0.5" />}
      FISBO {score}%
    </span>
  )
}

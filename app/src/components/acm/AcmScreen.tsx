'use client'

import { useMemo } from 'react'
import { ArrowLeft, Plus, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useAcmStore, getEffectiveRadius } from '@/store/acm'
import { useComparaveis, useScrapedInRadius, calculateAcmStats } from '@/hooks/useAcm'
import type { ComparavelNoRaio } from '@/lib/supabase/types'

import { AcmMiniMap } from './AcmMiniMap'
import { AcmFilterToggle, AcmFilterBadge } from './AcmFilterToggle'
import { AcmRadiusSelector } from './AcmRadiusSelector'
import { AcmSummaryCards } from './AcmSummaryCards'
import { AcmTable } from './AcmTable'
import { AcmExportMenu } from './AcmExportMenu'
import { AcmImportScraping } from './AcmImportScraping'
import { AddComparableSheet } from './AddComparableSheet'

interface AcmScreenProps {
  leadId: string
  leadNome: string
  edificioEndereco: string
  edificioId: string
  lat: number
  lng: number
  consultantId: string
}

export function AcmScreen({
  leadId,
  leadNome,
  edificioEndereco,
  edificioId,
  lat,
  lng,
  consultantId,
}: AcmScreenProps) {
  const router = useRouter()
  const filterType = useAcmStore((s) => s.filterType)
  const radiusOption = useAcmStore((s) => s.radiusOption)
  const customRadius = useAcmStore((s) => s.customRadius)
  const openAddSheet = useAcmStore((s) => s.openAddSheet)

  const effectiveRadius = getEffectiveRadius(radiusOption, customRadius)

  // Fetch comparáveis via RPC
  const { comparaveis, isLoading } = useComparaveis(
    lat,
    lng,
    consultantId,
    effectiveRadius,
  )

  // Fetch scraped listings for import (AC6)
  const { scrapedListings } = useScrapedInRadius(lat, lng, effectiveRadius)

  // Filter comparáveis based on toggle (AC4)
  const filteredComparaveis: ComparavelNoRaio[] = useMemo(() => {
    if (filterType === 'todos') return comparaveis
    if (filterType === 'venda_real') return comparaveis.filter((c) => c.is_venda_real)
    return comparaveis.filter((c) => !c.is_venda_real)
  }, [comparaveis, filterType])

  // Calculate stats on filtered data (AC3)
  const stats = useMemo(() => calculateAcmStats(filteredComparaveis), [filteredComparaveis])

  // AC7: Export — Incluir no Dossiê callback
  function handleIncluirDossie() {
    // TODO: Story 3.2 — save snapshot JSONB in dossies.acm_snapshot
    console.log('ACM snapshot for dossiê:', { stats, comparaveis: filteredComparaveis, leadId })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <BarChart3 className="size-4 text-[#003DA5]" />
              ACM
            </h1>
            <p className="text-xs text-gray-500 truncate">
              {leadNome} — {edificioEndereco}
            </p>
          </div>
          <AcmExportMenu
            comparaveis={filteredComparaveis}
            stats={stats}
            onIncluirDossie={handleIncluirDossie}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* AC1: Map with radius */}
        <AcmMiniMap
          lat={lat}
          lng={lng}
          radiusOption={radiusOption}
          customRadius={customRadius}
        />

        {/* AC8: Radius selector */}
        <AcmRadiusSelector />

        {/* AC4: Filter toggle + badge */}
        <div className="flex items-center justify-between">
          <AcmFilterToggle />
          <AcmFilterBadge />
        </div>

        {/* AC4: Tooltip */}
        {filterType !== 'todos' && (
          <p className="text-[10px] text-gray-400 -mt-2 px-1">
            Preço de anúncio reflete a expectativa do vendedor. Preço de venda real
            reflete o valor efetivamente transacionado. A diferença média em Moema é
            de 10-15%.
          </p>
        )}

        {/* AC3: Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-3 border-l-4 border-l-gray-200 shadow-sm animate-pulse h-16"
              />
            ))}
          </div>
        ) : (
          <AcmSummaryCards stats={stats} />
        )}

        {/* AC9: VETO PV #3 — Suggestion when few comparables */}
        {!isLoading && comparaveis.length > 0 && comparaveis.length < 3 && (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <p className="text-xs text-blue-700">
              Adicione mais comparáveis para uma análise mais precisa.
            </p>
            <button
              onClick={openAddSheet}
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[#003DA5]"
            >
              <Plus className="size-3.5" />
              Comparável
            </button>
          </div>
        )}

        {/* AC6: Import from scraping */}
        <AcmImportScraping
          scrapedListings={scrapedListings}
          consultantId={consultantId}
        />

        {/* AC2: Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <AcmTable comparaveis={comparaveis} filterType={filterType} />
        )}
      </div>

      {/* AC5: FAB — Add comparable */}
      <button
        onClick={openAddSheet}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#22C55E] hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        aria-label="Adicionar comparável"
      >
        <Plus className="size-6" />
      </button>

      {/* AC5: Bottom sheet */}
      <AddComparableSheet
        consultantId={consultantId}
        edificioReferenciaId={edificioId}
        defaultLat={lat}
        defaultLng={lng}
      />
    </div>
  )
}

'use client'

import { useRef, useCallback, useState } from 'react'
import { useFunnelStore } from '@/store/funnel'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import { useAuthStore } from '@/store/auth'
import { LeadCard } from '@/components/lead/LeadCard'
import { cn } from '@/lib/utils'
import type { EtapaFunil } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

interface TabConfig {
  etapa: EtapaFunil
  label: string
}

const FUNNEL_TABS: TabConfig[] = [
  { etapa: 'contato', label: 'Contato' },
  { etapa: 'v1_agendada', label: 'V1 Agendada' },
  { etapa: 'v1_realizada', label: 'V1 Realizada' },
  { etapa: 'v2_agendada', label: 'V2 Agendada' },
  { etapa: 'v2_realizada', label: 'V2 Realizada' },
  { etapa: 'representacao', label: 'Exclusividade' },
  { etapa: 'venda', label: 'Venda' },
]

const EMPTY_MESSAGES: Record<EtapaFunil, string> = {
  contato: 'Nenhum lead nesta etapa. Prospecte!',
  v1_agendada: 'Nenhuma V1 agendada. Agende visitas!',
  v1_realizada: 'Nenhuma V1 realizada. Continue visitando!',
  v2_agendada: 'Nenhuma V2 agendada. Avance os leads!',
  v2_realizada: 'Nenhuma V2 realizada. Feche apresentações!',
  representacao: 'Nenhum em exclusividade. Continue negociando!',
  venda: 'Nenhuma venda ainda. Você está no caminho!',
  perdido: 'Nenhum lead perdido.',
}

// ---------------------------------------------------------------------------
// Swipe detection hook
// ---------------------------------------------------------------------------

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const SWIPE_THRESHOLD = 60

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        onSwipeLeft()
      } else {
        onSwipeRight()
      }
    }
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchMove, onTouchEnd }
}

// ---------------------------------------------------------------------------
// FunnelTabs — Mobile funnel view with horizontal tabs and swipe
// ---------------------------------------------------------------------------

interface FunnelTabsProps {
  stageCounts: Record<string, number>
}

export function FunnelTabs({ stageCounts }: FunnelTabsProps) {
  const user = useAuthStore((s) => s.user)
  const activeTab = useFunnelStore((s) => s.activeTab)
  const setActiveTab = useFunnelStore((s) => s.setActiveTab)
  const openTransitionModal = useFunnelStore((s) => s.openTransitionModal)

  const { leads, isLoading } = useLeadsByFunnel(
    user?.id ?? null,
    activeTab
  )

  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

  const currentIndex = FUNNEL_TABS.findIndex((t) => t.etapa === activeTab)

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1
    if (nextIndex < FUNNEL_TABS.length) {
      setSlideDirection('left')
      setActiveTab(FUNNEL_TABS[nextIndex].etapa)
      setTimeout(() => setSlideDirection(null), 200)
    }
  }, [currentIndex, setActiveTab])

  const goToPrev = useCallback(() => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setSlideDirection('right')
      setActiveTab(FUNNEL_TABS[prevIndex].etapa)
      setTimeout(() => setSlideDirection(null), 200)
    }
  }, [currentIndex, setActiveTab])

  const swipeHandlers = useSwipe(goToNext, goToPrev)

  const tabsScrollRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view
  const handleTabClick = useCallback(
    (etapa: EtapaFunil, index: number) => {
      const direction = index > currentIndex ? 'left' : index < currentIndex ? 'right' : null
      if (direction) setSlideDirection(direction)
      setActiveTab(etapa)
      setTimeout(() => setSlideDirection(null), 200)
    },
    [currentIndex, setActiveTab]
  )

  // Determine next etapa for transition
  const getNextEtapa = (currentEtapa: EtapaFunil): EtapaFunil | null => {
    const idx = FUNNEL_TABS.findIndex((t) => t.etapa === currentEtapa)
    if (idx >= 0 && idx < FUNNEL_TABS.length - 1) {
      return FUNNEL_TABS[idx + 1].etapa
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs row — horizontal scrollable */}
      <div
        ref={tabsScrollRef}
        className="flex overflow-x-auto border-b border-gray-200 bg-white shrink-0 scrollbar-hide"
        role="tablist"
      >
        {FUNNEL_TABS.map((tab, index) => {
          const isActive = tab.etapa === activeTab
          const count = stageCounts[tab.etapa] ?? 0
          return (
            <button
              key={tab.etapa}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(tab.etapa, index)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-[3px] shrink-0',
                isActive
                  ? 'text-[#003DA5] border-[#003DA5]'
                  : 'text-[#6B7280] border-transparent hover:text-gray-700'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1',
                  isActive
                    ? 'bg-[#003DA5] text-white'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content — leads list with swipe */}
      <div
        className={cn(
          'flex-1 overflow-y-auto px-3 py-3 transition-transform duration-200',
          slideDirection === 'left' && 'animate-slide-in-left',
          slideDirection === 'right' && 'animate-slide-in-right'
        )}
        role="tabpanel"
        {...swipeHandlers}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {EMPTY_MESSAGES[activeTab]}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => {
              const nextEtapa = getNextEtapa(lead.etapa_funil)
              return (
                <div key={lead.id} className="relative group">
                  <LeadCard lead={lead} />
                  {/* Advance button */}
                  {nextEtapa && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openTransitionModal(lead.id, lead.etapa_funil, nextEtapa)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#003DA5] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      title={`Mover para ${nextEtapa}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

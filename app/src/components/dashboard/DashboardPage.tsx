'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { useDashboardKPIs, type DashboardPeriod } from '@/hooks/useDashboard'
import { TerritorialSection } from './TerritorialSection'
import { FunnelSection } from './FunnelSection'
import { MetaDiaria } from './MetaDiaria'
import { InformantesSection } from './InformantesSection'
import { FrogSection } from './FrogSection'
import { UpcomingSection } from './UpcomingSection'

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'trimestre', label: 'Trimestre' },
]

export function DashboardPage() {
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<DashboardPeriod>('mes')
  const { data: kpis, isLoading, refetch } = useDashboardKPIs(user?.id || '', period)

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            aria-label="Atualizar"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mt-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === opt.value
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* Meta diária — always first */}
        <MetaDiaria consultantId={user?.id || ''} />

        {/* Upcoming appointments */}
        <UpcomingSection consultantId={user?.id || ''} />

        {/* Territorial KPIs */}
        <TerritorialSection kpis={kpis?.territorial} isLoading={isLoading} />

        {/* Funnel KPIs */}
        <FunnelSection consultantId={user?.id || ''} period={period} />

        {/* Informantes KPIs */}
        <InformantesSection consultantId={user?.id || ''} />

        {/* FROG KPIs */}
        <FrogSection consultantId={user?.id || ''} />
      </div>
    </div>
  )
}

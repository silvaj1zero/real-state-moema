'use client'

import { cn } from '@/lib/utils'
import type { InformantesKPIs } from '@/hooks/useDashboard'
import { KPICard } from './KPICard'
import { EmptyState } from './EmptyState'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// ---------------------------------------------------------------------------
// InformantesSection
// ---------------------------------------------------------------------------

interface InformantesSectionProps {
  kpis: InformantesKPIs
  className?: string
}

export function InformantesSection({ kpis, className }: InformantesSectionProps) {
  const isEmpty = kpis.totalInformantes === 0

  if (isEmpty) {
    return <EmptyState section="informantes" className={className} />
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: '#059669' }}
        />
        Informantes
      </h3>

      {/* ROI card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-2">
          ROI Gentileza
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[9px] text-gray-400 block">Investido</span>
            <span className="text-xs font-bold text-gray-900">
              {formatCurrencyBR(kpis.totalInvestido)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block">Comissoes</span>
            <span className="text-xs font-bold text-green-600">
              {formatCurrencyBR(kpis.totalComissoes)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block">ROI</span>
            <span
              className={cn(
                'text-xs font-bold',
                kpis.roiGentileza >= 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {kpis.roiGentileza >= 0 ? '+' : ''}{kpis.roiGentileza}%
            </span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard
          title="Total"
          value={kpis.totalInformantes}
          subtitle="informantes"
          color="#059669"
          compact
        />
        <KPICard
          title="Leads/Inf."
          value={kpis.leadsGeradosPorInformante}
          subtitle="media por informante"
          color="#059669"
          compact
        />
      </div>

      {/* Alert: sem contato >15 dias */}
      {kpis.semContato15Dias > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="text-xs font-medium text-red-700">
            {kpis.semContato15Dias} informante{kpis.semContato15Dias > 1 ? 's' : ''} sem contato &gt;15 dias
          </span>
        </div>
      )}
    </div>
  )
}

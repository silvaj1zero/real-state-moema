'use client'

import { cn } from '@/lib/utils'
import type { FunnelKPIs } from '@/hooks/useDashboard'
import { KPICard } from './KPICard'
import { EmptyState } from './EmptyState'

// ---------------------------------------------------------------------------
// Stage labels
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, string> = {
  contato: 'Contato',
  v1_agendada: 'V1 Ag.',
  v1_realizada: 'V1 Real.',
  v2_agendada: 'V2 Ag.',
  v2_realizada: 'V2 Real.',
  representacao: 'Exclus.',
  venda: 'Venda',
}

const STAGE_ORDER = [
  'contato',
  'v1_agendada',
  'v1_realizada',
  'v2_agendada',
  'v2_realizada',
  'representacao',
  'venda',
]

// ---------------------------------------------------------------------------
// Mini funnel visual
// ---------------------------------------------------------------------------

function MiniFunnel({ leadsPorEtapa }: { leadsPorEtapa: FunnelKPIs['leadsPorEtapa'] }) {
  const maxCount = Math.max(
    ...STAGE_ORDER.map((s) => leadsPorEtapa[s as keyof typeof leadsPorEtapa] || 0),
    1,
  )

  return (
    <div className="space-y-1">
      {STAGE_ORDER.map((stage, i) => {
        const count = leadsPorEtapa[stage as keyof typeof leadsPorEtapa] || 0
        const widthPercent = maxCount > 0
          ? Math.max((count / maxCount) * 100, 4)
          : 4
        // Funnel narrows: also reduce by stage index
        const funnelWidth = Math.max(widthPercent * (1 - i * 0.08), 4)

        return (
          <div key={stage} className="flex items-center gap-2">
            <span className="text-[9px] text-gray-400 w-12 text-right shrink-0">
              {STAGE_LABELS[stage]}
            </span>
            <div className="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{
                  width: `${funnelWidth}%`,
                  backgroundColor: `hsl(215, 80%, ${65 - i * 5}%)`,
                }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-700 w-5 text-right">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversion rates row
// ---------------------------------------------------------------------------

function ConversionRates({ conversao }: { conversao: Record<string, number> }) {
  const entries = STAGE_ORDER.slice(0, -1) // no conversion after 'venda'
    .map((stage) => ({
      stage,
      rate: conversao[stage] ?? 0,
    }))

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
      {entries.map(({ stage, rate }) => {
        const color = rate >= 50 ? '#22C55E' : rate >= 30 ? '#EAB308' : '#EF4444'
        return (
          <div
            key={stage}
            className="flex flex-col items-center shrink-0 px-1"
          >
            <span
              className="text-[10px] font-bold"
              style={{ color }}
            >
              {rate}%
            </span>
            <span className="text-[7px] text-gray-400 text-center leading-tight">
              {STAGE_LABELS[stage]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FunnelSection
// ---------------------------------------------------------------------------

interface FunnelSectionProps {
  kpis: FunnelKPIs
  className?: string
}

export function FunnelSection({ kpis, className }: FunnelSectionProps) {
  const isEmpty = kpis.totalLeads === 0

  if (isEmpty) {
    return <EmptyState section="funnel" className={className} />
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: '#D97706' }}
        />
        Funil
      </h3>

      {/* Mini funnel visual */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
            Distribuicao
          </span>
          <span className="text-xs font-bold text-gray-900">
            {kpis.totalLeads} leads
          </span>
        </div>
        <MiniFunnel leadsPorEtapa={kpis.leadsPorEtapa} />
      </div>

      {/* Conversion rates */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-2">
          Conversao por etapa
        </span>
        <ConversionRates conversao={kpis.conversaoPorEtapa} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard
          title="Contatos/dia"
          value={kpis.volumeProspeccaoDiario}
          subtitle="media no periodo"
          color="#D97706"
          compact
        />
        <KPICard
          title="Parados >7d"
          value={kpis.leadsParados7Dias}
          subtitle="leads estagnados"
          color={kpis.leadsParados7Dias > 0 ? '#EF4444' : '#22C55E'}
          trend={kpis.leadsParados7Dias > 3 ? 'down' : 'neutral'}
          compact
        />
      </div>
    </div>
  )
}

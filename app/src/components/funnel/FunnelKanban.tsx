'use client'

import { useAuthStore } from '@/store/auth'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import { useFunnelStore } from '@/store/funnel'
import { LeadCard } from '@/components/lead/LeadCard'
import { cn } from '@/lib/utils'
import type { EtapaFunil, LeadWithEdificio } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Column configuration
// ---------------------------------------------------------------------------

interface ColumnConfig {
  etapa: EtapaFunil
  label: string
  headerColor: string
  headerTextColor: string
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  { etapa: 'contato', label: 'Contato', headerColor: 'bg-gray-500', headerTextColor: 'text-white' },
  { etapa: 'v1_agendada', label: 'V1 Agendada', headerColor: 'bg-[#003DA5]', headerTextColor: 'text-white' },
  { etapa: 'v1_realizada', label: 'V1 Realizada', headerColor: 'bg-[#003DA5]', headerTextColor: 'text-white' },
  { etapa: 'v2_agendada', label: 'V2 Agendada', headerColor: 'bg-[#001D4A]', headerTextColor: 'text-white' },
  { etapa: 'v2_realizada', label: 'V2 Realizada', headerColor: 'bg-[#001D4A]', headerTextColor: 'text-white' },
  { etapa: 'representacao', label: 'Exclusividade', headerColor: 'bg-[#D97706]', headerTextColor: 'text-white' },
  { etapa: 'venda', label: 'Venda', headerColor: 'bg-[#22C55E]', headerTextColor: 'text-white' },
]

const ETAPA_ORDER: EtapaFunil[] = [
  'contato', 'v1_agendada', 'v1_realizada', 'v2_agendada', 'v2_realizada', 'representacao', 'venda'
]

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  column: ColumnConfig
  leads: LeadWithEdificio[]
  isLoading: boolean
  count: number
  onAdvanceLead: (leadId: string, fromEtapa: EtapaFunil, toEtapa: EtapaFunil) => void
}

function KanbanColumn({ column, leads, isLoading, count, onAdvanceLead }: KanbanColumnProps) {
  const currentIndex = ETAPA_ORDER.indexOf(column.etapa)
  const nextEtapa = currentIndex < ETAPA_ORDER.length - 1 ? ETAPA_ORDER[currentIndex + 1] : null

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className={cn('px-3 py-2.5 flex items-center justify-between', column.headerColor)}>
        <span className={cn('text-sm font-semibold', column.headerTextColor)}>
          {column.label}
        </span>
        <span className={cn('text-[10px] min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 bg-white/20', column.headerTextColor)}>
          {count}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-220px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-gray-400 text-center">Nenhum lead</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="group relative">
              <LeadCard lead={lead} />
              {nextEtapa && (
                <button
                  onClick={() => onAdvanceLead(lead.id, column.etapa, nextEtapa)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#003DA5] text-white text-[10px] px-2 py-1 rounded-full shadow-md hover:bg-[#002d7a]"
                  title={`Avançar para ${nextEtapa}`}
                >
                  Avançar →
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FunnelKanban — Desktop Kanban with button-based transitions
// ---------------------------------------------------------------------------

interface FunnelKanbanProps {
  stageCounts: Record<string, number>
}

export function FunnelKanban({ stageCounts }: FunnelKanbanProps) {
  const user = useAuthStore((s) => s.user)
  const openTransitionModal = useFunnelStore((s) => s.openTransitionModal)

  const contatoQuery = useLeadsByFunnel(user?.id ?? null, 'contato')
  const v1AgendadaQuery = useLeadsByFunnel(user?.id ?? null, 'v1_agendada')
  const v1RealizadaQuery = useLeadsByFunnel(user?.id ?? null, 'v1_realizada')
  const v2AgendadaQuery = useLeadsByFunnel(user?.id ?? null, 'v2_agendada')
  const v2RealizadaQuery = useLeadsByFunnel(user?.id ?? null, 'v2_realizada')
  const representacaoQuery = useLeadsByFunnel(user?.id ?? null, 'representacao')
  const vendaQuery = useLeadsByFunnel(user?.id ?? null, 'venda')

  const leadsMap: Record<string, { leads: LeadWithEdificio[]; isLoading: boolean }> = {
    contato: contatoQuery,
    v1_agendada: v1AgendadaQuery,
    v1_realizada: v1RealizadaQuery,
    v2_agendada: v2AgendadaQuery,
    v2_realizada: v2RealizadaQuery,
    representacao: representacaoQuery,
    venda: vendaQuery,
  }

  const handleAdvanceLead = (leadId: string, fromEtapa: EtapaFunil, toEtapa: EtapaFunil) => {
    openTransitionModal(leadId, fromEtapa, toEtapa)
  }

  return (
    <div className="flex gap-3 overflow-x-auto p-4 h-full">
      {KANBAN_COLUMNS.map((column) => {
        const queryData = leadsMap[column.etapa]
        return (
          <KanbanColumn
            key={column.etapa}
            column={column}
            leads={queryData?.leads ?? []}
            isLoading={queryData?.isLoading ?? false}
            count={stageCounts[column.etapa] ?? 0}
            onAdvanceLead={handleAdvanceLead}
          />
        )
      })}
    </div>
  )
}

'use client'

import { useLeadsByEdificio } from '@/hooks/useLeads'
import { useLeadsStore } from '@/store/leads'
import type { EtapaFunil, OrigemLead } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const ETAPA_COLORS: Record<EtapaFunil, string> = {
  contato: '#9CA3AF',
  v1_agendada: '#003DA5',
  v1_realizada: '#003DA5',
  v2_agendada: '#EAB308',
  v2_realizada: '#EAB308',
  representacao: '#22C55E',
  venda: '#10B981',
  perdido: '#EF4444',
}

const ETAPA_LABELS: Record<EtapaFunil, string> = {
  contato: 'Contato',
  v1_agendada: 'V1 Agendada',
  v1_realizada: 'V1 Realizada',
  v2_agendada: 'V2 Agendada',
  v2_realizada: 'V2 Realizada',
  representacao: 'Exclusividade',
  venda: 'Venda',
  perdido: 'Perdido',
}

const ORIGEM_LABELS: Record<OrigemLead, string> = {
  digital: 'Digital',
  placa: 'Placa',
  zelador: 'Zelador',
  indicacao: 'Indicação',
  fisbo_scraping: 'FISBO',
  referral: 'Referral',
  captei: 'Captei',
}

// ---------------------------------------------------------------------------
// LeadList — shows leads in building card
// ---------------------------------------------------------------------------

interface LeadListProps {
  edificioId: string
  maxVisible?: number
  className?: string
}

export function LeadList({ edificioId, maxVisible = 3, className }: LeadListProps) {
  const { leads, isLoading } = useLeadsByEdificio(edificioId)
  const selectLead = useLeadsStore((s) => s.selectLead)

  if (isLoading) {
    return (
      <div className={cn('py-2', className)}>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (leads.length === 0) {
    return null
  }

  const visibleLeads = leads.slice(0, maxVisible)
  const hasMore = leads.length > maxVisible

  return (
    <div className={cn('space-y-2', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
          Leads
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-semibold">
          {leads.length}
        </span>
      </div>

      {/* Lead items */}
      <div className="space-y-1.5">
        {visibleLeads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => selectLead(lead.id)}
            className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            {/* Lead info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {lead.nome}
                </span>
                {lead.unidade && (
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {lead.unidade}
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Origem badge */}
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                {ORIGEM_LABELS[lead.origem]}
              </span>

              {/* Etapa badge */}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium"
                style={{ backgroundColor: ETAPA_COLORS[lead.etapa_funil] }}
              >
                {ETAPA_LABELS[lead.etapa_funil]}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* "Ver todos" link */}
      {hasMore && (
        <button
          onClick={() => {
            // TODO: navigate to full leads view for this building
          }}
          className="text-xs text-[#003DA5] font-medium hover:underline"
        >
          Ver todos ({leads.length})
        </button>
      )}
    </div>
  )
}

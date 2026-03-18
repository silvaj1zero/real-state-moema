'use client'

import { useRouter } from 'next/navigation'
import { useLeadsStore } from '@/store/leads'
import type { EtapaFunil, LeadWithEdificio } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { BarChart3, Home, FileText, Brain } from 'lucide-react'

// ---------------------------------------------------------------------------
// Color maps (same as LeadList for consistency)
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

// ---------------------------------------------------------------------------
// Utility: compute days in current stage
// ---------------------------------------------------------------------------

function daysInStage(etapaChangedAt: string): number {
  const changed = new Date(etapaChangedAt)
  const now = new Date()
  const diffMs = now.getTime() - changed.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

// ---------------------------------------------------------------------------
// LeadCard — individual lead card for funnel view
// ---------------------------------------------------------------------------

interface LeadCardProps {
  lead: LeadWithEdificio
  className?: string
}

export function LeadCard({ lead, className }: LeadCardProps) {
  const router = useRouter()
  const selectLead = useLeadsStore((s) => s.selectLead)
  const days = daysInStage(lead.etapa_changed_at)
  const edificioNome = lead.edificios?.nome || 'Sem edifício'

  return (
    <div
      className={cn(
        'w-full text-left p-3 rounded-xl bg-white border border-gray-200 shadow-sm',
        'hover:shadow-md transition-shadow',
        className,
      )}
    >
      <button
        onClick={() => selectLead(lead.id)}
        className="w-full text-left"
      >
        {/* Top row: name + badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">
            {lead.nome}
          </h4>
          <span
            className="text-[9px] px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap shrink-0"
            style={{ backgroundColor: ETAPA_COLORS[lead.etapa_funil] }}
          >
            {ETAPA_LABELS[lead.etapa_funil]}
          </span>
        </div>

        {/* Building name */}
        <p className="text-xs text-gray-500 truncate mb-1">
          {edificioNome}
        </p>

        {/* Bottom row: unidade + days in stage */}
        <div className="flex items-center justify-between">
          {lead.unidade && (
            <span className="text-[10px] text-gray-400">
              {lead.unidade}
            </span>
          )}
          <span className={cn(
            'text-[10px] font-medium ml-auto',
            days >= 14 ? 'text-red-500' : days >= 7 ? 'text-yellow-600' : 'text-gray-400',
          )}>
            {days === 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias`}
          </span>
        </div>
      </button>

      {/* Action buttons */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/acm/${lead.id}`)
          }}
          className="flex items-center justify-center gap-1 h-8 px-2 text-[10px] font-medium text-[#003DA5] border border-[#003DA5] rounded-lg hover:bg-[#003DA5]/5 transition-colors"
        >
          <BarChart3 className="size-3.5" />
          ACM
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/home-staging/${lead.id}`)
          }}
          className="flex items-center justify-center gap-1 h-8 px-2 text-[10px] font-medium text-[#22C55E] border border-[#22C55E] rounded-lg hover:bg-[#22C55E]/5 transition-colors"
        >
          <Home className="size-3.5" />
          Staging
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/dossie/${lead.id}`)
          }}
          className="flex items-center justify-center gap-1 h-8 px-2 text-[10px] font-medium text-[#003DA5] border border-[#003DA5] rounded-lg hover:bg-[#003DA5]/5 transition-colors"
        >
          <FileText className="size-3.5" />
          Dossiê
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/enrich/${lead.id}`)
          }}
          className="flex items-center justify-center gap-1 h-8 px-2 text-[10px] font-medium text-[#003DA5] border border-[#003DA5] rounded-lg hover:bg-[#003DA5]/5 transition-colors"
        >
          <Brain className="size-3.5" />
          Intel
        </button>
      </div>
    </div>
  )
}

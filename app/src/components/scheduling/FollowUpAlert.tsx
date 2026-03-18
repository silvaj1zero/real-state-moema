'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { useAgendamentosStore } from '@/store/agendamentos'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import { useAgendamentosByConsultant } from '@/hooks/useAgendamentos'
import { cn } from '@/lib/utils'
import type { LeadWithEdificio } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Stale threshold: 3 days without V1 scheduled
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_DAYS = 3

function daysAgo(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// ---------------------------------------------------------------------------
// AlertCard — individual follow-up alert
// ---------------------------------------------------------------------------

interface AlertCardProps {
  lead: LeadWithEdificio
  days: number
  action: string
  actionTipo: 'v1' | 'v2'
}

function AlertCard({ lead, days, action, actionTipo }: AlertCardProps) {
  const openScheduleModal = useAgendamentosStore((s) => s.openScheduleModal)

  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Warning icon + message */}
          <div className="flex items-center gap-1.5 mb-1">
            <svg
              className="w-4 h-4 text-amber-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-amber-800 truncate">
              {lead.nome}
            </p>
          </div>

          <p className="text-xs text-amber-700 ml-5.5">
            {action}
            {days > 0 && (
              <span className="font-medium"> ({days} {days === 1 ? 'dia' : 'dias'})</span>
            )}
          </p>

          {lead.edificios?.nome && (
            <p className="text-[10px] text-amber-500 ml-5.5 mt-0.5 truncate">
              {lead.edificios.nome}
            </p>
          )}
        </div>

        {/* Quick action button */}
        <button
          onClick={() => openScheduleModal(lead.id, actionTipo)}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white',
            actionTipo === 'v2' ? 'bg-[#D97706] hover:bg-[#B45309]' : 'bg-[#003DA5] hover:bg-[#002d7a]',
          )}
        >
          Agendar {actionTipo.toUpperCase()}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FollowUpAlert — detects stale leads and shows alerts
// ---------------------------------------------------------------------------

interface FollowUpAlertProps {
  className?: string
}

export function FollowUpAlert({ className }: FollowUpAlertProps) {
  const user = useAuthStore((s) => s.user)

  // Get leads in "contato" stage
  const { leads: contatoLeads } = useLeadsByFunnel(user?.id ?? null, 'contato')

  // Get leads in "v1_realizada" stage
  const { leads: v1RealizadaLeads } = useLeadsByFunnel(user?.id ?? null, 'v1_realizada')

  // Get all agendamentos for this consultant
  const { agendamentos } = useAgendamentosByConsultant(user?.id ?? null)

  // Compute stale contato leads (>3 days without V1 scheduled)
  const staleContatoLeads = useMemo(() => {
    if (!contatoLeads.length) return []

    // Set of lead IDs that already have a V1 scheduled (agendado or confirmado)
    const leadsWithV1Scheduled = new Set(
      agendamentos
        .filter(
          (a) =>
            a.tipo === 'v1' &&
            (a.status === 'agendado' || a.status === 'confirmado')
        )
        .map((a) => a.lead_id)
    )

    return contatoLeads
      .filter((lead) => {
        const days = daysAgo(lead.etapa_changed_at)
        return days >= STALE_THRESHOLD_DAYS && !leadsWithV1Scheduled.has(lead.id)
      })
      .map((lead) => ({
        lead,
        days: daysAgo(lead.etapa_changed_at),
      }))
      .sort((a, b) => b.days - a.days)
  }, [contatoLeads, agendamentos])

  // Compute leads needing V2 scheduling (v1_realizada without V2 scheduled)
  const leadsNeedingV2 = useMemo(() => {
    if (!v1RealizadaLeads.length) return []

    const leadsWithV2Scheduled = new Set(
      agendamentos
        .filter(
          (a) =>
            a.tipo === 'v2' &&
            (a.status === 'agendado' || a.status === 'confirmado')
        )
        .map((a) => a.lead_id)
    )

    return v1RealizadaLeads
      .filter((lead) => !leadsWithV2Scheduled.has(lead.id))
      .map((lead) => ({
        lead,
        days: daysAgo(lead.etapa_changed_at),
      }))
  }, [v1RealizadaLeads, agendamentos])

  const totalAlerts = staleContatoLeads.length + leadsNeedingV2.length

  if (totalAlerts === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Follow-up ({totalAlerts})
        </h3>
      </div>

      {/* Stale contato leads — need V1 */}
      {staleContatoLeads.map(({ lead, days }) => (
        <AlertCard
          key={lead.id}
          lead={lead}
          days={days}
          action={`Parado em Contato há`}
          actionTipo="v1"
        />
      ))}

      {/* V1 realizada leads — need V2 */}
      {leadsNeedingV2.map(({ lead, days }) => (
        <AlertCard
          key={lead.id}
          lead={lead}
          days={days}
          action="V1 realizada — Agendar V2?"
          actionTipo="v2"
        />
      ))}
    </div>
  )
}

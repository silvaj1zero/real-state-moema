'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { useAgendamentosStore } from '@/store/agendamentos'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import { useAgendamentosByConsultant } from '@/hooks/useAgendamentos'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers: business day calculation
// ---------------------------------------------------------------------------

/**
 * Add N business days to a date (skips Saturday & Sunday).
 * Used to suggest V2 scheduling 3-5 business days after V1.
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Sao_Paulo',
  })
}

// ---------------------------------------------------------------------------
// V2Prompt — Post-V1 V2 scheduling prompt
// ---------------------------------------------------------------------------

interface V2PromptProps {
  className?: string
}

export function V2Prompt({ className }: V2PromptProps) {
  const user = useAuthStore((s) => s.user)
  const openScheduleModal = useAgendamentosStore((s) => s.openScheduleModal)

  // Get leads in v1_realizada stage
  const { leads: v1RealizadaLeads } = useLeadsByFunnel(user?.id ?? null, 'v1_realizada')

  // Get all agendamentos for filtering
  const { agendamentos } = useAgendamentosByConsultant(user?.id ?? null)

  // Filter leads that don't have V2 scheduled yet
  const leadsNeedingV2 = useMemo(() => {
    if (!v1RealizadaLeads.length) return []

    const leadsWithV2 = new Set(
      agendamentos
        .filter(
          (a) =>
            a.tipo === 'v2' &&
            (a.status === 'agendado' || a.status === 'confirmado')
        )
        .map((a) => a.lead_id)
    )

    return v1RealizadaLeads.filter((lead) => !leadsWithV2.has(lead.id))
  }, [v1RealizadaLeads, agendamentos])

  if (leadsNeedingV2.length === 0) return null

  const now = new Date()
  const suggestedDate = addBusinessDays(now, 3)
  const suggestedDateEnd = addBusinessDays(now, 5)

  return (
    <div className={cn('space-y-2', className)}>
      {leadsNeedingV2.map((lead) => (
        <div
          key={lead.id}
          className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-sm"
        >
          <div className="flex items-start gap-3">
            {/* Checkmark icon */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                V1 realizada!
              </p>
              <p className="text-xs text-gray-700 mt-0.5">
                <span className="font-medium">{lead.nome}</span>
                {lead.edificios?.nome && (
                  <span className="text-gray-500"> — {lead.edificios.nome}</span>
                )}
              </p>

              {/* Suggested date range */}
              <p className="text-xs text-amber-700 mt-2">
                Agendar V2 entre{' '}
                <span className="font-medium">{formatDate(suggestedDate)}</span>
                {' e '}
                <span className="font-medium">{formatDate(suggestedDateEnd)}</span>
                {' '}(3-5 dias úteis)
              </p>

              {/* Action button */}
              <button
                onClick={() => openScheduleModal(lead.id, 'v2')}
                className="mt-3 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-medium transition-colors"
              >
                Agendar V2
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

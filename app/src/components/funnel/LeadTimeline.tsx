'use client'

import { useLeadTransitions } from '@/hooks/useFunnel'
import { cn } from '@/lib/utils'
import type { EtapaFunil, FunnelTransition } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Etapa labels and colors
// ---------------------------------------------------------------------------

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

const ETAPA_COLORS: Record<EtapaFunil, string> = {
  contato: '#6B7280',
  v1_agendada: '#003DA5',
  v1_realizada: '#003DA5',
  v2_agendada: '#001D4A',
  v2_realizada: '#001D4A',
  representacao: '#D97706',
  venda: '#22C55E',
  perdido: '#EF4444',
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`
  return formatDate(dateStr)
}

// ---------------------------------------------------------------------------
// TimelineEntry
// ---------------------------------------------------------------------------

interface TimelineEntryProps {
  transition: FunnelTransition
  isLast: boolean
}

function TimelineEntry({ transition, isLast }: TimelineEntryProps) {
  const toColor = ETAPA_COLORS[transition.to_etapa]

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            'w-3 h-3 rounded-full shrink-0 ring-2 ring-white',
            transition.is_retrocesso && 'ring-red-100'
          )}
          style={{
            backgroundColor: transition.is_retrocesso ? '#EF4444' : toColor,
          }}
        />
        {/* Line */}
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-[24px] bg-gray-200" />
        )}
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        {/* Date + Retrocesso badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-gray-400">
            {formatRelativeDate(transition.created_at)}
          </span>
          {transition.is_retrocesso && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              Retrocesso
            </span>
          )}
        </div>

        {/* From → To */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {transition.from_etapa && (
            <>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: ETAPA_COLORS[transition.from_etapa] }}
              >
                {ETAPA_LABELS[transition.from_etapa]}
              </span>
              <svg
                className="w-3 h-3 text-gray-400 shrink-0"
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
            </>
          )}
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: toColor }}
          >
            {ETAPA_LABELS[transition.to_etapa]}
          </span>
        </div>

        {/* Observacao */}
        {transition.observacao && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {transition.observacao}
          </p>
        )}

        {/* Justificativa (for retrocesso) */}
        {transition.is_retrocesso && transition.justificativa && (
          <div className="mt-1.5 p-2 rounded bg-red-50 border border-red-100">
            <p className="text-[10px] font-medium text-red-700 mb-0.5">
              Justificativa:
            </p>
            <p className="text-xs text-red-600">
              {transition.justificativa}
            </p>
          </div>
        )}

        {/* Full date on hover */}
        <p className="text-[9px] text-gray-300 mt-1">
          {formatDate(transition.created_at)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LeadTimeline — Chronological transition history
// ---------------------------------------------------------------------------

interface LeadTimelineProps {
  leadId: string | null
  className?: string
}

export function LeadTimeline({ leadId, className }: LeadTimelineProps) {
  const { transitions, isLoading } = useLeadTransitions(leadId)

  if (!leadId) return null

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-4 h-4 text-gray-500"
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
        <h3 className="text-sm font-semibold text-gray-700">
          Histórico de Transições
        </h3>
        {transitions.length > 0 && (
          <span className="text-[10px] text-gray-400">
            ({transitions.length})
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && transitions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-gray-400">
            Nenhuma transição registrada para este lead.
          </p>
        </div>
      )}

      {/* Timeline entries */}
      {!isLoading && transitions.length > 0 && (
        <div className="pl-1">
          {transitions.map((transition, index) => (
            <TimelineEntry
              key={transition.id}
              transition={transition}
              isLast={index === transitions.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

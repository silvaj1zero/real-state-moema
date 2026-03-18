'use client'

import { useAuthStore } from '@/store/auth'
import { useUpcomingAgendamentos } from '@/hooks/useAgendamentos'
import { cn } from '@/lib/utils'
import type { TipoAgendamento } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const TIPO_COLORS: Record<TipoAgendamento, string> = {
  v1: '#003DA5',
  v2: '#D97706',
  follow_up: '#6B7280',
  safari: '#059669',
  outro: '#9CA3AF',
}

const TIPO_LABELS: Record<TipoAgendamento, string> = {
  v1: 'V1',
  v2: 'V2',
  follow_up: 'Follow-up',
  safari: 'Safari',
  outro: 'Outro',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))
    return diffMinutes <= 0 ? 'Agora' : `Em ${diffMinutes}min`
  }

  if (diffHours < 24) {
    return `Em ${diffHours}h`
  }

  if (diffDays === 1) {
    return `Amanhã ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`
  }

  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// ---------------------------------------------------------------------------
// UpcomingWidget — compact widget for dashboard
// ---------------------------------------------------------------------------

interface UpcomingWidgetProps {
  className?: string
}

export function UpcomingWidget({ className }: UpcomingWidgetProps) {
  const user = useAuthStore((s) => s.user)
  const { agendamentos, isLoading } = useUpcomingAgendamentos(user?.id ?? null, 3)

  if (isLoading) {
    return (
      <div className={cn('rounded-xl bg-white border border-gray-200 p-4', className)}>
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl bg-white border border-gray-200 shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#003DA5]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Próximos Agendamentos
          </h3>
        </div>
        {agendamentos.length > 0 && (
          <span className="text-[10px] text-gray-400">
            {agendamentos.length} próximo{agendamentos.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {agendamentos.length === 0 ? (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-gray-400 py-3">
            Sem agendamentos próximos
          </p>
        </div>
      ) : (
        <div className="px-4 pb-3 space-y-1.5">
          {agendamentos.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Tipo color dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: TIPO_COLORS[a.tipo] }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {a.lead_nome ?? 'Lead'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {formatRelativeDate(a.data_hora)}
                </p>
              </div>

              {/* Tipo badge */}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium shrink-0"
                style={{ backgroundColor: TIPO_COLORS[a.tipo] }}
              >
                {TIPO_LABELS[a.tipo]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

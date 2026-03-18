'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { useAgendamentosByConsultant, useUpdateAgendamento } from '@/hooks/useAgendamentos'
import { cn } from '@/lib/utils'
import type { Agendamento, StatusAgendamento, TipoAgendamento } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Color and label maps
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<StatusAgendamento, string> = {
  agendado: '#EAB308',
  confirmado: '#22C55E',
  realizado: '#9CA3AF',
  cancelado: '#EF4444',
  reagendado: '#3B82F6',
}

const STATUS_LABELS: Record<StatusAgendamento, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
}

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

function formatDateTime(iso: string): string {
  const date = new Date(iso)
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
// AgendaItem — individual appointment row
// ---------------------------------------------------------------------------

interface AgendaItemProps {
  agendamento: Agendamento & { lead_nome?: string }
  onConfirm: (id: string, leadId: string) => void
  onCancel: (id: string, leadId: string) => void
  onMarkDone: (id: string, leadId: string) => void
  isPending: boolean
}

function AgendaItem({ agendamento, onConfirm, onCancel, onMarkDone, isPending }: AgendaItemProps) {
  const [swipeOpen, setSwipeOpen] = useState(false)
  const isActive = agendamento.status === 'agendado' || agendamento.status === 'confirmado'

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe action buttons (revealed on tap/swipe) */}
      {swipeOpen && isActive && (
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2 z-10">
          {agendamento.status === 'agendado' && (
            <button
              onClick={() => { onConfirm(agendamento.id, agendamento.lead_id); setSwipeOpen(false) }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium"
            >
              Confirmar
            </button>
          )}
          {isActive && (
            <button
              onClick={() => { onMarkDone(agendamento.id, agendamento.lead_id); setSwipeOpen(false) }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-xs font-medium"
            >
              Realizado
            </button>
          )}
          <button
            onClick={() => { onCancel(agendamento.id, agendamento.lead_id); setSwipeOpen(false) }}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Main card */}
      <button
        type="button"
        onClick={() => isActive && setSwipeOpen(!swipeOpen)}
        className={cn(
          'w-full text-left p-3 bg-white border border-gray-200 shadow-sm transition-transform',
          swipeOpen && 'translate-x-[-180px]',
          !isActive && 'opacity-60',
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          {/* Lead name */}
          <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">
            {agendamento.lead_nome ?? 'Lead'}
          </h4>

          {/* Tipo badge */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap shrink-0"
            style={{ backgroundColor: TIPO_COLORS[agendamento.tipo] }}
          >
            {TIPO_LABELS[agendamento.tipo]}
          </span>
        </div>

        {/* Date/time */}
        <p className="text-xs text-gray-600 mb-1">
          {formatDateTime(agendamento.data_hora)}
        </p>

        {/* Alternative option if present */}
        {agendamento.opcao_alternativa && (
          <p className="text-[10px] text-gray-400 mb-1">
            Alt: {formatDateTime(agendamento.opcao_alternativa)}
          </p>
        )}

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: STATUS_COLORS[agendamento.status] }}
          >
            {STATUS_LABELS[agendamento.status]}
          </span>

          {/* Swipe hint */}
          {isActive && !swipeOpen && (
            <span className="text-[9px] text-gray-300">
              toque para ações
            </span>
          )}
        </div>

        {/* Notas */}
        {agendamento.notas && (
          <p className="text-[10px] text-gray-400 mt-1 truncate">
            {agendamento.notas}
          </p>
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AgendaList — chronological agenda view
// ---------------------------------------------------------------------------

interface AgendaListProps {
  className?: string
}

export function AgendaList({ className }: AgendaListProps) {
  const user = useAuthStore((s) => s.user)
  const { agendamentos, isLoading } = useAgendamentosByConsultant(user?.id ?? null)
  const updateMutation = useUpdateAgendamento()

  // Filter to upcoming agendamentos (agendado or confirmado), sorted by data_hora
  const upcoming = agendamentos
    .filter((a) => a.status === 'agendado' || a.status === 'confirmado')
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

  // Past agendamentos (realizado, cancelado, reagendado)
  const past = agendamentos
    .filter((a) => a.status === 'realizado' || a.status === 'cancelado' || a.status === 'reagendado')
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
    .slice(0, 10) // Show last 10

  const handleConfirm = useCallback(
    (id: string, leadId: string) => {
      updateMutation.mutate({ id, lead_id: leadId, updates: { status: 'confirmado' } })
    },
    [updateMutation]
  )

  const handleCancel = useCallback(
    (id: string, leadId: string) => {
      updateMutation.mutate({ id, lead_id: leadId, updates: { status: 'cancelado' } })
    },
    [updateMutation]
  )

  const handleMarkDone = useCallback(
    (id: string, leadId: string) => {
      updateMutation.mutate({ id, lead_id: leadId, updates: { status: 'realizado' } })
    },
    [updateMutation]
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className={cn('text-center py-10', className)}>
        <svg
          className="w-12 h-12 mx-auto text-gray-300 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-gray-500">Nenhum agendamento</p>
        <p className="text-xs text-gray-400 mt-1">
          Agende visitas V1/V2 pelo funil de leads
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upcoming section */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Próximos
          </h3>
          <div className="space-y-2">
            {upcoming.map((a) => (
              <AgendaItem
                key={a.id}
                agendamento={a}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onMarkDone={handleMarkDone}
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past section */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Anteriores
          </h3>
          <div className="space-y-2">
            {past.map((a) => (
              <AgendaItem
                key={a.id}
                agendamento={a}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onMarkDone={handleMarkDone}
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

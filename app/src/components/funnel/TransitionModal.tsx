'use client'

import { useState, useCallback } from 'react'
import { useFunnelStore } from '@/store/funnel'
import { useAuthStore } from '@/store/auth'
import { useTransitionLead, isRetrocesso } from '@/hooks/useFunnel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { EtapaFunil } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Etapa labels
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
// TransitionModal
// ---------------------------------------------------------------------------

export function TransitionModal() {
  const user = useAuthStore((s) => s.user)
  const {
    transitionModalOpen,
    transitionModalLeadId,
    transitionModalFromEtapa,
    transitionModalTargetEtapa,
    closeTransitionModal,
  } = useFunnelStore()

  const transitionMutation = useTransitionLead()

  const [observacao, setObservacao] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fromEtapa = transitionModalFromEtapa
  const toEtapa = transitionModalTargetEtapa
  const isRegression = fromEtapa && toEtapa ? isRetrocesso(fromEtapa, toEtapa) : false

  const handleClose = useCallback(() => {
    setObservacao('')
    setJustificativa('')
    setError(null)
    closeTransitionModal()
  }, [closeTransitionModal])

  const handleConfirm = useCallback(async () => {
    if (!transitionModalLeadId || !fromEtapa || !toEtapa || !user?.id) return

    setError(null)

    // Validate observacao
    if (!observacao.trim()) {
      setError('Observação é obrigatória.')
      return
    }

    // PV Guardrail: retrocesso requires justificativa
    if (isRegression && (!justificativa.trim() || justificativa.trim().length < 10)) {
      setError('Justificativa obrigatória para retrocesso (mínimo 10 caracteres).')
      return
    }

    try {
      await transitionMutation.mutateAsync({
        lead_id: transitionModalLeadId,
        consultant_id: user.id,
        from_etapa: fromEtapa,
        to_etapa: toEtapa,
        observacao: observacao.trim(),
        justificativa: isRegression ? justificativa.trim() : undefined,
      })

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao realizar transição.')
    }
  }, [
    transitionModalLeadId,
    fromEtapa,
    toEtapa,
    user?.id,
    observacao,
    justificativa,
    isRegression,
    transitionMutation,
    handleClose,
  ])

  if (!transitionModalOpen || !fromEtapa || !toEtapa) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl mx-0 sm:mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {isRegression ? 'Retroceder Lead' : 'Mover Lead'}
          </h2>

          {/* From → To indicator */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: ETAPA_COLORS[fromEtapa] }}
            >
              {ETAPA_LABELS[fromEtapa]}
            </span>
            <svg
              className="w-5 h-5 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: ETAPA_COLORS[toEtapa] }}
            >
              {ETAPA_LABELS[toEtapa]}
            </span>
          </div>
        </div>

        {/* Retrocesso warning banner */}
        {isRegression && (
          <div className="mx-5 mb-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2">
            <svg
              className="w-5 h-5 text-[#EAB308] shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Retrocesso detectado
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Justificativa obrigatória. Este retrocesso será registrado e contabilizado no diagnóstico.
              </p>
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="px-5 space-y-4">
          {/* Data — auto-filled now */}
          <div>
            <Label htmlFor="transition-date" className="text-sm text-gray-700 mb-1">
              Data
            </Label>
            <input
              id="transition-date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              readOnly
            />
          </div>

          {/* Observação (required) */}
          <div>
            <Label htmlFor="transition-obs" className="text-sm text-gray-700 mb-1">
              O que aconteceu? <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="transition-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o que aconteceu nesta transição..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
            />
          </div>

          {/* Justificativa (required for retrocesso) */}
          {isRegression && (
            <div>
              <Label htmlFor="transition-justificativa" className="text-sm text-gray-700 mb-1">
                Justificativa do retrocesso <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="transition-justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Por que este lead está retrocedendo? (mínimo 10 caracteres)"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-yellow-300 bg-yellow-50/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
              />
              {justificativa.length > 0 && justificativa.length < 10 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {10 - justificativa.length} caracteres restantes
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 mt-2">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={handleClose}
            disabled={transitionMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            className={cn(
              'flex-1 h-10 text-white',
              isRegression
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-[#003DA5] hover:bg-[#002d7a]'
            )}
            onClick={handleConfirm}
            disabled={transitionMutation.isPending}
          >
            {transitionMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>

        {/* Safe area bottom padding for mobile */}
        <div className="h-safe-area-bottom sm:hidden" />
      </div>
    </div>
  )
}

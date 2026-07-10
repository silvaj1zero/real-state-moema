'use client'

import { useCallback } from 'react'
import { useTransitionLead } from '@/hooks/useFunnel'
import { useAgendamentosStore } from '@/store/agendamentos'
import type { ContatoStatus } from '@/lib/supabase/types'
import type { RegisterContatoStatusResult } from '@/hooks/useFisboCallList'

// =============================================================================
// useCallListBridge — ponte da call list com o funil/agenda (Story 10.1, AC5)
//
// Ao marcar `agendado`: move o lead para `v1_agendada` (apenas a partir de
// `contato`/`null` — evita retrocesso/avanço indevido) e abre o ScheduleModal
// (Técnica de Duas Opções) reusando o fluxo de agendamento existente.
// =============================================================================

export function useRegisterContatoStatusBridge() {
  const transitionMutation = useTransitionLead()
  const openScheduleModal = useAgendamentosStore((s) => s.openScheduleModal)

  const onAfterRegister = useCallback(
    async (
      status: ContatoStatus,
      result: RegisterContatoStatusResult,
      consultantId: string,
    ) => {
      if (status !== 'agendado') return

      // Move para v1_agendada só se ainda estiver no início do funil.
      if (result.etapaFunil === 'contato' || result.etapaFunil == null) {
        try {
          // O guard acima garante etapa de origem 'contato'.
          await transitionMutation.mutateAsync({
            lead_id: result.leadId,
            consultant_id: consultantId,
            from_etapa: 'contato',
            to_etapa: 'v1_agendada',
            observacao: 'Agendamento via call list FISBO (Epic 10).',
          })
        } catch {
          // não bloqueia o agendamento se a transição falhar
        }
      }

      openScheduleModal(result.leadId, 'v1')
    },
    [transitionMutation, openScheduleModal],
  )

  return { onAfterRegister }
}

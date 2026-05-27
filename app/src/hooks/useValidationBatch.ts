'use client'

/**
 * useValidationBatch — Story 7.9 AC2.
 *
 * Client hook que envolve o Server Action saveDecision com transition
 * state e invalidacao do RSC via router.refresh(). Mantem o padrao de
 * "Server Component fetch + Server Action update" sem TanStack para
 * essa pagina (admin-only, 1 dataset, sem realtime).
 */

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveDecision,
  type LucianaDecision,
  type SaveDecisionInput,
} from '@/app/admin/validation-workshop/actions'

export interface UseValidationBatchResult {
  isPending: boolean
  save: (
    input: SaveDecisionInput
  ) => Promise<{ ok: true } | { ok: false; error: string }>
}

export function useValidationBatch(): UseValidationBatchResult {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const save = (input: SaveDecisionInput) =>
    new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
      startTransition(async () => {
        const result = await saveDecision(input)
        if (result.ok) {
          router.refresh()
          resolve({ ok: true })
        } else {
          resolve({ ok: false, error: result.error })
        }
      })
    })

  return { isPending, save }
}

export type { LucianaDecision, SaveDecisionInput }

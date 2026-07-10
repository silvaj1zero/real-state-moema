'use client'

/**
 * OwnerLookupButton — Story 6.7 (AC1, AC9).
 *
 * Botao "Quem e o dono?" no card do edificio. Visivel apenas para tipologia
 * residencial (adaptacao do AC1: o schema nao tem `tipo_residencial` boolean;
 * o dado real e `edificios_qualificacoes.tipologia` — ocultamos comercial e
 * outro; mostramos residencial vertical/horizontal, misto e desconhecida).
 * Os estados loading/success/error/forbidden/budget_exceeded vivem no modal.
 */

import { useState } from 'react'
import { UserSearch } from 'lucide-react'
import { OwnerLookupModal } from './OwnerLookupModal'
import type { TipologiaEdificio } from '@/lib/supabase/types'

/** Moema e majoritariamente residencial: só escondemos o que é sabidamente não-residencial. */
export function isResidencialTipologia(tipologia: TipologiaEdificio | null | undefined): boolean {
  return tipologia !== 'comercial' && tipologia !== 'outro'
}

interface OwnerLookupButtonProps {
  edificioId: string
  edificioNome: string
  endereco: string | null
  tipologia: TipologiaEdificio | null | undefined
  consultantId: string
  /** AC8: repassa ?quiet=1 ao modal (cache hit silencioso sem evento). */
  quiet?: boolean
}

export function OwnerLookupButton({
  edificioId,
  edificioNome,
  endereco,
  tipologia,
  consultantId,
  quiet,
}: OwnerLookupButtonProps) {
  const [open, setOpen] = useState(false)

  if (!isResidencialTipologia(tipologia)) return null

  // AC8: sem prop explicita, deriva de ?quiet=1 na URL atual.
  const effectiveQuiet =
    quiet ??
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('quiet') === '1')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={open}
        title="Consulta cartório (R$0,28)"
        aria-label="Consultar proprietário via cartório (custa R$0,28)"
        className="flex-1 h-11 text-sm font-medium text-[#003DA5] bg-[#003DA5]/10 rounded-lg flex items-center justify-center gap-2 hover:bg-[#003DA5]/15 disabled:opacity-50"
      >
        <UserSearch className="size-4" />
        Quem é o dono?
      </button>

      {open && (
        <OwnerLookupModal
          edificioId={edificioId}
          edificioNome={edificioNome}
          endereco={endereco}
          consultantId={consultantId}
          quiet={effectiveQuiet}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

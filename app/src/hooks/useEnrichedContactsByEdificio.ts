'use client'

/**
 * useEnrichedContactsByEdificio — Story 6.7 (AC3b).
 *
 * Contatos enriquecidos (Epic 6) dos anuncios vinculados ao edificio via
 * fn_enriched_contacts_by_edificio (migration 024, dedup por telefone no SQL).
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { EnrichedContactByEdificio } from '@/lib/supabase/types'

export function useEnrichedContactsByEdificio(edificioId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['enriched-contacts', edificioId],
    enabled: Boolean(edificioId),
    queryFn: async (): Promise<EnrichedContactByEdificio[]> => {
      const { data, error } = await supabase.rpc('fn_enriched_contacts_by_edificio', {
        p_edificio_id: edificioId,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as EnrichedContactByEdificio[]
    },
  })
}

/** Melhor contato para prefill do CaptarLeadModal: telefone > whatsapp > email. */
export function bestContact(contacts: EnrichedContactByEdificio[]): EnrichedContactByEdificio | null {
  if (contacts.length === 0) return null
  return (
    contacts.find((c) => c.telefone) ??
    contacts.find((c) => c.whatsapp) ??
    contacts.find((c) => c.email) ??
    contacts[0]
  )
}

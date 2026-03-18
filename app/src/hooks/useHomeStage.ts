'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Home Staging templates — hardcoded MVP
// ---------------------------------------------------------------------------

export interface HomeStageRule {
  id: string
  icon: 'home' | 'lightbulb' | 'package'
  title: string
  description: string
  borderColor: string
}

export const DEFAULT_RULES: HomeStageRule[] = [
  {
    id: 'despersonalize',
    icon: 'home',
    title: 'Despersonalize',
    description:
      'Retire fotos pessoais, objetos religiosos e itens muito específicos. O comprador precisa se imaginar morando ali.',
    borderColor: '#003DA5',
  },
  {
    id: 'ilumine',
    icon: 'lightbulb',
    title: 'Ilumine',
    description:
      'Abra todas as cortinas, acenda todas as luzes. Ambientes claros parecem maiores e mais convidativos.',
    borderColor: '#EAB308',
  },
  {
    id: 'organize',
    icon: 'package',
    title: 'Organize',
    description:
      'Guarde itens do dia-a-dia (sapatos, roupas, louças). Cada ambiente deve mostrar seu melhor uso.',
    borderColor: '#22C55E',
  },
]

export type Tipologia = 'apartamento' | 'casa' | 'comercial' | 'cobertura'

export const TIPOLOGIA_TIPS: Record<Tipologia, string> = {
  apartamento:
    'Valorize a varanda: plantas, mesa pequena. Garagens: limpas e organizadas.',
  casa: 'Jardim: gramado aparado, piscina limpa. Fachada: pintura em dia.',
  comercial:
    'Deixe o espaço neutro: sem logos ou decoração específica do negócio anterior.',
  cobertura:
    'Terraço é o diferencial: móveis de área externa, iluminação indireta.',
}

// ---------------------------------------------------------------------------
// localStorage persistence for custom templates (MVP)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'home-staging-custom-rules'

export function getCustomRules(consultantId: string): HomeStageRule[] | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${consultantId}`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveCustomRules(consultantId: string, rules: HomeStageRule[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${STORAGE_KEY}-${consultantId}`, JSON.stringify(rules))
}

export function clearCustomRules(consultantId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${STORAGE_KEY}-${consultantId}`)
}

// ---------------------------------------------------------------------------
// useUpdateChecklist — mark home_staging_enviado = true
// ---------------------------------------------------------------------------

export function useUpdateHomeStageChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leadId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('checklists_preparacao')
        .update({ home_staging_enviado: true })
        .eq('lead_id', leadId)
        .eq('tipo', 'preparacao_v2')

      if (error) {
        // Graceful — checklist may not exist
        console.warn('Checklist update skipped:', error.message)
      }
    },
    onSettled: (_d, _e, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', leadId] })
    },
  })
}

// ---------------------------------------------------------------------------
// WhatsApp message builder
// ---------------------------------------------------------------------------

export function buildWhatsAppUrl(
  telefone: string | null,
  leadNome: string,
  endereco: string,
): string | null {
  if (!telefone) return null
  const cleaned = telefone.replace(/\D/g, '')
  const intl = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  const msg = encodeURIComponent(
    `Olá ${leadNome}, preparei um guia de Home Staging para o seu imóvel na ${endereco}. Seguindo essas 3 dicas simples, seu imóvel vai se destacar nas visitas! 🏠✨`,
  )
  return `https://wa.me/${intl}?text=${msg}`
}

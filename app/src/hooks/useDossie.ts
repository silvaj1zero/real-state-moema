'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DossieData {
  id: string
  lead_id: string
  consultant_id: string
  titulo: string
  pdf_url: string | null
  acm_snapshot: AcmSnapshot | null
  plano_marketing: PlanoMarketing
  historico_resultados: HistoricoResultados
  versao: number
  created_at: string
  updated_at: string
}

export interface AcmSnapshot {
  mediaPrecoM2: number
  medianaPrecoM2: number
  totalComparaveis: number
  top5: Array<{
    endereco: string
    preco: number
    preco_m2: number
    area_m2: number
    is_venda_real: boolean
  }>
}

export interface PlanoMarketing {
  estrategia: string
  canais: string
  timeline: string
}

export interface HistoricoResultados {
  vendasRealizadas: number
  tempoMedio: string
  depoimentos: string
}

export const DEFAULT_PLANO: PlanoMarketing = {
  estrategia:
    'Divulgação premium em portais selecionados (ZAP, VivaReal), rede de corretores RE/MAX, marketing digital direcionado e open house exclusivo.',
  canais: 'ZAP Imóveis, VivaReal, Instagram RE/MAX Galeria, rede de corretores, WhatsApp list',
  timeline: 'Semana 1: Fotos profissionais → Semana 2: Publicação portais → Semana 3: Open house → Semana 4: Revisão e ajuste de preço se necessário',
}

export const DEFAULT_HISTORICO: HistoricoResultados = {
  vendasRealizadas: 47,
  tempoMedio: '45 dias em média',
  depoimentos: 'A Luciana foi excepcional! Vendeu nosso apartamento em Moema em 30 dias, acima do preço esperado.',
}

// ---------------------------------------------------------------------------
// useDossie — fetch existing dossie for lead
// ---------------------------------------------------------------------------

export function useDossie(leadId: string | null) {
  return useQuery({
    queryKey: ['dossie', leadId],
    queryFn: async (): Promise<DossieData | null> => {
      if (!leadId) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dossies')
        .select('*')
        .eq('lead_id', leadId)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch dossie: ${error.message}`)
      }
      return data as DossieData | null
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useCreateDossie — save dossie to DB
// ---------------------------------------------------------------------------

export interface CreateDossieInput {
  lead_id: string
  consultant_id: string
  titulo: string
  acm_snapshot: AcmSnapshot | null
  plano_marketing: PlanoMarketing
  historico_resultados: HistoricoResultados
  pdf_blob?: Blob
}

export function useCreateDossie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDossieInput): Promise<DossieData> => {
      const supabase = createClient()

      // Get next version
      const { data: maxVersion } = await supabase
        .from('dossies')
        .select('versao')
        .eq('lead_id', input.lead_id)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle()

      const versao = (maxVersion?.versao || 0) + 1
      let pdf_url: string | null = null

      // Upload PDF if blob provided
      if (input.pdf_blob) {
        const path = `${input.consultant_id}/${input.lead_id}/dossie-v${versao}.pdf`
        const { error: uploadError } = await supabase.storage
          .from('dossies')
          .upload(path, input.pdf_blob, { contentType: 'application/pdf', upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('dossies').getPublicUrl(path)
          pdf_url = urlData.publicUrl
        }
      }

      const { data, error } = await supabase
        .from('dossies')
        .insert({
          lead_id: input.lead_id,
          consultant_id: input.consultant_id,
          titulo: input.titulo,
          pdf_url,
          acm_snapshot: input.acm_snapshot,
          plano_marketing: input.plano_marketing,
          historico_resultados: input.historico_resultados,
          versao,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create dossie: ${error.message}`)

      // Update checklist
      await supabase
        .from('checklists_preparacao')
        .update({ dossie_montado: true })
        .eq('lead_id', input.lead_id)
        .eq('tipo', 'preparacao_v2')

      return data as DossieData
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: ['dossie', input.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['checklist', input.lead_id] })
    },
  })
}

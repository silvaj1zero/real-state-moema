'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

interface CaptarInput {
  listing: ScrapedListingParametric
  consultantId: string
  searchId?: string | null
}

interface CaptarResult {
  leadId: string
  isDuplicate: boolean
  duplicateLeadId?: string
}

/**
 * Check for duplicate leads by phone or edificio_id
 */
async function checkDuplicate(
  consultantId: string,
  telefone: string | null,
  edificioId: string | null
): Promise<{ isDuplicate: boolean; existingLeadId?: string; existingName?: string }> {
  const supabase = createClient()

  if (telefone) {
    const { data } = await supabase
      .from('leads')
      .select('id, nome')
      .eq('consultant_id', consultantId)
      .eq('telefone', telefone)
      .limit(1)
      .maybeSingle()

    if (data) return { isDuplicate: true, existingLeadId: data.id, existingName: data.nome }
  }

  if (edificioId) {
    const { data } = await supabase
      .from('leads')
      .select('id, nome')
      .eq('consultant_id', consultantId)
      .eq('edificio_id', edificioId)
      .limit(1)
      .maybeSingle()

    if (data) return { isDuplicate: true, existingLeadId: data.id, existingName: data.nome }
  }

  return { isDuplicate: false }
}

/**
 * Hook: Create a single lead from a search result listing
 */
export function useCaptarLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listing, consultantId, searchId }: CaptarInput): Promise<CaptarResult> => {
      const supabase = createClient()

      // Try to match building if not already matched
      let edificioId = listing.matched_edificio_id
      if (!edificioId && listing.endereco) {
        // Attempt PostGIS match via existing listings coordinates
        const { data: matchResult } = await supabase.rpc('fn_match_listing_edificio', {
          p_listing_id: listing.id,
        })
        if (matchResult?.[0]?.edificio_id) {
          edificioId = matchResult[0].edificio_id
        }
      }

      // Insert lead
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          consultant_id: consultantId,
          nome: listing.nome_anunciante || `Proprietario - ${listing.endereco?.split(',')[0] || 'Sem endereco'}`,
          telefone: listing.telefone_anunciante || null,
          email: listing.email_anunciante || null,
          edificio_id: edificioId,
          origem: 'fisbo_scraping' as const,
          etapa_funil: 'contato' as const,
          is_fisbo: listing.is_fisbo || listing.tipo_anunciante === 'proprietario',
          notas: `Captado via busca parametrica. Portal: ${listing.portal}. URL: ${listing.url || 'N/A'}`,
          enrichment_data: {
            source_search_id: searchId || null,
            source_listing_id: listing.id,
            portal: listing.portal,
            preco_anuncio: listing.preco,
            area_m2: listing.area_m2,
            url: listing.url,
            captured_at: new Date().toISOString(),
          },
        })
        .select('id')
        .single()

      if (error) throw new Error(`Falha ao criar lead: ${error.message}`)

      // Insert intelligence_feed event
      await supabase.from('intelligence_feed').insert({
        consultant_id: consultantId,
        tipo: 'novo_fisbo',
        prioridade: listing.is_fisbo ? 'alta' : 'media',
        titulo: `Lead captado via busca: ${listing.nome_anunciante || listing.endereco?.split(',')[0] || 'Novo lead'}`,
        descricao: `Portal: ${listing.portal} | Preco: R$ ${listing.preco?.toLocaleString('pt-BR') || 'N/I'} | Area: ${listing.area_m2 || 'N/I'} m²`,
        edificio_id: edificioId,
        scraped_listing_id: listing.id,
        metadata: { search_id: searchId, listing_id: listing.id },
      })

      return { leadId: lead.id, isDuplicate: false }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['funnel'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

/**
 * Hook: Check if a listing would create a duplicate lead
 */
export function useCheckDuplicate() {
  return useMutation({
    mutationFn: async ({
      consultantId,
      telefone,
      edificioId,
    }: {
      consultantId: string
      telefone: string | null
      edificioId: string | null
    }) => {
      return checkDuplicate(consultantId, telefone, edificioId)
    },
  })
}

/**
 * Hook: Batch create leads from multiple search result listings
 */
export function useBatchCaptar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      listings,
      consultantId,
      searchId,
    }: {
      listings: ScrapedListingParametric[]
      consultantId: string
      searchId?: string | null
    }): Promise<{ succeeded: string[]; failed: string[] }> => {
      const supabase = createClient()
      const succeeded: string[] = []
      const failed: string[] = []

      for (const listing of listings) {
        try {
          const { data: lead, error } = await supabase
            .from('leads')
            .insert({
              consultant_id: consultantId,
              nome: listing.nome_anunciante || `Proprietario - ${listing.endereco?.split(',')[0] || 'Sem endereco'}`,
              telefone: listing.telefone_anunciante || null,
              email: listing.email_anunciante || null,
              edificio_id: listing.matched_edificio_id,
              origem: 'fisbo_scraping' as const,
              etapa_funil: 'contato' as const,
              is_fisbo: listing.is_fisbo || listing.tipo_anunciante === 'proprietario',
              notas: `Captado em batch via busca parametrica. Portal: ${listing.portal}.`,
              enrichment_data: {
                source_search_id: searchId || null,
                source_listing_id: listing.id,
                portal: listing.portal,
                preco_anuncio: listing.preco,
                captured_at: new Date().toISOString(),
              },
            })
            .select('id')
            .single()

          if (error) {
            failed.push(listing.id)
          } else {
            succeeded.push(lead.id)
          }
        } catch {
          failed.push(listing.id)
        }
      }

      // Batch intelligence_feed event
      if (succeeded.length > 0) {
        await supabase.from('intelligence_feed').insert({
          consultant_id: consultantId,
          tipo: 'busca_parametrica',
          prioridade: 'media',
          titulo: `${succeeded.length} leads captados em batch`,
          descricao: `Sucesso: ${succeeded.length} | Falha: ${failed.length}`,
          metadata: { search_id: searchId, lead_count: succeeded.length },
        })
      }

      return { succeeded, failed }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['funnel'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

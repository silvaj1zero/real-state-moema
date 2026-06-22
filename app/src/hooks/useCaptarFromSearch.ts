'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { storeLeadPIIBatch } from '@/lib/vault'
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

// ---------------------------------------------------------------------------
// Helpers puros (testáveis) — separam a montagem do registro de lead do I/O.
//
// IMPORTANTE (PROD / LGPD): em PROD a PII do lead é CIFRADA. Não existem colunas
// `leads.telefone` / `leads.email` em claro — só `*_encrypted (bytea)` e os
// `*_secret_id (uuid)` do Supabase Vault (migration 014). Escrever telefone/email
// direto no INSERT quebra com `column does not exist`. O caminho legítimo de
// escrita é a RPC `fn_store_lead_pii` (wrapper `storeLeadPIIBatch`), chamada
// DEPOIS de criar o lead. Já `nome`, `notas` e `enrichment_data` são colunas
// válidas em PROD e seguem em claro (não são PII sensível de contato).
// ---------------------------------------------------------------------------

/** Campos PII a cifrar no vault (telefone/email/whatsapp), só os presentes. */
export function extractLeadPII(
  listing: Pick<ScrapedListingParametric, 'telefone_anunciante' | 'email_anunciante' | 'whatsapp_anunciante'>
): { telefone?: string; email?: string; whatsapp?: string } {
  const pii: { telefone?: string; email?: string; whatsapp?: string } = {}
  if (listing.telefone_anunciante) pii.telefone = listing.telefone_anunciante
  if (listing.email_anunciante) pii.email = listing.email_anunciante
  if (listing.whatsapp_anunciante) pii.whatsapp = listing.whatsapp_anunciante
  return pii
}

/**
 * Monta o registro de INSERT do lead SEM colunas PII em claro. Inclui
 * `scraped_listing_id` para o vínculo determinístico + dedup (índice único
 * `(consultant_id, scraped_listing_id)`, migration 022).
 */
export function buildLeadInsert(
  listing: ScrapedListingParametric,
  consultantId: string,
  edificioId: string | null,
  searchId: string | null | undefined,
  capturedAt: string,
  notas: string
) {
  return {
    consultant_id: consultantId,
    nome: listing.nome_anunciante || `Proprietario - ${listing.endereco?.split(',')[0] || 'Sem endereco'}`,
    edificio_id: edificioId,
    origem: 'fisbo_scraping' as const,
    etapa_funil: 'contato' as const,
    is_fisbo: listing.is_fisbo || listing.tipo_anunciante === 'proprietario',
    scraped_listing_id: listing.id,
    notas,
    enrichment_data: {
      source_search_id: searchId || null,
      source_listing_id: listing.id,
      portal: listing.portal,
      preco_anuncio: listing.preco,
      area_m2: listing.area_m2,
      url: listing.url,
      captured_at: capturedAt,
    },
  }
}

/**
 * Check for duplicate leads pelo anúncio FISBO de origem (scraped_listing_id) ou
 * pelo edifício. NÃO dedupa por telefone: em PROD a PII é cifrada e não há coluna
 * de telefone em claro para filtrar.
 */
async function checkDuplicate(
  consultantId: string,
  scrapedListingId: string | null,
  edificioId: string | null
): Promise<{ isDuplicate: boolean; existingLeadId?: string; existingName?: string }> {
  const supabase = createClient()

  if (scrapedListingId) {
    const { data } = await supabase
      .from('leads')
      .select('id, nome')
      .eq('consultant_id', consultantId)
      .eq('scraped_listing_id', scrapedListingId)
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

      // Insert lead (sem PII em claro — ver nota no topo do arquivo).
      const notas = `Captado via busca parametrica. Portal: ${listing.portal}. URL: ${listing.url || 'N/A'}`
      const insert = buildLeadInsert(listing, consultantId, edificioId, searchId, new Date().toISOString(), notas)

      let leadId: string
      let isDuplicate = false
      const { data: lead, error } = await supabase.from('leads').insert(insert).select('id').single()

      if (error) {
        // Corrida/dedup: o anúncio já virou lead (índice único consultant_id+scraped_listing_id).
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('consultant_id', consultantId)
          .eq('scraped_listing_id', listing.id)
          .maybeSingle()
        if (!existing) throw new Error(`Falha ao criar lead: ${error.message}`)
        leadId = existing.id
        isDuplicate = true
      } else {
        leadId = lead.id
      }

      // Cifra a PII de contato no Vault (caminho LGPD legítimo). Best-effort: o
      // contato também vive em `scraped_listings` (dado público), então uma falha
      // de cifragem não invalida a captação.
      try {
        await storeLeadPIIBatch(supabase, leadId, extractLeadPII(listing))
      } catch (e) {
        console.warn(`captar: falha ao cifrar PII do lead ${leadId}:`, e)
      }

      // Evento de feed (side-effect, não-crítico).
      if (!isDuplicate) {
        try {
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
        } catch (e) {
          console.warn('captar: falha ao registrar intelligence_feed:', e)
        }
      }

      return { leadId, isDuplicate }
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
      scrapedListingId,
      edificioId,
    }: {
      consultantId: string
      scrapedListingId: string | null
      edificioId: string | null
    }) => {
      return checkDuplicate(consultantId, scrapedListingId, edificioId)
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
          const notas = `Captado em batch via busca parametrica. Portal: ${listing.portal}.`
          const insert = buildLeadInsert(
            listing,
            consultantId,
            listing.matched_edificio_id,
            searchId,
            new Date().toISOString(),
            notas
          )

          let leadId: string
          const { data: lead, error } = await supabase.from('leads').insert(insert).select('id').single()

          if (error) {
            // Dedup: já existe lead p/ este anúncio (índice único). Não conta como falha.
            const { data: existing } = await supabase
              .from('leads')
              .select('id')
              .eq('consultant_id', consultantId)
              .eq('scraped_listing_id', listing.id)
              .maybeSingle()
            if (!existing) {
              failed.push(listing.id)
              continue
            }
            leadId = existing.id
          } else {
            leadId = lead.id
          }

          // Cifra a PII de contato no Vault (best-effort — ver nota no topo).
          try {
            await storeLeadPIIBatch(supabase, leadId, extractLeadPII(listing))
          } catch (e) {
            console.warn(`captar(batch): falha ao cifrar PII do lead ${leadId}:`, e)
          }

          succeeded.push(leadId)
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

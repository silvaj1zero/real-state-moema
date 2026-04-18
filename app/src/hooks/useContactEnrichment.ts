'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EnrichmentResult } from '@/lib/contact-enrichment'

// =============================================================================
// useEnrichContact — single listing enrichment mutation
// =============================================================================

/**
 * Mutation that POSTs to /api/search/enrich-contact to enrich
 * a single scraped listing with contact data.
 */
export function useEnrichContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (listingId: string): Promise<EnrichmentResult> => {
      const res = await fetch('/api/search/enrich-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `Enrichment failed (${res.status})`)
      }

      return res.json() as Promise<EnrichmentResult>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-listings'] })
      queryClient.invalidateQueries({ queryKey: ['parametric-local'] })
    },
  })
}

// =============================================================================
// useBatchEnrich — enrich multiple listings sequentially
// =============================================================================

export interface BatchEnrichResult {
  succeeded: string[]
  failed: Array<{ listing_id: string; error: string }>
}

/**
 * Mutation that enriches multiple listings sequentially with
 * a 1-second delay between each request to avoid rate limiting.
 */
export function useBatchEnrich() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      listingIds: string[],
    ): Promise<BatchEnrichResult> => {
      const succeeded: string[] = []
      const failed: Array<{ listing_id: string; error: string }> = []

      for (let i = 0; i < listingIds.length; i++) {
        const listingId = listingIds[i]

        try {
          const res = await fetch('/api/search/enrich-contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listing_id: listingId }),
          })

          if (res.ok) {
            succeeded.push(listingId)
          } else {
            const err = (await res.json().catch(() => ({}))) as { error?: string }
            failed.push({
              listing_id: listingId,
              error: err.error ?? `HTTP ${res.status}`,
            })
          }
        } catch (err) {
          failed.push({
            listing_id: listingId,
            error: err instanceof Error ? err.message : 'Network error',
          })
        }

        // 1-second delay between requests (skip after last)
        if (i < listingIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      return { succeeded, failed }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-listings'] })
      queryClient.invalidateQueries({ queryKey: ['parametric-local'] })
    },
  })
}

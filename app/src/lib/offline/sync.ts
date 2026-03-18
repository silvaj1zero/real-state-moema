// Background sync engine
// Story 1.6: Sync pending mutations when back online

import { createClient } from '@/lib/supabase/client'
import { getPendingMutations, removeMutation } from './db'

export async function syncPendingMutations(): Promise<{ synced: number; failed: number }> {
  const mutations = await getPendingMutations()
  if (mutations.length === 0) return { synced: 0, failed: 0 }

  const supabase = createClient()
  let synced = 0
  let failed = 0

  // Process FIFO (oldest first)
  for (const mutation of mutations) {
    try {
      if (mutation.operation === 'insert') {
        const { error } = await supabase
          .from(mutation.table)
          .insert(mutation.data)

        if (error) throw error
      } else if (mutation.operation === 'update') {
        const { id, ...data } = mutation.data as Record<string, unknown>
        const { error } = await supabase
          .from(mutation.table)
          .update(data)
          .eq('id', id)

        if (error) throw error
      }

      await removeMutation(mutation.id)
      synced++
    } catch (err) {
      console.error(`Sync failed for mutation ${mutation.id}:`, err)
      failed++
      // LWW (Last Write Wins) — continue with next mutation
    }
  }

  return { synced, failed }
}

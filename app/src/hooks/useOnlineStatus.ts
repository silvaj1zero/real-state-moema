'use client'

import { useState, useEffect, useCallback } from 'react'
import { syncPendingMutations } from '@/lib/offline/sync'
import { getPendingCount } from '@/lib/offline/db'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Track online/offline
  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when back online
      doSync()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check pending count on mount
    getPendingCount().then(setPendingCount)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const doSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const { synced } = await syncPendingMutations()
      if (synced > 0) {
        const remaining = await getPendingCount()
        setPendingCount(remaining)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { isOnline, pendingCount, isSyncing, sync: doSync }
}

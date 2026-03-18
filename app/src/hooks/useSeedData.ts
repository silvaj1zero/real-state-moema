'use client'

import { useState, useCallback } from 'react'
import { seedBuildingsForEpicenter } from '@/lib/seed/seed-buildings'

interface SeedState {
  isSeeding: boolean
  progress: string | null
  result: { inserted: number; skipped: number; total: number } | null
  error: string | null
}

export function useSeedData() {
  const [state, setState] = useState<SeedState>({
    isSeeding: false,
    progress: null,
    result: null,
    error: null,
  })

  const executeSeed = useCallback(async (lat: number, lng: number, radiusMeters: number = 2000) => {
    setState({ isSeeding: true, progress: 'Buscando edifícios na região...', result: null, error: null })

    try {
      const result = await seedBuildingsForEpicenter(lat, lng, radiusMeters)

      setState({
        isSeeding: false,
        progress: null,
        result: { inserted: result.inserted, skipped: result.skipped, total: result.total },
        error: null,
      })

      return result
    } catch (err) {
      setState({
        isSeeding: false,
        progress: null,
        result: null,
        error: err instanceof Error ? err.message : 'Erro ao carregar edifícios',
      })
      return null
    }
  }, [])

  return { ...state, executeSeed }
}

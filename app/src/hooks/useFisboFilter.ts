'use client'

import { useMemo } from 'react'
import { useFilterStore } from '@/store/filters'
import { useBuildings } from '@/hooks/useBuildings'
import type { EdificioWithQualificacao } from '@/lib/supabase/types'

/**
 * Hook that provides FISBO filtering for map buildings.
 * Integrates with the existing filter store (fisboOnly toggle).
 *
 * Returns:
 * - fisboOnly: current filter state
 * - toggleFisboOnly: toggle the filter
 * - fisboCount: number of FISBO buildings in the current active radius
 * - filteredBuildings: buildings filtered by FISBO status (when active)
 */
export function useFisboFilter() {
  const fisboOnly = useFilterStore((s) => s.fisboOnly)
  const toggleFisboOnly = useFilterStore((s) => s.toggleFisboOnly)
  const { buildings } = useBuildings()

  const fisboCount = useMemo(
    () =>
      buildings.filter(
        (b) => b.edificios_qualificacoes?.[0]?.is_fisbo_detected
      ).length,
    [buildings]
  )

  const filteredBuildings = useMemo((): EdificioWithQualificacao[] => {
    if (!fisboOnly) return buildings
    return buildings.filter(
      (b) => b.edificios_qualificacoes?.[0]?.is_fisbo_detected
    )
  }, [buildings, fisboOnly])

  return {
    fisboOnly,
    toggleFisboOnly,
    fisboCount,
    filteredBuildings,
  }
}

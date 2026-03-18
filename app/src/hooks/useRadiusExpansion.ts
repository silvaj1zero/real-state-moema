'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/store/map'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EXPANSION_THRESHOLD = 80 // Configurable default (FR-004)

export const RADIUS_STEPS = [500, 1000, 2000] as const
export type RadiusStep = (typeof RADIUS_STEPS)[number]

export const RADIUS_LABELS: Record<RadiusStep, string> = {
  500: '500m',
  1000: '1km',
  2000: '2km',
}

export const RADIUS_COLORS: Record<RadiusStep, string> = {
  500: '#22C55E',
  1000: '#EAB308',
  2000: '#DC1431',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadiusCoverage {
  total: number
  visitados: number
  percentual: number
}

export interface RadiusProgressEntry {
  raio: RadiusStep
  percentual: number
  total: number
  visitados: number
  locked: boolean
  unlockedAt: string | null
}

export interface NextBlockSuggestionData {
  endereco: string
  total: number
  fisbos: number
}

// ---------------------------------------------------------------------------
// useRadiusCoverage — calls fn_cobertura_raio via Supabase RPC
// ---------------------------------------------------------------------------

export function useRadiusCoverage(epicentroId: string | null, consultantId: string | null) {
  return useQuery({
    queryKey: ['cobertura', epicentroId, consultantId],
    queryFn: async (): Promise<RadiusCoverage> => {
      if (!epicentroId || !consultantId) {
        return { total: 0, visitados: 0, percentual: 0 }
      }

      const supabase = createClient()
      const { data, error } = await supabase.rpc('fn_cobertura_raio', {
        p_epicentro_id: epicentroId,
        p_consultant_id: consultantId,
      })

      if (error) {
        console.error('Error calling fn_cobertura_raio:', error)
        return { total: 0, visitados: 0, percentual: 0 }
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) return { total: 0, visitados: 0, percentual: 0 }

      return {
        total: Number(row.total_edificios) || 0,
        visitados: Number(row.visitados) || 0,
        percentual: Number(row.percentual_cobertura) || 0,
      }
    },
    enabled: !!epicentroId && !!consultantId,
    staleTime: 5 * 60 * 1000, // 5 min — coverage doesn't change frequently
  })
}

// ---------------------------------------------------------------------------
// useRadiusCoverageByRadius — coverage per radius ring (client-side calc)
// ---------------------------------------------------------------------------

export function useRadiusCoverageByRadius(
  epicenterCoords: { lat: number; lng: number } | null,
  consultantId: string | null,
) {
  return useQuery({
    queryKey: ['cobertura-by-radius', epicenterCoords?.lat, epicenterCoords?.lng, consultantId],
    queryFn: async (): Promise<Record<RadiusStep, RadiusCoverage>> => {
      if (!epicenterCoords || !consultantId) {
        return {
          500: { total: 0, visitados: 0, percentual: 0 },
          1000: { total: 0, visitados: 0, percentual: 0 },
          2000: { total: 0, visitados: 0, percentual: 0 },
        }
      }

      const supabase = createClient()

      // Fetch all buildings within 2km (max radius)
      const { data: buildings, error } = await supabase.rpc('fn_edificios_no_raio', {
        p_lat: epicenterCoords.lat,
        p_lng: epicenterCoords.lng,
        p_raio_metros: 2000,
      })

      if (error || !buildings) {
        console.error('Error fetching buildings for coverage:', error)
        return {
          500: { total: 0, visitados: 0, percentual: 0 },
          1000: { total: 0, visitados: 0, percentual: 0 },
          2000: { total: 0, visitados: 0, percentual: 0 },
        }
      }

      // Fetch qualifications for this consultant
      const buildingIds = buildings.map((b: { edificio_id: string }) => b.edificio_id)
      const { data: quals } = await supabase
        .from('edificios_qualificacoes')
        .select('edificio_id, status_varredura')
        .eq('consultant_id', consultantId)
        .in('edificio_id', buildingIds.length > 0 ? buildingIds : ['__none__'])

      const qualMap = new Map<string, string>()
      for (const q of quals || []) {
        qualMap.set(q.edificio_id, q.status_varredura)
      }

      // Bucket buildings by radius ring
      const result: Record<RadiusStep, RadiusCoverage> = {
        500: { total: 0, visitados: 0, percentual: 0 },
        1000: { total: 0, visitados: 0, percentual: 0 },
        2000: { total: 0, visitados: 0, percentual: 0 },
      }

      for (const b of buildings) {
        const dist = Number(b.distancia_metros)
        let bucket: RadiusStep
        if (dist <= 500) bucket = 500
        else if (dist <= 1000) bucket = 1000
        else bucket = 2000

        result[bucket].total++
        const status = qualMap.get(b.edificio_id)
        if (status && status !== 'nao_visitado') {
          result[bucket].visitados++
        }
      }

      // Calculate percentages
      for (const r of RADIUS_STEPS) {
        result[r].percentual =
          result[r].total > 0
            ? Math.round((result[r].visitados / result[r].total) * 1000) / 10
            : 0
      }

      return result
    },
    enabled: !!epicenterCoords && !!consultantId,
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useExpandRadius — mutation to unlock next radius
// ---------------------------------------------------------------------------

export function useExpandRadius() {
  const queryClient = useQueryClient()
  const setActiveRadius = useMapStore((s) => s.setActiveRadius)

  return useMutation({
    mutationFn: async ({
      epicentroId,
      currentRadius,
      epicenterCoords,
    }: {
      epicentroId: string
      currentRadius: RadiusStep
      epicenterCoords: { lat: number; lng: number }
    }) => {
      const nextRadius = getNextRadius(currentRadius)
      if (!nextRadius) throw new Error('Raio máximo já atingido')

      const supabase = createClient()

      // 1. Update epicentros.raio_ativo_m to next radius
      const { error: updateError } = await supabase
        .from('epicentros')
        .update({ raio_ativo_m: nextRadius })
        .eq('id', epicentroId)

      if (updateError) {
        throw new Error(`Erro ao atualizar raio: ${updateError.message}`)
      }

      // 2. Trigger seed for the NEW annular zone (between current and next radius)
      // Uses Story 1.7 seed mechanism — imports dynamically to avoid circular deps
      const { seedBuildingsForEpicenter } = await import('@/lib/seed/seed-buildings')
      const seedResult = await seedBuildingsForEpicenter(
        epicenterCoords.lat,
        epicenterCoords.lng,
        nextRadius,
      )

      return {
        newRadius: nextRadius,
        seedResult,
      }
    },
    onSuccess: (data) => {
      // Update map store
      setActiveRadius(data.newRadius)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['cobertura'] })
      queryClient.invalidateQueries({ queryKey: ['cobertura-by-radius'] })
      queryClient.invalidateQueries({ queryKey: ['next-block-suggestion'] })

      // Dispatch toast event (matches existing app pattern)
      if (typeof window !== 'undefined') {
        if (navigator.vibrate) navigator.vibrate([50, 50, 100])
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Raio de ${RADIUS_LABELS[data.newRadius as RadiusStep]} desbloqueado! ${data.seedResult.inserted} novos edifícios carregados.`,
              type: 'success',
            },
          }),
        )
      }
    },
    onError: (error) => {
      console.error('Error expanding radius:', error)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Erro ao desbloquear raio', type: 'error' },
          }),
        )
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useRadiusProgress — aggregated progress for all 3 radii
// ---------------------------------------------------------------------------

export function useRadiusProgress(
  epicenterCoords: { lat: number; lng: number } | null,
  consultantId: string | null,
  activeRadiusM: number,
) {
  const coverageQuery = useRadiusCoverageByRadius(epicenterCoords, consultantId)

  const progress: RadiusProgressEntry[] = RADIUS_STEPS.map((raio) => {
    const coverage = coverageQuery.data?.[raio]
    // A radius is locked if the previous radius hasn't reached 80%
    const prevIdx = RADIUS_STEPS.indexOf(raio) - 1
    const isLocked =
      prevIdx >= 0 &&
      (coverageQuery.data?.[RADIUS_STEPS[prevIdx]]?.percentual ?? 0) < EXPANSION_THRESHOLD &&
      raio > activeRadiusM

    return {
      raio,
      percentual: coverage?.percentual ?? 0,
      total: coverage?.total ?? 0,
      visitados: coverage?.visitados ?? 0,
      locked: isLocked,
      unlockedAt: null, // TODO: persist unlock timestamps (AC7)
    }
  })

  return {
    progress,
    isLoading: coverageQuery.isLoading,
    refetch: coverageQuery.refetch,
  }
}

// ---------------------------------------------------------------------------
// useExpansionNotification — monitors coverage and fires when >= 80%
// ---------------------------------------------------------------------------

export function useExpansionNotification(
  epicenterCoords: { lat: number; lng: number } | null,
  consultantId: string | null,
  activeRadiusM: number,
  threshold: number = EXPANSION_THRESHOLD,
) {
  const coverageQuery = useRadiusCoverageByRadius(epicenterCoords, consultantId)
  const notifiedRef = useRef<Set<number>>(new Set())

  // Determine which radius is the "working" one
  const activeStep = RADIUS_STEPS.find((r) => r >= activeRadiusM) ?? 500

  const activeCoverage = coverageQuery.data?.[activeStep]
  const shouldNotify =
    activeCoverage &&
    activeCoverage.percentual >= threshold &&
    !notifiedRef.current.has(activeStep) &&
    getNextRadius(activeStep) !== null

  // Mark as notified to prevent re-trigger
  useEffect(() => {
    if (shouldNotify) {
      notifiedRef.current.add(activeStep)
    }
  }, [shouldNotify, activeStep])

  const dismiss = useCallback(() => {
    notifiedRef.current.add(activeStep)
  }, [activeStep])

  return {
    shouldNotify: !!shouldNotify,
    currentRadius: activeStep,
    nextRadius: getNextRadius(activeStep),
    coverage: activeCoverage ?? { total: 0, visitados: 0, percentual: 0 },
    dismiss,
  }
}

// ---------------------------------------------------------------------------
// useNextBlockSuggestion — suggests next area to visit
// ---------------------------------------------------------------------------

export function useNextBlockSuggestion(
  epicenterCoords: { lat: number; lng: number } | null,
  activeRadiusM: number,
) {
  return useQuery({
    queryKey: ['next-block-suggestion', epicenterCoords?.lat, epicenterCoords?.lng, activeRadiusM],
    queryFn: async (): Promise<NextBlockSuggestionData[]> => {
      if (!epicenterCoords) return []

      const supabase = createClient()

      // Fetch unvisited buildings in active radius
      const { data: buildings, error } = await supabase.rpc('fn_edificios_no_raio', {
        p_lat: epicenterCoords.lat,
        p_lng: epicenterCoords.lng,
        p_raio_metros: activeRadiusM,
      })

      if (error || !buildings || buildings.length === 0) return []

      // Get building IDs
      const buildingIds = buildings.map((b: { edificio_id: string }) => b.edificio_id)

      // Fetch all edificios with their addresses (for grouping by street)
      const { data: edificios } = await supabase
        .from('edificios')
        .select('id, endereco')
        .in('id', buildingIds.length > 0 ? buildingIds : ['__none__'])

      if (!edificios) return []

      // Fetch qualifications
      const { data: quals } = await supabase
        .from('edificios_qualificacoes')
        .select('edificio_id, status_varredura')
        .in('edificio_id', buildingIds.length > 0 ? buildingIds : ['__none__'])

      // Fetch leads with FISBO flag
      const { data: leads } = await supabase
        .from('leads')
        .select('edificio_id, is_fisbo')
        .in('edificio_id', buildingIds.length > 0 ? buildingIds : ['__none__'])
        .eq('is_fisbo', true)

      const qualMap = new Map<string, string>()
      for (const q of quals || []) {
        qualMap.set(q.edificio_id, q.status_varredura)
      }

      const fisboSet = new Set<string>()
      for (const l of leads || []) {
        if (l.is_fisbo && l.edificio_id) fisboSet.add(l.edificio_id)
      }

      // Group by street/address prefix (first part of address before comma)
      const streetMap = new Map<string, { total: number; fisbos: number; unvisited: number }>()

      for (const e of edificios) {
        // Extract street name from address
        const street = extractStreet(e.endereco)
        const status = qualMap.get(e.id)
        const isUnvisited = !status || status === 'nao_visitado'
        const hasFisbo = fisboSet.has(e.id)

        const entry = streetMap.get(street) || { total: 0, fisbos: 0, unvisited: 0 }
        entry.total++
        if (hasFisbo) entry.fisbos++
        if (isUnvisited) entry.unvisited++
        streetMap.set(street, entry)
      }

      // Sort by priority: (1) FISBOs, (2) total buildings, (3) most unvisited
      const suggestions: NextBlockSuggestionData[] = Array.from(streetMap.entries())
        .filter(([, stats]) => stats.unvisited > 0)
        .sort((a, b) => {
          if (b[1].fisbos !== a[1].fisbos) return b[1].fisbos - a[1].fisbos
          if (b[1].total !== a[1].total) return b[1].total - a[1].total
          return b[1].unvisited - a[1].unvisited
        })
        .slice(0, 3)
        .map(([endereco, stats]) => ({
          endereco,
          total: stats.total,
          fisbos: stats.fisbos,
        }))

      return suggestions
    },
    enabled: !!epicenterCoords,
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextRadius(current: RadiusStep): RadiusStep | null {
  const idx = RADIUS_STEPS.indexOf(current)
  return idx < RADIUS_STEPS.length - 1 ? RADIUS_STEPS[idx + 1] : null
}

function extractStreet(endereco: string): string {
  // "Rua Alvorada, 123 - Moema" → "Rua Alvorada"
  // "Av. Ibirapuera, 2907" → "Av. Ibirapuera"
  const parts = endereco.split(',')
  return parts[0].trim()
}

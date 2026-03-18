'use client'

import { useState, useCallback } from 'react'

interface GeocodingResult {
  endereco: string
  bairro: string | null
  cep: string | null
  cidade: string
  estado: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export function useReverseGeocode() {
  const [isLoading, setIsLoading] = useState(false)

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<GeocodingResult | null> => {
      if (!MAPBOX_TOKEN) return null

      setIsLoading(true)
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)

        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&language=pt&access_token=${MAPBOX_TOKEN}`,
          { signal: controller.signal }
        )
        clearTimeout(timeout)

        if (!res.ok) return null

        const data = await res.json()
        const feature = data.features?.[0]
        if (!feature) return null

        const context: Array<{ id: string; text: string; short_code?: string }> = feature.context || []
        const bairro = context.find((c) => c.id.startsWith('neighborhood'))?.text || null
        const cidade = context.find((c) => c.id.startsWith('place'))?.text || 'São Paulo'
        const estado = context.find((c) => c.id.startsWith('region'))?.short_code?.replace('BR-', '') || 'SP'
        const cep = context.find((c) => c.id.startsWith('postcode'))?.text || null

        return {
          endereco: feature.place_name_pt || feature.place_name || '',
          bairro,
          cep,
          cidade,
          estado,
        }
      } catch {
        return null // Timeout or network error — graceful fallback
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { reverseGeocode, isLoading }
}

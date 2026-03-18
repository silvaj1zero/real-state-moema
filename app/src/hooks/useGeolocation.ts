'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/store/map'

export function useGeolocation() {
  const setUserLocation = useMapStore((s) => s.setUserLocation)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        // GPS negado ou indisponível — fallback gracioso
        setUserLocation(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [setUserLocation])
}

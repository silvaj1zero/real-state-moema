'use client'

import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import { useMapStore } from '@/store/map'

const RADIUS_CONFIG = [
  { radius: 500, color: '#22C55E', key: 'showRadius500' as const },
  { radius: 1000, color: '#EAB308', key: 'showRadius1000' as const },
  { radius: 2000, color: '#DC1431', key: 'showRadius2000' as const },
] as const

export function RadiusCircles() {
  const epicenter = useMapStore((s) => s.epicenter)
  const show500 = useMapStore((s) => s.showRadius500)
  const show1000 = useMapStore((s) => s.showRadius1000)
  const show2000 = useMapStore((s) => s.showRadius2000)

  if (!epicenter) return null

  const visibility = { showRadius500: show500, showRadius1000: show1000, showRadius2000: show2000 }

  return (
    <>
      {RADIUS_CONFIG.map(({ radius, color, key }) => {
        if (!visibility[key]) return null

        const circle = turf.circle(
          [epicenter.lng, epicenter.lat],
          radius / 1000, // turf usa km
          { steps: 64, units: 'kilometers' }
        )

        return (
          <Source key={`radius-${radius}`} id={`radius-${radius}`} type="geojson" data={circle}>
            <Layer
              id={`radius-fill-${radius}`}
              type="fill"
              paint={{
                'fill-color': color,
                'fill-opacity': 0.05,
              }}
            />
            <Layer
              id={`radius-line-${radius}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': 2,
                'line-dasharray': [4, 2],
              }}
            />
          </Source>
        )
      })}
    </>
  )
}

'use client'

import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import { useMapStore } from '@/store/map'
import {
  EXPANSION_THRESHOLD,
  type RadiusProgressEntry,
} from '@/hooks/useRadiusExpansion'

const RADIUS_CONFIG = [
  { radius: 500, color: '#22C55E', key: 'showRadius500' as const },
  { radius: 1000, color: '#EAB308', key: 'showRadius1000' as const },
  { radius: 2000, color: '#DC1431', key: 'showRadius2000' as const },
] as const

interface RadiusCirclesProps {
  /** Pass progress entries to enable expansion-aware styling (AC6). Omit for default behavior. */
  progress?: RadiusProgressEntry[]
}

export function RadiusCircles({ progress }: RadiusCirclesProps = {}) {
  const epicenter = useMapStore((s) => s.epicenter)
  const activeRadius = useMapStore((s) => s.activeRadius)
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

        // Determine visual state from expansion progress (AC6)
        const entry = progress?.find((p) => p.raio === radius)
        const isActive = radius <= activeRadius && (!entry || entry.percentual < EXPANSION_THRESHOLD)
        const isComplete = entry ? entry.percentual >= EXPANSION_THRESHOLD : false
        const isLocked = entry ? entry.locked : false

        // AC6 styles:
        //   Active:   border 3px solid, fill 8% opacity
        //   Complete: border 1px dashed, fill 3% opacity
        //   Locked:   border 1px dotted gray, fill 2% opacity
        const lineWidth = isActive ? 3 : isLocked ? 1 : isComplete ? 1 : 2
        const fillOpacity = isActive ? 0.08 : isComplete ? 0.03 : isLocked ? 0.02 : 0.05
        const lineColor = isLocked ? '#9CA3AF' : color
        const dashArray: [number, number] | undefined =
          isActive ? undefined : isLocked ? [2, 2] : [4, 2]

        return (
          <Source key={`radius-${radius}`} id={`radius-${radius}`} type="geojson" data={circle}>
            <Layer
              id={`radius-fill-${radius}`}
              type="fill"
              paint={{
                'fill-color': lineColor,
                'fill-opacity': fillOpacity,
              }}
            />
            <Layer
              id={`radius-line-${radius}`}
              type="line"
              paint={{
                'line-color': lineColor,
                'line-width': lineWidth,
                ...(dashArray ? { 'line-dasharray': dashArray } : {}),
              }}
            />
          </Source>
        )
      })}
    </>
  )
}

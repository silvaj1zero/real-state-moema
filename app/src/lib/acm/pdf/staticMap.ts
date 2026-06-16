/**
 * Builder puro da URL da Mapbox Static Images API para o mapa do Resumo/Laudo ACM
 * (Story 8.3a AC6). Mesmo provedor/estilo do `AcmMiniMap` (light-v11) e o mesmo
 * token `NEXT_PUBLIC_MAPBOX_TOKEN`. A imagem PNG resultante é embutida pelo
 * React-PDF (`<Image src={url} />`).
 *
 * Fallback gracioso (ADR-EPIC8-001): sem token → retorna `null`; o documento
 * renderiza a página sem o mapa, nunca quebra (AC6/AC8).
 */
import { COLORS } from './theme'

export interface MapMarker {
  lat: number
  lng: number
  /** Rótulo do pin (0-9 ou a-z). Ausente = pin liso. */
  label?: string | number
  /** Cor hex SEM '#'. Default azul RE/MAX. */
  color?: string
  /** 's' pequeno (default) ou 'l' grande. */
  size?: 's' | 'l'
}

export interface StaticMapOptions {
  token?: string | null
  center: { lat: number; lng: number }
  radiusMeters: number
  markers?: MapMarker[]
  width?: number
  height?: number
  retina?: boolean
  /** Passos do polígono do raio (menos = URL mais curta). Default 40. */
  circleSteps?: number
}

const STYLE = 'mapbox/light-v11'
const hex = (c: string) => c.replace(/^#/, '')

/** Polígono (anel) aproximando o círculo do raio em coords [lng,lat]. */
export function circlePolygon(
  center: { lat: number; lng: number },
  radiusMeters: number,
  steps = 40,
): number[][] {
  const ring: number[][] = []
  const latRad = (center.lat * Math.PI) / 180
  const dLat = radiusMeters / 111_320 // m por grau de latitude
  const dLng = radiusMeters / (111_320 * Math.cos(latRad)) // ajustado pela latitude
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI
    const lng = center.lng + dLng * Math.cos(theta)
    const lat = center.lat + dLat * Math.sin(theta)
    ring.push([Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])
  }
  return ring
}

function markerOverlay(m: MapMarker): string {
  const size = m.size ?? 's'
  const color = hex(m.color ?? COLORS.azul)
  const label = m.label != null ? `-${m.label}` : ''
  // Mapbox: pin-{s|l}[-label]+color(lng,lat)
  return `pin-${size}${label}+${color}(${m.lng},${m.lat})`
}

/**
 * Monta a URL da Static Images API com o círculo do raio + pins. Usa `auto`
 * para enquadrar todos os overlays. Retorna `null` se não houver token.
 */
export function buildStaticMapUrl(opts: StaticMapOptions): string | null {
  const token = opts.token?.trim()
  if (!token) return null

  const width = opts.width ?? 640
  const height = opts.height ?? 360
  const retina = opts.retina ?? true

  const ring = circlePolygon(opts.center, opts.radiusMeters, opts.circleSteps ?? 40)
  const geojson = {
    type: 'Feature',
    properties: {
      stroke: COLORS.azul,
      'stroke-width': 2,
      'stroke-opacity': 0.6,
      fill: COLORS.azul,
      'fill-opacity': 0.12,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  }

  const overlays: string[] = [`geojson(${encodeURIComponent(JSON.stringify(geojson))})`]
  for (const m of opts.markers ?? []) overlays.push(markerOverlay(m))

  const overlayStr = overlays.join(',')
  const size = `${width}x${height}${retina ? '@2x' : ''}`
  return `https://api.mapbox.com/styles/v1/${STYLE}/static/${overlayStr}/auto/${size}?access_token=${encodeURIComponent(
    token,
  )}`
}

/** Blob → data URL (base64) via FileReader. Embute a imagem no PDF sem 2ª rede. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Pré-busca a imagem do mapa e devolve um **data URL** embutível — ou `null` em
 * QUALQUER falha (sem token, rede off, 4xx, erro de leitura). Garante que o PDF
 * sempre gere (degrada para "sem mapa") em vez de abortar no render do React-PDF,
 * e mantém o token Mapbox FORA do PDF (usado só aqui). Deps injetáveis p/ teste.
 */
export async function resolveStaticMapImage(
  url: string | null,
  deps?: { fetchImpl?: typeof fetch; toDataUrl?: (b: Blob) => Promise<string> },
): Promise<string | null> {
  if (!url) return null
  const f = deps?.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined)
  if (!f) return null
  try {
    const res = await f(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const toDataUrl = deps?.toDataUrl ?? blobToDataUrl
    return await toDataUrl(blob)
  } catch {
    return null
  }
}

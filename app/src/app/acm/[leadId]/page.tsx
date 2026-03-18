import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AcmScreen } from '@/components/acm'

// Utility: parse WKB hex or WKT point to {lat, lng}
function parseCoordinates(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null

  // WKT format: POINT(lng lat) or SRID=4326;POINT(lng lat)
  const wktMatch = raw.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
  if (wktMatch) {
    return { lng: parseFloat(wktMatch[1]), lat: parseFloat(wktMatch[2]) }
  }

  // WKB hex format — decode first 8 bytes (skip endian+type), then read coords
  // This is a simplified decoder for Point geometry only
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 42) {
    try {
      const buf = Buffer.from(raw, 'hex')
      // Standard WKB: 1 byte endian, 4 bytes type, then 2x float64
      // EWKB with SRID: 1 byte endian, 4 bytes type (with SRID flag), 4 bytes SRID, then 2x float64
      const endian = buf[0] // 0 = big, 1 = little
      const readDouble = endian === 1
        ? (offset: number) => buf.readDoubleLE(offset)
        : (offset: number) => buf.readDoubleBE(offset)
      const typeWord = endian === 1 ? buf.readUInt32LE(1) : buf.readUInt32BE(1)
      const hasSRID = (typeWord & 0x20000000) !== 0
      const coordOffset = hasSRID ? 9 : 5
      const lng = readDouble(coordOffset)
      const lat = readDouble(coordOffset + 8)
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    } catch {
      // fall through
    }
  }

  return null
}

interface PageProps {
  params: Promise<{ leadId: string }>
}

export default async function AcmPage({ params }: PageProps) {
  const { leadId } = await params
  const supabase = await createServerSupabaseClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch lead with edificio
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, nome, edificio_id, consultant_id, edificios(id, nome, endereco, coordinates)')
    .eq('id', leadId)
    .single()

  if (error || !lead) notFound()

  const edificio = (lead as Record<string, unknown>).edificios as {
    id: string
    nome: string
    endereco: string
    coordinates: string | null
  } | null

  if (!edificio) notFound()

  const coords = parseCoordinates(edificio.coordinates)
  if (!coords) notFound()

  return (
    <AcmScreen
      leadId={lead.id}
      leadNome={lead.nome}
      edificioEndereco={edificio.endereco}
      edificioId={edificio.id}
      lat={coords.lat}
      lng={coords.lng}
      consultantId={lead.consultant_id}
    />
  )
}

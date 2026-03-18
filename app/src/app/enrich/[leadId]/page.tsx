import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EnrichmentScreen } from '@/components/enrichment'

// Parse coordinates (reused from ACM)
function parseCoordinates(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null
  const wktMatch = raw.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
  if (wktMatch) {
    return { lng: parseFloat(wktMatch[1]), lat: parseFloat(wktMatch[2]) }
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 42) {
    try {
      const buf = Buffer.from(raw, 'hex')
      const endian = buf[0]
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

export default async function EnrichPage({ params }: PageProps) {
  const { leadId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, nome, consultant_id, edificio_id, edificios(id, nome, endereco, coordinates)')
    .eq('id', leadId)
    .single()

  if (error || !lead || !lead.edificio_id) notFound()

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
    <EnrichmentScreen
      leadId={lead.id}
      leadNome={lead.nome}
      edificioId={edificio.id}
      edificioEndereco={edificio.endereco}
      consultantId={lead.consultant_id}
      lat={coords.lat}
      lng={coords.lng}
    />
  )
}

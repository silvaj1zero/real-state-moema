import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EnrichmentScreen } from '@/components/enrichment'
import { parseCoordinates } from '@/lib/coordinates'

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

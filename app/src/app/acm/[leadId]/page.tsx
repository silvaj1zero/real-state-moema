import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AcmScreen } from '@/components/acm'
import { parseCoordinates } from '@/lib/coordinates'

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

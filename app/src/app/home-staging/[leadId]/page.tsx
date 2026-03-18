import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HomeStageScreen } from '@/components/home-staging'

interface PageProps {
  params: Promise<{ leadId: string }>
}

export default async function HomeStagingPage({ params }: PageProps) {
  const { leadId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, nome, telefone_encrypted, consultant_id, edificio_id, edificios(id, nome, endereco)')
    .eq('id', leadId)
    .single()

  if (error || !lead) notFound()

  const edificio = (lead as Record<string, unknown>).edificios as {
    id: string
    nome: string
    endereco: string
  } | null

  // Get tipologia from qualificacao if available
  let tipologia: string | null = null
  if (lead.edificio_id) {
    const { data: qual } = await supabase
      .from('edificios_qualificacoes')
      .select('tipologia')
      .eq('edificio_id', lead.edificio_id)
      .eq('consultant_id', lead.consultant_id)
      .maybeSingle()
    tipologia = qual?.tipologia || null
  }

  return (
    <HomeStageScreen
      leadId={lead.id}
      leadNome={lead.nome}
      telefone={lead.telefone_encrypted}
      edificioEndereco={edificio?.endereco || 'Endereço não cadastrado'}
      edificioTipologia={tipologia}
      consultantId={lead.consultant_id}
    />
  )
}

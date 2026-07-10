import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getLeadPII } from '@/lib/vault'
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

  // PII cifrada: `leads.telefone` não existe em claro em PROD. Decifra via Vault
  // (caminho legítimo + audit log). Ver [[project_prod-leads-pii-schema]].
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, nome, consultant_id, edificio_id, edificios(id, nome, endereco)')
    .eq('id', leadId)
    .single()

  if (error || !lead) notFound()

  const telefone = await getLeadPII(supabase, lead.id, 'telefone').catch(() => null)

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
      telefone={telefone}
      edificioEndereco={edificio?.endereco || 'Endereço não cadastrado'}
      edificioTipologia={tipologia}
      consultantId={lead.consultant_id}
    />
  )
}

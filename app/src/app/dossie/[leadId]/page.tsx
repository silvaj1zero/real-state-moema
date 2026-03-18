import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DossieScreen } from '@/components/dossie'
import type { AcmSnapshot } from '@/hooks/useDossie'

interface PageProps {
  params: Promise<{ leadId: string }>
}

export default async function DossiePage({ params }: PageProps) {
  const { leadId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, nome, consultant_id, edificio_id, edificios(id, nome, endereco)')
    .eq('id', leadId)
    .single()

  if (error || !lead) notFound()

  const edificio = (lead as Record<string, unknown>).edificios as {
    id: string
    nome: string
    endereco: string
  } | null

  // Try to get latest ACM snapshot from existing dossie
  let acmSnapshot: AcmSnapshot | null = null
  const { data: existingDossie } = await supabase
    .from('dossies')
    .select('acm_snapshot')
    .eq('lead_id', leadId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingDossie?.acm_snapshot) {
    acmSnapshot = existingDossie.acm_snapshot as AcmSnapshot
  }

  return (
    <DossieScreen
      leadId={lead.id}
      leadNome={lead.nome}
      edificioEndereco={edificio?.endereco || 'Endereço não cadastrado'}
      consultantId={lead.consultant_id}
      acmSnapshot={acmSnapshot}
    />
  )
}

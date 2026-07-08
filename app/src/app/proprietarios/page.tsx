import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { OwnerHistoryTab, OwnerBudgetDashboard } from '@/components/owner-lookup'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

/**
 * /proprietarios — Story 6.7 (AC6/AC7).
 *
 * Historico de lookups + dashboard de consumo. Entrada pelo menu "Mais"
 * (mesmo padrao da call list FISBO /agenda — a tela `mais/` e um grid de
 * rotas, nao um host de abas).
 */
export default async function ProprietariosPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-dvh flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-base font-bold text-gray-900">Proprietários</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-20">
        <OwnerBudgetDashboard consultantId={user.id} />
        <OwnerHistoryTab consultantId={user.id} />
      </div>

      <BottomTabBar />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FunnelPage } from '@/components/funnel/FunnelPage'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

export default async function FunilPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative h-dvh flex flex-col">
      <div className="flex-1 overflow-hidden pb-14">
        <FunnelPage />
      </div>
      <BottomTabBar />
    </div>
  )
}

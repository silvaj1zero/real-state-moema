import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FisboCallList } from '@/components/fisbo/FisboCallList'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

export default async function AgendaPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // consultant_id === user.id neste schema
  return (
    <div className="relative h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto pb-14">
        <FisboCallList consultantId={user.id} />
      </div>
      <BottomTabBar />
    </div>
  )
}

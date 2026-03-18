import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DashboardPage } from '@/components/dashboard/DashboardPage'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <DashboardPage />
      </div>
      <BottomTabBar />
    </main>
  )
}

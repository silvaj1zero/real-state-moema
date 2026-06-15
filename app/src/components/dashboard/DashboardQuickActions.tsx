'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Users, Newspaper, Filter } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase/client'

/**
 * Atalhos rápidos no dashboard. ACM em destaque: vai direto à ACM do lead mais
 * recente do consultor (ou à lista de leads, se ainda não houver lead).
 */
export function DashboardQuickActions() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const { data: latestLeadId } = useQuery({
    queryKey: ['dashboard', 'latest-lead', user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user?.id) return null
      const supabase = createClient()
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('consultant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.id ?? null
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  })

  const actions = [
    {
      key: 'acm',
      label: 'ACM',
      icon: BarChart3,
      accent: 'text-[#003DA5] border-[#003DA5] bg-[#003DA5]/5',
      onClick: () => router.push(latestLeadId ? `/acm/${latestLeadId}` : '/leads'),
    },
    {
      key: 'leads',
      label: 'Leads',
      icon: Users,
      accent: 'text-gray-700 border-gray-200 bg-white',
      onClick: () => router.push('/leads'),
    },
    {
      key: 'feed',
      label: 'Feed',
      icon: Newspaper,
      accent: 'text-gray-700 border-gray-200 bg-white',
      onClick: () => router.push('/feed'),
    },
    {
      key: 'funil',
      label: 'Funil',
      icon: Filter,
      accent: 'text-gray-700 border-gray-200 bg-white',
      onClick: () => router.push('/funil'),
    },
  ]

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 px-0.5">Atalhos</p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ key, label, icon: Icon, accent, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border shadow-sm transition-colors hover:brightness-95 ${accent}`}
          >
            <Icon className="size-5" />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

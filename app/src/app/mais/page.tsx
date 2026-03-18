'use client'

import { useRouter } from 'next/navigation'
import { Users, DollarSign, Trophy, FileUp, Building2, Shield, Calendar, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MenuItemDef {
  label: string
  description: string
  path: string
  Icon: LucideIcon
  color: string
  epic: number
}

const MENU_ITEMS: MenuItemDef[] = [
  {
    label: 'Parceiros',
    description: 'Referrals e indicações',
    path: '/parceiros',
    Icon: Users,
    color: '#003DA5',
    epic: 4,
  },
  {
    label: 'Comissões',
    description: 'Tracking financeiro',
    path: '/comissoes',
    Icon: DollarSign,
    color: '#22C55E',
    epic: 4,
  },
  {
    label: 'Clubes RE/MAX',
    description: 'Progressão e metas',
    path: '/clubes',
    Icon: Trophy,
    color: '#FFD700',
    epic: 4,
  },
  {
    label: 'Importar Captei',
    description: 'CSV/Excel de leads',
    path: '/captei',
    Icon: FileUp,
    color: '#6366F1',
    epic: 4,
  },
  {
    label: 'Safari/Open House',
    description: 'Eventos e convites',
    path: '/safari',
    Icon: Calendar,
    color: '#FF8C00',
    epic: 4,
  },
  {
    label: 'Plano de Marketing',
    description: 'Ações por imóvel',
    path: '/marketing',
    Icon: FileText,
    color: '#EC4899',
    epic: 4,
  },
]

export default function MaisPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-base font-bold text-gray-900">Mais</h1>
        </div>
      </header>

      {/* Menu grid */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <item.Icon size={24} style={{ color: item.color }} />
            </div>
            <span className="text-sm font-semibold text-gray-800">{item.label}</span>
            <span className="text-[10px] text-gray-400 mt-0.5">{item.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

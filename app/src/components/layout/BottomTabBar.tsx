'use client'

import { usePathname, useRouter } from 'next/navigation'
import { MapPin, Filter, Bell, BarChart3, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TABS: { id: string; label: string; path: string; Icon: LucideIcon }[] = [
  { id: 'mapa', label: 'Mapa', path: '/', Icon: MapPin },
  { id: 'funil', label: 'Funil', path: '/funil', Icon: Filter },
  { id: 'feed', label: 'Feed', path: '/feed', Icon: Bell },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', Icon: BarChart3 },
  { id: 'mais', label: 'Mais', path: '/mais', Icon: MoreHorizontal },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-10 h-14 bg-white border-t border-gray-200 flex items-center justify-around safe-area-bottom">
      {TABS.map(({ id, label, path, Icon }) => {
        const isActive = pathname === path || (id === 'mapa' && pathname === '/')
        return (
          <button
            key={id}
            onClick={() => router.push(path)}
            className={`flex flex-col items-center justify-center w-16 h-full gap-0.5 ${
              isActive ? 'text-[#003DA5]' : 'text-[#6B7280]'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

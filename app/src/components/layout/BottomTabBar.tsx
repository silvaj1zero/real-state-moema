'use client'

import { usePathname, useRouter } from 'next/navigation'
import { MapPin, Filter, Bell, BarChart3, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useFeedUnreadCount } from '@/hooks/useFeed'
import { useAuthStore } from '@/store/auth'

const TABS: { id: string; label: string; path: string; Icon: LucideIcon }[] = [
  { id: 'mapa', label: 'Mapa', path: '/', Icon: MapPin },
  { id: 'funil', label: 'Funil', path: '/funil', Icon: Filter },
  { id: 'feed', label: 'Inteligência', path: '/feed', Icon: Bell },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', Icon: BarChart3 },
  { id: 'mais', label: 'Mais', path: '/mais', Icon: MoreHorizontal },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: unreadCount } = useFeedUnreadCount(user?.id ?? null)

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-10 h-14 bg-white border-t border-gray-200 flex items-center justify-around safe-area-bottom">
      {TABS.map(({ id, label, path, Icon }) => {
        const isActive = pathname === path || (id === 'mapa' && pathname === '/')
        return (
          <button
            key={id}
            onClick={() => router.push(path)}
            className={`relative flex flex-col items-center justify-center w-16 h-full gap-0.5 ${
              isActive ? 'text-[#003DA5]' : 'text-[#6B7280]'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            {/* Feed unread badge */}
            {id === 'feed' && unreadCount != null && unreadCount > 0 && (
              <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

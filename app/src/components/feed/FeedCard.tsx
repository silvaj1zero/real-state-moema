'use client'

import { useRouter } from 'next/navigation'
import {
  Home,
  TrendingDown,
  Repeat,
  Target,
  Clock,
  Calendar,
  Database,
  RefreshCw,
} from 'lucide-react'
import type { FeedItem } from '@/hooks/useFeed'
import { FEED_TYPE_CONFIG, PRIORIDADE_COLORS, relativeTime } from '@/hooks/useFeed'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'home-plus': Home,
  'trending-down': TrendingDown,
  repeat: Repeat,
  target: Target,
  clock: Clock,
  calendar: Calendar,
  database: Database,
  refresh: RefreshCw,
}

interface FeedCardProps {
  item: FeedItem
  onMarkRead?: (id: string) => void
}

export function FeedCard({ item, onMarkRead }: FeedCardProps) {
  const router = useRouter()
  const config = FEED_TYPE_CONFIG[item.tipo]
  const Icon = ICON_MAP[config.icon] || Database

  function handleTap() {
    if (!item.is_read && onMarkRead) {
      onMarkRead(item.id)
    }
    // Navigate to context
    if (item.lead_id) {
      router.push(`/acm/${item.lead_id}`)
    }
  }

  return (
    <button
      onClick={handleTap}
      className={cn(
        'w-full text-left p-3 rounded-xl border shadow-sm transition-all',
        item.is_read
          ? 'bg-white/60 border-gray-100 opacity-60'
          : 'bg-white border-gray-200 hover:shadow-md',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <Icon className="size-4" style={{ color: config.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">
              {item.titulo}
            </h4>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium shrink-0"
              style={{ backgroundColor: PRIORIDADE_COLORS[item.prioridade] }}
            >
              {item.prioridade}
            </span>
          </div>

          {item.descricao && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-1">
              {item.descricao}
            </p>
          )}

          <span className="text-[10px] text-gray-400">
            {relativeTime(item.created_at)}
          </span>
        </div>
      </div>
    </button>
  )
}

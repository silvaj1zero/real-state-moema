'use client'

import { useReciprocityMetrics } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/auth'
import { Send, Inbox, CheckCircle, TrendingUp } from 'lucide-react'

export function ReciprocityMetrics() {
  const user = useAuthStore((s) => s.user)
  const { metrics, isLoading } = useReciprocityMetrics(user?.id ?? null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Enviados', value: metrics.totalEnviados, Icon: Send, color: '#003DA5' },
    { label: 'Recebidos', value: metrics.totalRecebidos, Icon: Inbox, color: '#6366F1' },
    { label: 'Convertidos', value: metrics.totalConvertidos, Icon: CheckCircle, color: '#22C55E' },
    { label: 'Conversão', value: `${metrics.taxaConversao}%`, Icon: TrendingUp, color: '#F59E0B' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3">
      {cards.map(({ label, value, Icon, color }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center rounded-xl bg-white border border-gray-100 py-2 px-1 shadow-sm"
        >
          <Icon size={18} style={{ color }} strokeWidth={2} />
          <span className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </span>
          <span className="text-[10px] text-gray-500 font-medium">{label}</span>
        </div>
      ))}
    </div>
  )
}

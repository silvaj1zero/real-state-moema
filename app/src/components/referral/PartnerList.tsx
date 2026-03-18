'use client'

import { usePartners } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/auth'
import { PartnerCard } from './PartnerCard'
import { Users } from 'lucide-react'

export function PartnerList() {
  const user = useAuthStore((s) => s.user)
  const { partners, isLoading } = usePartners(user?.id ?? null)

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <Users size={28} className="text-[#003DA5]" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Nenhum parceiro ainda</p>
        <p className="text-xs text-gray-400">
          Toque em &quot;+ Parceiro&quot; para cadastrar seu primeiro parceiro de referrals
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-2">
      {partners.map((partner) => (
        <PartnerCard
          key={`${partner.parceiro_nome}||${partner.parceiro_franquia}`}
          partner={partner}
        />
      ))}
    </div>
  )
}

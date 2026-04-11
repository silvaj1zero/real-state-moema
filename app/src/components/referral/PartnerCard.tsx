'use client'

import type { Partner } from '@/hooks/useReferrals'
import { useReferralsStore } from '@/store/referrals'
import { Users, Send, Inbox, Plus } from 'lucide-react'

function reciprocityColor(enviados: number, recebidos: number): string {
  const diff = Math.abs(enviados - recebidos)
  if (diff <= 2) return '#22C55E' // green
  if (diff <= 5) return '#F59E0B' // yellow
  return '#DC3545' // red
}

function maskPhone(phone: string | null): string {
  if (!phone) return '—'
  // Show first 4 and last 2 digits
  if (phone.length <= 6) return phone
  return phone.slice(0, 4) + '****' + phone.slice(-2)
}

interface PartnerCardProps {
  partner: Partner
}

export function PartnerCard({ partner }: PartnerCardProps) {
  const openReferralForm = useReferralsStore((s) => s.openReferralForm)
  const recColor = reciprocityColor(partner.enviados, partner.recebidos)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: '#003DA5' }}
          >
            {partner.parceiro_nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{partner.parceiro_nome}</p>
            {partner.parceiro_franquia && (
              <p className="text-xs text-gray-500">{partner.parceiro_franquia}</p>
            )}
          </div>
        </div>
        {/* Reciprocity badge */}
        <div
          className="w-3 h-3 rounded-full mt-1"
          style={{ backgroundColor: recColor }}
          title={`Enviados: ${partner.enviados} | Recebidos: ${partner.recebidos}`}
        />
      </div>

      {/* Details */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        {partner.parceiro_regiao && (
          <span className="truncate max-w-[120px]">{partner.parceiro_regiao}</span>
        )}
        <span>{maskPhone(partner.parceiro_telefone)}</span>
      </div>

      {/* Stats + action */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-[#003DA5]">
            <Send size={12} /> {partner.enviados}
          </span>
          <span className="flex items-center gap-1 text-[#6366F1]">
            <Inbox size={12} /> {partner.recebidos}
          </span>
        </div>
        <button
          onClick={() => openReferralForm(partner.parceiro_nome, partner.parceiro_franquia)}
          className="flex items-center gap-1 text-xs font-medium text-[#003DA5] hover:text-[#002d7a] transition-colors"
        >
          <Plus size={14} /> Referral
        </button>
      </div>
    </div>
  )
}

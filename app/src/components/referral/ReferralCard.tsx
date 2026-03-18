'use client'

import { useState } from 'react'
import { StatusChip, StatusDropdown } from './ReferralPipeline'
import { CreateLeadFromReferralModal } from './CreateLeadFromReferralModal'
import { useUpdateReferralStatus } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/auth'
import type { Referral, StatusReferral } from '@/lib/supabase/types'
import { Send, Inbox, Calendar, Clock, Link as LinkIcon } from 'lucide-react'

interface ReferralCardProps {
  referral: Referral
}

export function ReferralCard({ referral }: ReferralCardProps) {
  const user = useAuthStore((s) => s.user)
  const updateStatus = useUpdateReferralStatus()
  const [showCreateLead, setShowCreateLead] = useState(false)

  const isExpired =
    referral.prazo_validade &&
    new Date(referral.prazo_validade) < new Date() &&
    ['enviada', 'aceita'].includes(referral.status)

  const handleStatusChange = (newStatus: StatusReferral) => {
    if (!user) return

    // AC5: When status changes to 'aceita' and direction is 'recebido', suggest creating lead
    if (
      newStatus === 'aceita' &&
      referral.direcao === 'recebido' &&
      !referral.lead_id
    ) {
      setShowCreateLead(true)
      return
    }

    updateStatus.mutate({
      id: referral.id,
      consultant_id: user.id,
      status: newStatus,
    })
  }

  const perfilTruncated = referral.cliente_perfil
    ? referral.cliente_perfil.length > 80
      ? referral.cliente_perfil.slice(0, 80) + '...'
      : referral.cliente_perfil
    : null

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        {/* Top row: partner + direction + status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-900">
              {referral.parceiro_nome}
            </span>
            {referral.direcao === 'enviado' ? (
              <Send size={12} className="text-[#003DA5]" />
            ) : (
              <Inbox size={12} className="text-[#6366F1]" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isExpired && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#BDBDBD]">
                <Clock size={10} /> Expirado
              </span>
            )}
            <StatusDropdown
              currentStatus={isExpired ? 'expirada' : referral.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>

        {/* Client profile */}
        {perfilTruncated && (
          <p className="text-xs text-gray-600 mb-2">{perfilTruncated}</p>
        )}

        {/* Details row */}
        <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
          {referral.tipologia_desejada && (
            <span>{referral.tipologia_desejada}</span>
          )}
          {(referral.faixa_preco_min || referral.faixa_preco_max) && (
            <span>
              R$ {referral.faixa_preco_min?.toLocaleString('pt-BR') ?? '?'} —{' '}
              R$ {referral.faixa_preco_max?.toLocaleString('pt-BR') ?? '?'}
            </span>
          )}
          {referral.regiao_desejada && (
            <span>{referral.regiao_desejada}</span>
          )}
          {referral.prazo_validade && (
            <span className="flex items-center gap-0.5">
              <Calendar size={10} />
              {new Date(referral.prazo_validade).toLocaleDateString('pt-BR')}
            </span>
          )}
          {referral.lead_id && (
            <span className="flex items-center gap-0.5 text-[#22C55E]">
              <LinkIcon size={10} /> Lead vinculado
            </span>
          )}
        </div>

        {/* Date */}
        <div className="mt-2 text-[10px] text-gray-300">
          {new Date(referral.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Modal: Create Lead from Referral (AC5) */}
      {showCreateLead && (
        <CreateLeadFromReferralModal
          referral={referral}
          onClose={() => setShowCreateLead(false)}
          onSuccess={() => setShowCreateLead(false)}
        />
      )}
    </>
  )
}

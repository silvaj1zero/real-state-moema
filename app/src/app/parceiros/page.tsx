'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useReferralsStore } from '@/store/referrals'
import { ReciprocityMetrics } from '@/components/referral/ReciprocityMetrics'
import { PartnerList } from '@/components/referral/PartnerList'
import { ReferralHistory } from '@/components/referral/ReferralHistory'
import { PartnerForm } from '@/components/referral/PartnerForm'
import { ReferralForm } from '@/components/referral/ReferralForm'
import { ArrowLeft, UserPlus, Users, History } from 'lucide-react'

type Tab = 'parceiros' | 'historico'

export default function ParceirosPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('parceiros')

  const isPartnerFormOpen = useReferralsStore((s) => s.isPartnerFormOpen)
  const isReferralFormOpen = useReferralsStore((s) => s.isReferralFormOpen)
  const openPartnerForm = useReferralsStore((s) => s.openPartnerForm)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Parceiros</h1>
          <button
            onClick={openPartnerForm}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: '#003DA5' }}
          >
            <UserPlus size={16} className="text-white" />
          </button>
        </div>
      </header>

      {/* Reciprocity metrics (AC7) */}
      <ReciprocityMetrics />

      {/* Tab selector */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setTab('parceiros')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'parceiros'
              ? 'text-[#003DA5] border-[#003DA5]'
              : 'text-gray-500 border-transparent'
          }`}
        >
          <Users size={16} /> Parceiros
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'historico'
              ? 'text-[#003DA5] border-[#003DA5]'
              : 'text-gray-500 border-transparent'
          }`}
        >
          <History size={16} /> Histórico
        </button>
      </div>

      {/* Content */}
      {tab === 'parceiros' ? <PartnerList /> : <ReferralHistory />}

      {/* FAB: + Parceiro */}
      <button
        onClick={openPartnerForm}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-10"
        style={{ backgroundColor: '#003DA5' }}
      >
        <UserPlus size={22} className="text-white" />
      </button>

      {/* Modals */}
      {isPartnerFormOpen && <PartnerForm />}
      {isReferralFormOpen && <ReferralForm />}
    </div>
  )
}

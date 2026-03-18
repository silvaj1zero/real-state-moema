'use client'

import { useParams, useRouter } from 'next/navigation'
import { MarketingPlanChecklist } from '@/components/marketing/MarketingPlanChecklist'
import { ArrowLeft, Megaphone } from 'lucide-react'

export default function MarketingPlanPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

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
          <div className="flex items-center gap-1.5">
            <Megaphone size={18} className="text-[#003DA5]" />
            <h1 className="text-base font-bold text-gray-900">Plano de Marketing</h1>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Checklist */}
      <MarketingPlanChecklist leadId={leadId} />
    </div>
  )
}

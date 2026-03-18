'use client'

import { useMarketingPlan, useUpdateMarketingPlan, calculateProgress, MARKETING_ITEMS, SECTION_LABELS } from '@/hooks/useMarketingPlan'
import { MarketingProgressBar } from './MarketingProgressBar'
import { ChecklistItem } from './ChecklistItem'
import type { MarketingPlan } from '@/lib/supabase/types'
import { Megaphone } from 'lucide-react'

interface MarketingPlanChecklistProps {
  leadId: string
}

export function MarketingPlanChecklist({ leadId }: MarketingPlanChecklistProps) {
  const { plan, isLoading } = useMarketingPlan(leadId)
  const updatePlan = useUpdateMarketingPlan()

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-3">
        <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <Megaphone size={28} className="text-[#003DA5]" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Sem plano de marketing</p>
        <p className="text-xs text-gray-400">
          O plano é criado automaticamente quando o lead entra em exclusividade
        </p>
      </div>
    )
  }

  const progress = calculateProgress(plan)

  const handleToggle = (updates: Partial<MarketingPlan>) => {
    updatePlan.mutate({
      id: plan.id,
      lead_id: leadId,
      updates,
    })
  }

  // Group items by section
  const sections = ['portais', 'redes', 'producao', 'presencial'] as const
  const grouped = sections.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    items: MARKETING_ITEMS.filter((item) => item.section === section),
  }))

  return (
    <div>
      {/* Progress bar (AC4) */}
      <MarketingProgressBar
        completed={progress.completed}
        total={progress.total}
        percent={progress.percent}
        bySection={progress.bySection}
      />

      {/* Sections with items (AC2/AC3) */}
      <div className="px-4 pb-6 space-y-4">
        {grouped.map(({ section, label, items }) => (
          <div key={section}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {label}
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <ChecklistItem
                  key={item.key}
                  item={item}
                  plan={plan}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

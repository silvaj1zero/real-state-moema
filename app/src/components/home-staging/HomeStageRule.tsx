'use client'

import { Home, Lightbulb, Package } from 'lucide-react'
import type { HomeStageRule as RuleType } from '@/hooks/useHomeStage'

const ICON_MAP = {
  home: Home,
  lightbulb: Lightbulb,
  package: Package,
} as const

interface HomeStageRuleProps {
  rule: RuleType
}

export function HomeStageRuleCard({ rule }: HomeStageRuleProps) {
  const Icon = ICON_MAP[rule.icon]

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm"
      style={{ borderLeft: `4px solid ${rule.borderColor}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${rule.borderColor}15` }}
        >
          <Icon className="size-5" style={{ color: rule.borderColor }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{rule.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{rule.description}</p>
        </div>
      </div>
    </div>
  )
}

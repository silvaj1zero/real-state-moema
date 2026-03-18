'use client'

import { useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import {
  useChecklistByLead,
  useCreateChecklist,
  useUpdateChecklistItem,
  CHECKLIST_ITEMS,
  countCompleted,
  type ChecklistItemKey,
} from '@/hooks/useChecklist'
import type { ChecklistPreparacao } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { HomeStageShare } from './HomeStageShare'

// ---------------------------------------------------------------------------
// Progress color helper
// ---------------------------------------------------------------------------

function getProgressColor(completed: number): string {
  if (completed >= 5) return 'bg-green-500'
  if (completed >= 3) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getProgressTextColor(completed: number): string {
  if (completed >= 5) return 'text-green-700'
  if (completed >= 3) return 'text-yellow-700'
  return 'text-red-700'
}

// ---------------------------------------------------------------------------
// V2 Notification helper
// ---------------------------------------------------------------------------

function getV2Notification(
  checklist: ChecklistPreparacao | null,
  completed: number
): string | null {
  if (!checklist?.data_v2 || completed >= 5) return null

  const v2Date = new Date(checklist.data_v2)
  const now = new Date()
  const diffMs = v2Date.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  // Within 24h before V2
  if (diffHours > 0 && diffHours <= 24) {
    const pending = 5 - completed
    return `V2 amanh\u00e3 \u2014 ${pending} ${pending === 1 ? 'item pendente' : 'itens pendentes'}!`
  }

  return null
}

// ---------------------------------------------------------------------------
// ChecklistV2 — Visual checklist for V2 preparation
// ---------------------------------------------------------------------------

interface ChecklistV2Props {
  leadId: string
  dataV2?: string // ISO date of V2 appointment
  className?: string
}

export function ChecklistV2({ leadId, dataV2, className }: ChecklistV2Props) {
  const user = useAuthStore((s) => s.user)
  const { checklist, isLoading } = useChecklistByLead(leadId)
  const createChecklist = useCreateChecklist()
  const updateItem = useUpdateChecklistItem()

  // Auto-create checklist when component mounts and none exists
  useEffect(() => {
    if (!isLoading && !checklist && user?.id && leadId) {
      createChecklist.mutate({
        lead_id: leadId,
        consultant_id: user.id,
        tipo: 'preparacao_v2',
        data_v2: dataV2,
      })
    }
  }, [isLoading, checklist, user?.id, leadId, dataV2, createChecklist])

  const completed = useMemo(() => countCompleted(checklist), [checklist])

  const notification = useMemo(
    () => getV2Notification(checklist, completed),
    [checklist, completed]
  )

  const handleToggle = (field: ChecklistItemKey, currentValue: boolean) => {
    if (!checklist) return
    updateItem.mutate({
      checklistId: checklist.id,
      leadId,
      field,
      value: !currentValue,
    })
  }

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">
          Prepara\u00e7\u00e3o V2
        </h3>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            getProgressTextColor(completed),
            completed >= 5
              ? 'bg-green-100'
              : completed >= 3
                ? 'bg-yellow-100'
                : 'bg-red-100'
          )}
        >
          {completed}/5 completo
        </span>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <svg
            className="w-4 h-4 text-red-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-xs font-medium text-red-700">{notification}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getProgressColor(completed))}
          style={{ width: `${(completed / 5) * 100}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1">
        {CHECKLIST_ITEMS.map((item) => {
          const value = checklist ? (checklist[item.key] as boolean) : false

          return (
            <button
              key={item.key}
              onClick={() => handleToggle(item.key, value)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  value
                    ? 'bg-green-500 border-green-500'
                    : 'bg-white border-gray-300'
                )}
              >
                {value && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-sm transition-colors',
                  value ? 'text-gray-400 line-through' : 'text-gray-900'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Home Staging share button */}
      <HomeStageShare />
    </div>
  )
}

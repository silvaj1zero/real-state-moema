'use client'

import { cn } from '@/lib/utils'
import { UpcomingWidget } from '@/components/scheduling/UpcomingWidget'
import { EmptyState } from './EmptyState'

// ---------------------------------------------------------------------------
// UpcomingSection — wrapper for the UpcomingWidget from Story 2.6
// ---------------------------------------------------------------------------

interface UpcomingSectionProps {
  className?: string
}

export function UpcomingSection({ className }: UpcomingSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: '#6366F1' }}
        />
        Proximos Agendamentos
      </h3>

      {/* Reuse UpcomingWidget from Story 2.6 */}
      <UpcomingWidget />
    </div>
  )
}

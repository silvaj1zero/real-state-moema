'use client'

import { useLeadsStore } from '@/store/leads'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// AddLeadButton — AC1: "+ Lead" button for building cards (Story 2.1)
// Outlined blue #003DA5, 36px height, person+ icon
// ---------------------------------------------------------------------------

interface AddLeadButtonProps {
  edificioId: string
  className?: string
}

export function AddLeadButton({ edificioId, className }: AddLeadButtonProps) {
  const openLeadForm = useLeadsStore((s) => s.openLeadForm)

  return (
    <button
      onClick={() => openLeadForm(edificioId)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 rounded-lg border border-[#003DA5] text-[#003DA5] text-xs font-medium',
        'hover:bg-[#003DA5]/5 active:bg-[#003DA5]/10 transition-colors',
        className,
      )}
      style={{ height: '36px' }}
    >
      {/* Person+ icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
      + Lead
    </button>
  )
}

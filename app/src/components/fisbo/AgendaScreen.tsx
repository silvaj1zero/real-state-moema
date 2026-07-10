'use client'

import { useState } from 'react'
import { PhoneCall, Route as RouteIcon } from 'lucide-react'
import { FisboCallList } from '@/components/fisbo/FisboCallList'
import { VisitRoute } from '@/components/fisbo/VisitRoute'
import { cn } from '@/lib/utils'

type Tab = 'ligacoes' | 'roteiro'

/**
 * Casca do Epic 10 (Agenda de Prospecção FISBO): alterna entre a call list
 * (Story 10.1) e o roteiro de visitas por proximidade (Story 10.2).
 */
export function AgendaScreen({ consultantId }: { consultantId: string }) {
  const [tab, setTab] = useState<Tab>('ligacoes')

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <TabButton active={tab === 'ligacoes'} onClick={() => setTab('ligacoes')} Icon={PhoneCall} label="Ligações" />
        <TabButton active={tab === 'roteiro'} onClick={() => setTab('roteiro')} Icon={RouteIcon} label="Roteiro" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'ligacoes' ? (
          <FisboCallList consultantId={consultantId} />
        ) : (
          <VisitRoute consultantId={consultantId} />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: typeof PhoneCall
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 h-11 inline-flex items-center justify-center gap-1.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-[#003DA5] text-[#003DA5]'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  )
}

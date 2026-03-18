'use client'

import type { StatusReferral } from '@/lib/supabase/types'

const STATUS_CONFIG: Record<StatusReferral, { label: string; color: string; bg: string }> = {
  enviada: { label: 'Enviada', color: '#9E9E9E', bg: '#F5F5F5' },
  aceita: { label: 'Aceita', color: '#003DA5', bg: '#E8F0FE' },
  recusada: { label: 'Recusada', color: '#DC3545', bg: '#FDECEA' },
  em_andamento: { label: 'Em Andamento', color: '#FF8C00', bg: '#FFF3E0' },
  convertida: { label: 'Convertida', color: '#28A745', bg: '#E8F5E9' },
  comissao_paga: { label: 'Comissão Paga', color: '#FFD700', bg: '#FFFDE7' },
  expirada: { label: 'Expirada', color: '#BDBDBD', bg: '#FAFAFA' },
}

const PIPELINE_ORDER: StatusReferral[] = [
  'enviada',
  'aceita',
  'em_andamento',
  'convertida',
  'comissao_paga',
]

interface StatusChipProps {
  status: StatusReferral
  size?: 'sm' | 'md'
}

export function StatusChip({ status, size = 'sm' }: StatusChipProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

interface StatusDropdownProps {
  currentStatus: StatusReferral
  onStatusChange: (status: StatusReferral) => void
}

export function StatusDropdown({ currentStatus, onStatusChange }: StatusDropdownProps) {
  const allStatuses: StatusReferral[] = [
    ...PIPELINE_ORDER,
    'recusada',
    'expirada',
  ]

  return (
    <select
      value={currentStatus}
      onChange={(e) => onStatusChange(e.target.value as StatusReferral)}
      className="text-xs rounded-lg border border-gray-300 px-2 py-1 focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
      style={{ color: STATUS_CONFIG[currentStatus].color }}
    >
      {allStatuses.map((s) => (
        <option key={s} value={s}>
          {STATUS_CONFIG[s].label}
        </option>
      ))}
    </select>
  )
}

interface ReferralPipelineProps {
  currentStatus: StatusReferral
}

export function ReferralPipeline({ currentStatus }: ReferralPipelineProps) {
  const currentIndex = PIPELINE_ORDER.indexOf(currentStatus)

  // Don't show pipeline for terminal states
  if (currentStatus === 'recusada' || currentStatus === 'expirada') {
    return <StatusChip status={currentStatus} size="md" />
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {PIPELINE_ORDER.map((status, i) => {
        const config = STATUS_CONFIG[status]
        const isActive = i <= currentIndex
        const isCurrent = status === currentStatus

        return (
          <div key={status} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-all ${
                isCurrent ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{
                backgroundColor: isActive ? config.bg : '#F5F5F5',
                color: isActive ? config.color : '#BDBDBD',
                ...(isCurrent ? { ringColor: config.color } : {}),
              }}
            >
              {config.label}
            </span>
            {i < PIPELINE_ORDER.length - 1 && (
              <span className="text-gray-300 text-[10px]">→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

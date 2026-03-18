'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAuthStore } from '@/store/auth'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import { useFunnelStore } from '@/store/funnel'
import { LeadCard } from '@/components/lead/LeadCard'
import { cn } from '@/lib/utils'
import type { EtapaFunil, LeadWithEdificio } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Column configuration
// ---------------------------------------------------------------------------

interface ColumnConfig {
  etapa: EtapaFunil
  label: string
  headerColor: string
  headerTextColor: string
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  { etapa: 'contato', label: 'Contato', headerColor: 'bg-gray-500', headerTextColor: 'text-white' },
  { etapa: 'v1_agendada', label: 'V1 Agendada', headerColor: 'bg-[#003DA5]', headerTextColor: 'text-white' },
  { etapa: 'v1_realizada', label: 'V1 Realizada', headerColor: 'bg-[#003DA5]', headerTextColor: 'text-white' },
  { etapa: 'v2_agendada', label: 'V2 Agendada', headerColor: 'bg-[#001D4A]', headerTextColor: 'text-white' },
  { etapa: 'v2_realizada', label: 'V2 Realizada', headerColor: 'bg-[#001D4A]', headerTextColor: 'text-white' },
  { etapa: 'representacao', label: 'Exclusividade', headerColor: 'bg-[#D97706]', headerTextColor: 'text-white' },
  { etapa: 'venda', label: 'Venda', headerColor: 'bg-[#22C55E]', headerTextColor: 'text-white' },
]

// ---------------------------------------------------------------------------
// DraggableLeadCard
// ---------------------------------------------------------------------------

interface DraggableLeadCardProps {
  lead: LeadWithEdificio
}

function DraggableLeadCard({ lead }: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <LeadCard lead={lead} className={cn(isDragging && 'shadow-lg ring-2 ring-[#003DA5]')} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// DroppableColumn
// ---------------------------------------------------------------------------

interface DroppableColumnProps {
  column: ColumnConfig
  leads: LeadWithEdificio[]
  isLoading: boolean
  count: number
}

function DroppableColumn({ column, leads, isLoading, count }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.etapa,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[260px] w-[260px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden transition-colors',
        isOver && 'bg-blue-50 border-[#003DA5] ring-1 ring-[#003DA5]/30'
      )}
    >
      {/* Column header */}
      <div className={cn('px-3 py-2.5 flex items-center justify-between', column.headerColor)}>
        <span className={cn('text-sm font-semibold', column.headerTextColor)}>
          {column.label}
        </span>
        <span
          className={cn(
            'text-[10px] min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 bg-white/20',
            column.headerTextColor
          )}
        >
          {count}
        </span>
      </div>

      {/* Column content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-220px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-gray-400 text-center">Nenhum lead</p>
          </div>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard key={lead.id} lead={lead} />
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FunnelKanban — Desktop Kanban with drag-and-drop
// ---------------------------------------------------------------------------

interface FunnelKanbanProps {
  stageCounts: Record<string, number>
}

export function FunnelKanban({ stageCounts }: FunnelKanbanProps) {
  const user = useAuthStore((s) => s.user)
  const openTransitionModal = useFunnelStore((s) => s.openTransitionModal)
  const [activeDragLead, setActiveDragLead] = useState<LeadWithEdificio | null>(null)

  // Fetch leads per column
  const contatoQuery = useLeadsByFunnel(user?.id ?? null, 'contato')
  const v1AgendadaQuery = useLeadsByFunnel(user?.id ?? null, 'v1_agendada')
  const v1RealizadaQuery = useLeadsByFunnel(user?.id ?? null, 'v1_realizada')
  const v2AgendadaQuery = useLeadsByFunnel(user?.id ?? null, 'v2_agendada')
  const v2RealizadaQuery = useLeadsByFunnel(user?.id ?? null, 'v2_realizada')
  const representacaoQuery = useLeadsByFunnel(user?.id ?? null, 'representacao')
  const vendaQuery = useLeadsByFunnel(user?.id ?? null, 'venda')

  const leadsMap: Record<string, { leads: LeadWithEdificio[]; isLoading: boolean }> = {
    contato: contatoQuery,
    v1_agendada: v1AgendadaQuery,
    v1_realizada: v1RealizadaQuery,
    v2_agendada: v2AgendadaQuery,
    v2_realizada: v2RealizadaQuery,
    representacao: representacaoQuery,
    venda: vendaQuery,
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as LeadWithEdificio | undefined
    if (lead) {
      setActiveDragLead(lead)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragLead(null)

      const { active, over } = event
      if (!over) return

      const targetEtapa = over.id as EtapaFunil
      const lead = active.data.current?.lead as LeadWithEdificio | undefined
      if (!lead) return

      // Don't transition if dropped on same column
      if (lead.etapa_funil === targetEtapa) return

      // Open transition modal — mandatory for all transitions
      openTransitionModal(lead.id, lead.etapa_funil, targetEtapa)
    },
    [openTransitionModal]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto p-4 h-full">
        {KANBAN_COLUMNS.map((column) => {
          const queryData = leadsMap[column.etapa]
          return (
            <DroppableColumn
              key={column.etapa}
              column={column}
              leads={queryData?.leads ?? []}
              isLoading={queryData?.isLoading ?? false}
              count={stageCounts[column.etapa] ?? 0}
            />
          )
        })}
      </div>

      {/* Drag overlay — shows floating card while dragging */}
      <DragOverlay>
        {activeDragLead ? (
          <div className="w-[240px] opacity-90">
            <LeadCard lead={activeDragLead} className="shadow-xl ring-2 ring-[#003DA5]" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Section-specific motivational messages
// ---------------------------------------------------------------------------

const EMPTY_MESSAGES: Record<string, { title: string; message: string; icon: string }> = {
  territorial: {
    title: 'Comece a mapear!',
    message: 'Comece a mapear sua regiao! O primeiro passo e caminhar pelo bairro.',
    icon: 'map',
  },
  funnel: {
    title: 'Seu funil esta vazio',
    message: 'Cadastre seu primeiro lead para ver o funil em acao.',
    icon: 'funnel',
  },
  informantes: {
    title: 'Conhega seus aliados',
    message: 'Conheca os zeladores da sua regiao — eles sao seus melhores aliados.',
    icon: 'people',
  },
  frog: {
    title: 'Ative sua rede!',
    message: 'Ative sua rede! Comece pela Familia e expanda.',
    icon: 'network',
  },
  meta: {
    title: 'Configure sua meta',
    message: 'Configure sua meta diaria em Configuracoes.',
    icon: 'target',
  },
  agendamentos: {
    title: 'Nenhum agendamento',
    message: 'Agende sua primeira V1 para comecar a prospectar.',
    icon: 'calendar',
  },
}

// ---------------------------------------------------------------------------
// Icons (inline SVG to avoid extra deps)
// ---------------------------------------------------------------------------

function EmptyIcon({ type }: { type: string }) {
  switch (type) {
    case 'map':
      return (
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      )
    case 'funnel':
      return (
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      )
    case 'people':
      return (
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      )
    case 'network':
      return (
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      )
    case 'target':
      return (
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0zm0-5a5 5 0 110 10 5 5 0 010-10zm0 3a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// EmptyState component
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  section: keyof typeof EMPTY_MESSAGES
  className?: string
}

export function EmptyState({ section, className }: EmptyStateProps) {
  const config = EMPTY_MESSAGES[section]
  if (!config) return null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-6 px-4 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200',
        className,
      )}
    >
      <EmptyIcon type={config.icon} />
      <p className="text-sm font-medium text-gray-500 mt-2">
        {config.title}
      </p>
      <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
        {config.message}
      </p>
    </div>
  )
}

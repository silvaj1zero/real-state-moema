'use client'

import { useState } from 'react'
import type { Script, CategoriaScript } from '@/lib/supabase/types'

interface ScriptCardProps {
  script: Script
}

const CATEGORIA_COLORS: Record<CategoriaScript, string> = {
  objecao_imobiliaria: '#DC1431',
  objecao_experiencia: '#DC1431',
  objecao_exclusividade: '#EAB308',
  objecao_comissao: '#F97316',
  objecao_preco: '#EF4444',
  abordagem_inicial: '#003DA5',
  fechamento: '#22C55E',
  follow_up: '#8B5CF6',
}

const CATEGORIA_LABELS: Record<CategoriaScript, string> = {
  objecao_imobiliaria: 'Objeção Imobiliária',
  objecao_experiencia: 'Objeção Experiência',
  objecao_exclusividade: 'Objeção Exclusividade',
  objecao_comissao: 'Objeção Comissão',
  objecao_preco: 'Objeção Preço',
  abordagem_inicial: 'Abordagem Inicial',
  fechamento: 'Fechamento',
  follow_up: 'Follow-up',
}

export function ScriptCard({ script }: ScriptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const badgeColor = CATEGORIA_COLORS[script.categoria]
  const badgeLabel = CATEGORIA_LABELS[script.categoria]

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header — always visible, acts as accordion toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-3 text-left active:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 leading-snug">{script.titulo}</h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="inline-block text-[10px] font-semibold text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: badgeColor }}
            >
              {badgeLabel}
            </span>
            {script.tecnica && (
              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {script.tecnica}
              </span>
            )}
          </div>
        </div>
        {/* Chevron indicator */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-gray-400 mt-0.5 shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Objeção */}
          <div className="mt-3">
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
              Objeção
            </span>
            <p className="text-sm text-gray-700 italic mt-0.5 leading-relaxed">
              &ldquo;{script.objecao}&rdquo;
            </p>
          </div>

          {/* Resposta */}
          <div className="mt-3">
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
              Resposta
            </span>
            <p className="text-sm text-gray-800 mt-0.5 leading-relaxed whitespace-pre-line">
              {script.resposta}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { CATEGORIA_COLORS, CATEGORIA_LABELS }

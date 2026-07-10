'use client'

/**
 * Story 9.23 AC5/AC1 — painel de transparência pré-download.
 *
 * Exibe, a partir do `AcmLaudoComputation` (ADR-EPIC8-001, zero recálculo na UI):
 *  - headline em faixa no formato H-3 "Mercado R$ X–Y (referência Z)" (9.10);
 *  - lista de `avisos[]` (Story 9.15) com ícone por severidade;
 *  - auto-referências excluídas pelo guard-rail 9.8 (contagem + endereços +
 *    motivos) quando houver — informa, não bloqueia (AC1).
 *
 * Todos os números vêm do computation — a UI nunca inventa valor (AC6).
 */
import { AlertTriangle, Info, ShieldAlert, ShieldX } from 'lucide-react'

import { formatBRL } from '@/lib/format'
import type { AcmLaudoComputation, AvisoSeveridade } from '@/lib/acm/methodology'

/** Texto H-3 do headline: faixa quando min≠max; ponto único quando coincidem. */
export function headlineFaixaTexto(computation: AcmLaudoComputation): string {
  const h = computation.headline
  if (h.mercado.min !== h.mercado.max) {
    return `Mercado ${formatBRL(h.mercado.min)}–${formatBRL(h.mercado.max)} (referência ${formatBRL(
      h.referencia.valorMercado,
    )})`
  }
  return `Mercado ${formatBRL(h.referencia.valorMercado)}`
}

const SEVERIDADE_STYLE: Record<
  AvisoSeveridade,
  { Icon: typeof Info; wrap: string; icon: string }
> = {
  info: { Icon: Info, wrap: 'bg-blue-50 border-blue-100 text-blue-800', icon: 'text-blue-500' },
  atencao: {
    Icon: AlertTriangle,
    wrap: 'bg-amber-50 border-amber-100 text-amber-800',
    icon: 'text-amber-500',
  },
  critico: {
    Icon: ShieldAlert,
    wrap: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-500',
  },
}

interface AcmAvisosPanelProps {
  computation: AcmLaudoComputation
}

export function AcmAvisosPanel({ computation }: AcmAvisosPanelProps) {
  const { avisos, autoReferenciasExcluidas } = computation

  return (
    <div data-testid="acm-avisos-panel" className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {/* Headline em faixa (formato H-3) */}
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
          Prévia do valor de mercado
        </span>
        <p data-testid="acm-headline-faixa" className="text-sm font-semibold text-gray-900">
          {headlineFaixaTexto(computation)}
        </p>
      </div>

      {/* Guard-rail 9.8 — auto-referências excluídas (AC1) */}
      {autoReferenciasExcluidas.length > 0 && (
        <div
          data-testid="acm-auto-referencias"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <ShieldX className="size-3.5 shrink-0 text-red-500" />
            {autoReferenciasExcluidas.length} comparável(is) excluído(s) — provável anúncio do próprio alvo
          </p>
          <ul className="mt-1 space-y-0.5 pl-5 text-[11px]">
            {autoReferenciasExcluidas.map((r) => (
              <li key={r.endereco} className="list-disc">
                <span className="font-medium">{r.endereco}</span>
                {r.motivos.length > 0 ? ` — ${r.motivos.join('; ')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Avisos determinísticos de robustez (Story 9.15) */}
      {avisos.length > 0 && (
        <ul data-testid="acm-avisos-lista" className="space-y-1.5">
          {avisos.map((aviso) => {
            const style = SEVERIDADE_STYLE[aviso.severidade]
            const { Icon } = style
            return (
              <li
                key={aviso.codigo}
                className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${style.wrap}`}
              >
                <Icon className={`mt-px size-3.5 shrink-0 ${style.icon}`} />
                <span>{aviso.mensagem}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

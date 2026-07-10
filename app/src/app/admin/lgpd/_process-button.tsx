'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * ProcessOptOutButton — Epic 7 Story 7.10 AC9.
 *
 * Client Component used in /admin/lgpd to trigger the LGPD opt-out processing
 * pipeline for a pending request. Calls `POST /api/admin/lgpd/process-opt-out`
 * which delegates to the `fn_lgpd_process_opt_out` RPC (locks the request,
 * anonymises matching leads, marks the request completed, audits).
 *
 * UX contract:
 *   - useTransition for non-blocking UI
 *   - States: idle → loading (disabled + label change) → success | error
 *   - aria-live region so screen readers announce result
 *   - min-h-11 touch target (WCAG AA / NFR-001)
 *
 * Tailwind classes mirror the admin button pattern used by Story 7.8 review
 * queue (see `app/src/components/ReviewQueueCard.tsx`).
 */

interface Props {
  protocolNumber: string
}

type Status = 'idle' | 'success' | 'error'

interface ProcessOptOutResponse {
  protocol_number?: string
  matched?: number
  status?: string
  error?: string
  detail?: string
}

export function ProcessOptOutButton({ protocolNumber }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setStatus('idle')
    setMessage(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/lgpd/process-opt-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocol_number: protocolNumber }),
        })
        const data = (await res.json().catch(() => ({}))) as ProcessOptOutResponse

        if (!res.ok) {
          const detail = data.detail ?? data.error ?? `HTTP ${res.status}`
          setStatus('error')
          setMessage(`Falha ao processar: ${detail}`)
          return
        }

        const matched = data.matched ?? 0
        setStatus('success')
        setMessage(
          `Processado. ${matched} lead${matched === 1 ? '' : 's'} anonimizado${
            matched === 1 ? '' : 's'
          }.`
        )
        router.refresh()
      } catch (err) {
        setStatus('error')
        setMessage(
          `Erro de rede: ${
            err instanceof Error ? err.message : 'desconhecido'
          }`
        )
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || status === 'success'}
        aria-label={`Processar opt-out do protocolo ${protocolNumber}`}
        className="min-h-11 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? 'Processando…'
          : status === 'success'
            ? 'Concluído'
            : 'Processar'}
      </button>
      {message && (
        <span
          role={status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={
            status === 'error'
              ? 'text-xs text-red-700'
              : 'text-xs text-green-700'
          }
        >
          {message}
        </span>
      )}
    </div>
  )
}

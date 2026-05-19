'use client'

import { useState, useTransition } from 'react'
import {
  submitReviewDecision,
  revealPhone,
  type ReviewAction,
} from '@/app/leads/review-queue/actions'

/**
 * ReviewQueueCard — Story 7.8 AC3 + AC4.
 *
 * Mobile-first card: photo, address, price, classification + confidence badge,
 * signals chips, action buttons (Confirm FISBO / Mark Broker / Discard),
 * masked phone with LGPD reveal modal.
 *
 * Touch targets >= 44px (WCAG AA NFR-001).
 */

export interface ReviewQueueListing {
  id: string
  portal: string
  external_id: string
  url: string | null
  endereco: string | null
  bairro: string | null
  preco: number | null
  area_m2: number | null
  quartos: number | null
  tipologia: string | null
  classification: string | null
  classification_confidence: number | null
  classification_signals: unknown
  created_at: string
}

interface Props {
  listing: ReviewQueueListing
}

const PORTAL_LABELS: Record<string, string> = {
  mercadolivre: 'Mercado Livre',
  zap: 'Zap',
  olx: 'OLX',
  vivareal: 'VivaReal',
}

function formatBRL(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function classificationBadgeClass(
  classification: string | null,
  confidence: number | null
): string {
  if (confidence == null) return 'bg-gray-100 text-gray-800 border-gray-300'
  if (confidence < 0.4) return 'bg-red-50 text-red-800 border-red-300'
  if (confidence < 0.7) return 'bg-amber-50 text-amber-900 border-amber-300'
  return 'bg-emerald-50 text-emerald-800 border-emerald-300'
}

function signalsArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === 'string')
  }
  return []
}

export function ReviewQueueCard({ listing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [decided, setDecided] = useState<ReviewAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)
  const [phoneRevealed, setPhoneRevealed] = useState(false)
  const [consent, setConsent] = useState(false)

  const signals = signalsArray(listing.classification_signals)

  function handleAction(action: ReviewAction) {
    setError(null)
    startTransition(async () => {
      const res = await submitReviewDecision({ listingId: listing.id, action })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setDecided(action)
    })
  }

  function handleReveal() {
    if (!consent) {
      setError('Confirme o aviso LGPD para revelar o telefone.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await revealPhone({ listingId: listing.id, consent: true })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setPhoneRevealed(true)
      setRevealOpen(false)
    })
  }

  if (decided) {
    return (
      <article
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900"
        data-testid="card-decided"
      >
        Decisão registrada: <strong>{decisionLabel(decided)}</strong>.
      </article>
    )
  }

  return (
    <article
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      data-testid="review-card"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium uppercase tracking-wide">
              {PORTAL_LABELS[listing.portal] ?? listing.portal}
            </span>
            <span>•</span>
            <span className="truncate">{listing.external_id}</span>
          </div>

          <h2 className="mt-1 text-base font-semibold text-gray-900">
            {listing.endereco ?? 'Endereço não informado'}
          </h2>
          <p className="text-sm text-gray-600">
            {listing.bairro ?? 'Bairro —'}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
            <span className="font-semibold">{formatBRL(listing.preco)}</span>
            {listing.area_m2 != null && <span>{listing.area_m2} m²</span>}
            {listing.quartos != null && <span>{listing.quartos} quartos</span>}
            {listing.tipologia && <span>{listing.tipologia}</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classificationBadgeClass(
                listing.classification,
                listing.classification_confidence
              )}`}
            >
              {listing.classification ?? 'unknown'}
              {listing.classification_confidence != null && (
                <span className="ml-1 opacity-75">
                  ({(listing.classification_confidence * 100).toFixed(0)}%)
                </span>
              )}
            </span>
            {signals.slice(0, 6).map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-800"
              >
                {s}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3 text-sm">
            {phoneRevealed ? (
              <span className="text-gray-700">Telefone revelado (ver log)</span>
            ) : (
              <button
                type="button"
                onClick={() => setRevealOpen(true)}
                className="text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Revelar telefone do anunciante"
              >
                ✆ Revelar telefone
              </button>
            )}
            {listing.url && (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Abrir anúncio original em nova aba"
              >
                Ver anúncio original ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 border-t border-gray-100 bg-gray-50 p-3 sm:grid-cols-3">
        <ActionButton
          variant="primary"
          disabled={isPending}
          onClick={() => handleAction('confirmed_fisbo')}
          ariaLabel="Confirmar como FISBO (proprietário direto)"
        >
          Confirmar FISBO
        </ActionButton>
        <ActionButton
          variant="warning"
          disabled={isPending}
          onClick={() => handleAction('rejected_is_broker')}
          ariaLabel="Marcar como imobiliária"
        >
          Marcar Imobiliária
        </ActionButton>
        <ActionButton
          variant="ghost"
          disabled={isPending}
          onClick={() => handleAction('discarded')}
          ariaLabel="Descartar este anúncio"
        >
          Descartar
        </ActionButton>
      </div>

      {revealOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`reveal-${listing.id}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          data-testid="reveal-modal"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3
              id={`reveal-${listing.id}`}
              className="text-lg font-semibold text-gray-900"
            >
              Revelar telefone — aviso LGPD
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              Esta ação será registrada no audit log (Art. 7º IX LGPD —
              interesse legítimo). Você se compromete a respeitar o direito do
              titular.
            </p>
            <label className="mt-3 flex items-start gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="Confirmar consentimento LGPD"
              />
              <span>
                Estou ciente que a LGPD me obriga a respeitar o direito do
                titular.
              </span>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRevealOpen(false)
                  setConsent(false)
                  setError(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReveal}
                disabled={!consent || isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Revelar
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function decisionLabel(a: ReviewAction): string {
  switch (a) {
    case 'confirmed_fisbo':
      return 'Confirmado FISBO'
    case 'confirmed_other':
      return 'Confirmado (outro)'
    case 'rejected_is_broker':
      return 'Imobiliária'
    case 'rejected_is_construtora':
      return 'Construtora'
    case 'discarded':
      return 'Descartado'
    case 'skipped':
      return 'Pulado'
  }
}

function ActionButton({
  variant,
  disabled,
  onClick,
  ariaLabel,
  children,
}: {
  variant: 'primary' | 'warning' | 'ghost'
  disabled?: boolean
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  const base =
    'min-h-11 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
  const variants: Record<typeof variant, string> = {
    primary:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    warning:
      'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400',
    ghost:
      'border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 focus:ring-gray-400',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  )
}

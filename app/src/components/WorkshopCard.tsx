'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useValidationBatch,
  type LucianaDecision,
} from '@/hooks/useValidationBatch'

/**
 * WorkshopCard — Story 7.9 AC2.
 *
 * Cartao unitario do workshop: mostra 1 listing por vez com 3 botoes de
 * decisao, campo notas, navegacao prev/next, e shortcuts de teclado:
 *   S      -> is_fisbo
 *   N      -> not_fisbo
 *   ?      -> unknown
 *   ←  →   -> prev/next
 *
 * Touch targets min-h-11 (44px) por NFR-001 / Epic 7 a11y.
 * Swipe gestures: WAVE B (deferred — keyboard + tap suficiente para
 * desktop + tablet do workshop).
 */

export interface WorkshopBatchItem {
  id: string
  scraped_listing_id: string
  hypothesis_classification: string
  confidence: number
  luciana_decision: LucianaDecision | null
  luciana_notes: string | null
  decided_at: string | null
  listing: {
    portal: string | null
    endereco: string | null
    bairro: string | null
    preco: number | null
    area_m2: number | null
    quartos: number | null
    tipologia: string | null
    url: string | null
    classification_signals: unknown
  } | null
}

interface Props {
  items: WorkshopBatchItem[]
  initialIndex: number
}

function formatBRL(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function signalsArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === 'string')
  }
  return []
}

const DECISION_LABELS: Record<LucianaDecision, string> = {
  is_fisbo: 'Sim, e FISBO real',
  not_fisbo: 'Nao, e Imobiliaria/Corretor',
  unknown: 'Nao sei / Insuficiente',
}

export function WorkshopCard({ items, initialIndex }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPending, save } = useValidationBatch()

  const [index, setIndex] = useState(initialIndex)
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const total = items.length
  const current = items[index]

  // Sync notes when index changes
  useEffect(() => {
    setNotes(current?.luciana_notes ?? '')
    setError(null)
  }, [current?.id, current?.luciana_notes])

  const nav = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(total - 1, newIndex))
    setIndex(clamped)
    const params = new URLSearchParams(searchParams.toString())
    params.set('i', String(clamped))
    router.replace(`/admin/validation-workshop?${params.toString()}`, {
      scroll: false,
    })
  }

  const handleDecision = async (decision: LucianaDecision) => {
    if (!current) return
    setError(null)
    const res = await save({
      batchId: current.id,
      decision,
      notes: notes.trim() || undefined,
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    // Auto-advance se nao for o ultimo
    if (index < total - 1) {
      nav(index + 1)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignorar quando digitando no textarea
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleDecision('is_fisbo')
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        handleDecision('not_fisbo')
      } else if (e.key === '?') {
        e.preventDefault()
        handleDecision('unknown')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nav(index - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nav(index + 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, notes, current?.id])

  if (!current) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">
          Batch vazio. Execute scripts/epic7/build-validation-batch.sql
          primeiro.
        </p>
      </div>
    )
  }

  const signals = signalsArray(current.listing?.classification_signals)

  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="workshop-card"
      aria-labelledby={`card-${current.id}-title`}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2
            id={`card-${current.id}-title`}
            className="text-base font-semibold text-gray-900"
          >
            {current.listing?.endereco ?? 'Endereco indisponivel'}
          </h2>
          <p className="text-xs text-gray-600">
            {current.listing?.bairro ?? '—'} ·{' '}
            {current.listing?.portal ?? '—'}
          </p>
        </div>
        <span
          className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-900"
          title={`hypothesis=${current.hypothesis_classification}, confidence=${current.confidence}`}
        >
          {current.hypothesis_classification} ·{' '}
          {(current.confidence * 100).toFixed(0)}%
        </span>
      </header>

      <dl className="grid grid-cols-3 gap-2 text-xs text-gray-700">
        <div>
          <dt className="text-gray-500">Preco</dt>
          <dd className="font-medium">{formatBRL(current.listing?.preco ?? null)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Area</dt>
          <dd className="font-medium">
            {current.listing?.area_m2 ?? '—'} m²
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Quartos</dt>
          <dd className="font-medium">{current.listing?.quartos ?? '—'}</dd>
        </div>
      </dl>

      {signals.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Sinais">
          {signals.map((s) => (
            <li
              key={s}
              className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {current.listing?.url && (
        <a
          href={current.listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs font-medium text-blue-700 underline"
        >
          Abrir anuncio original
        </a>
      )}

      <div className="mt-4">
        <label
          htmlFor={`notes-${current.id}`}
          className="block text-xs font-medium text-gray-700"
        >
          Notas (opcional)
        </label>
        <textarea
          id={`notes-${current.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Ex: telefone com DDD 11, foto de varanda, texto em primeira pessoa..."
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800"
        >
          {error}
        </div>
      )}

      {current.luciana_decision && (
        <p className="mt-3 text-xs text-gray-500" data-testid="prior-decision">
          Decisao anterior: <strong>{current.luciana_decision}</strong>{' '}
          (sobrescreve ao decidir novamente)
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleDecision('is_fisbo')}
          disabled={isPending}
          className="min-h-11 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          aria-keyshortcuts="S"
        >
          {DECISION_LABELS.is_fisbo} <span className="opacity-75">(S)</span>
        </button>
        <button
          type="button"
          onClick={() => handleDecision('not_fisbo')}
          disabled={isPending}
          className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          aria-keyshortcuts="N"
        >
          {DECISION_LABELS.not_fisbo} <span className="opacity-75">(N)</span>
        </button>
        <button
          type="button"
          onClick={() => handleDecision('unknown')}
          disabled={isPending}
          className="min-h-11 rounded-lg bg-gray-500 px-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 disabled:opacity-50"
          aria-keyshortcuts="?"
        >
          {DECISION_LABELS.unknown} <span className="opacity-75">(?)</span>
        </button>
      </div>

      <nav
        className="mt-4 flex items-center justify-between"
        aria-label="Navegacao do batch"
      >
        <button
          type="button"
          onClick={() => nav(index - 1)}
          disabled={index <= 0 || isPending}
          className="min-h-11 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          aria-keyshortcuts="ArrowLeft"
        >
          ← Anterior
        </button>
        <span className="text-xs text-gray-500">use ←  → para navegar</span>
        <button
          type="button"
          onClick={() => nav(index + 1)}
          disabled={index >= total - 1 || isPending}
          className="min-h-11 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          aria-keyshortcuts="ArrowRight"
        >
          Proximo →
        </button>
      </nav>
    </article>
  )
}

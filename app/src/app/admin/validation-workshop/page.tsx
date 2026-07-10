import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { WorkshopCard, type WorkshopBatchItem } from '@/components/WorkshopCard'

/**
 * /admin/validation-workshop — Story 7.9 AC2.
 *
 * Pagina admin-only para a Luciana revisar 200 anuncios estratificados
 * do batch 001 (validation_batch_001). RSC busca dados; WorkshopCard
 * (client) gerencia navegacao + decisoes via Server Action saveDecision.
 *
 * Header mostra "Anuncio N/200 (X decididos)". Index inicial vem do
 * query param ?i= (deeplink + recovery), default = primeiro pendente.
 *
 * Guard: role=admin (mesmo padrao de /admin/lgpd).
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SearchParams {
  i?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

interface BatchRow {
  id: string
  scraped_listing_id: string
  hypothesis_classification: string
  confidence: number
  luciana_decision: 'is_fisbo' | 'not_fisbo' | 'unknown' | null
  luciana_notes: string | null
  decided_at: string | null
  scraped_listings: {
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

export default async function ValidationWorkshopPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin/validation-workshop')
  }

  const role =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ??
    (user.user_metadata as Record<string, unknown> | undefined)?.role

  if (role !== 'admin') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="mt-2 text-gray-600">
          Esta pagina e restrita a administradores.
        </p>
      </main>
    )
  }

  const sp = await searchParams
  const requestedIndex = Number(sp.i ?? '')

  // Fetch batch — ordenado por created_at (mesma ordem do seed).
  const { data, error } = await supabase
    .from('validation_batch_001')
    .select(
      `
      id,
      scraped_listing_id,
      hypothesis_classification,
      confidence,
      luciana_decision,
      luciana_notes,
      decided_at,
      scraped_listings (
        portal,
        endereco,
        bairro,
        preco,
        area_m2,
        quartos,
        tipologia,
        url,
        classification_signals
      )
    `
    )
    .order('created_at', { ascending: true })

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Workshop — erro</h1>
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
      </main>
    )
  }

  const rows = (data ?? []) as unknown as BatchRow[]
  const items: WorkshopBatchItem[] = rows.map((r) => ({
    id: r.id,
    scraped_listing_id: r.scraped_listing_id,
    hypothesis_classification: r.hypothesis_classification,
    confidence: Number(r.confidence),
    luciana_decision: r.luciana_decision,
    luciana_notes: r.luciana_notes,
    decided_at: r.decided_at,
    listing: r.scraped_listings,
  }))

  const total = items.length
  const decided = items.filter((it) => it.luciana_decision != null).length
  const firstPendingIndex = items.findIndex((it) => it.luciana_decision == null)

  const initialIndex = Number.isFinite(requestedIndex) && requestedIndex >= 0
    ? Math.min(Math.max(0, Math.trunc(requestedIndex)), Math.max(0, total - 1))
    : firstPendingIndex >= 0
      ? firstPendingIndex
      : 0

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Workshop de Validacao FISBO
        </h1>
        <p
          className="mt-1 text-sm text-gray-600"
          data-testid="batch-counter"
          aria-live="polite"
        >
          {total === 0
            ? 'Batch vazio — rode scripts/epic7/build-validation-batch.sql para popular.'
            : `Anuncio ${initialIndex + 1}/${total} · ${decided} decididos`}
        </p>
      </header>

      {total > 0 && (
        <WorkshopCard items={items} initialIndex={initialIndex} />
      )}

      <footer className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <p>
          Atalhos: <kbd className="rounded bg-white px-1">S</kbd> sim,{' '}
          <kbd className="rounded bg-white px-1">N</kbd> nao,{' '}
          <kbd className="rounded bg-white px-1">?</kbd> nao sei,{' '}
          <kbd className="rounded bg-white px-1">←</kbd>
          <kbd className="rounded bg-white px-1">→</kbd> navegar.
        </p>
        <p className="mt-1">
          Decisoes salvam incrementalmente — sessao pode pausar/retomar
          via deeplink ?i=N.
        </p>
      </footer>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ReviewQueueCard } from '@/components/ReviewQueueCard'
import { ReviewQueueFilters } from '@/components/ReviewQueueFilters'

/**
 * /leads/review-queue — Story 7.8 AC1.
 *
 * Server Component, session-protected. Lists scraped_listings with
 * classification_confidence < threshold AND review_status IS NULL,
 * paginated 20/page, ordered by created_at DESC.
 *
 * Mobile-first per PRD v2.0 NFR-001 — see README.md.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_THRESHOLD = Number(
  process.env.REVIEW_CONFIDENCE_THRESHOLD ?? '0.70'
)
const PAGE_SIZE = 20

const ALLOWED_PORTALS = ['mercadolivre', 'zap', 'olx', 'vivareal'] as const
type Portal = (typeof ALLOWED_PORTALS)[number]

interface SearchParams {
  page?: string
  threshold?: string
  portal?: string | string[]
  bairro?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function ReviewQueuePage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? '1'))
  const thresholdRaw = Number(sp.threshold ?? DEFAULT_THRESHOLD)
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : DEFAULT_THRESHOLD

  const portalParam = sp.portal
  const portals: Portal[] = Array.isArray(portalParam)
    ? (portalParam.filter((p): p is Portal =>
        ALLOWED_PORTALS.includes(p as Portal)
      ) as Portal[])
    : portalParam && ALLOWED_PORTALS.includes(portalParam as Portal)
      ? [portalParam as Portal]
      : []

  const bairro = sp.bairro?.trim() ?? ''

  // Build query — RLS already filters by consultant scope.
  let query = supabase
    .from('scraped_listings')
    .select(
      'id, portal, external_id, url, endereco, bairro, preco, area_m2, quartos, tipologia, classification, classification_confidence, classification_signals, created_at',
      { count: 'exact' }
    )
    .lt('classification_confidence', threshold)
    .is('review_status', null)
    .order('created_at', { ascending: false })

  if (portals.length > 0) {
    query = query.in('portal', portals)
  }
  if (bairro) {
    query = query.ilike('bairro', `%${bairro}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data: listings, count, error } = await query.range(from, to)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Revisão de anúncios</h1>
        <p
          className="mt-1 text-sm text-gray-600"
          data-testid="queue-counter"
          aria-live="polite"
        >
          {count ?? 0} anúncio{count === 1 ? '' : 's'} pendente
          {count === 1 ? '' : 's'} de revisão
        </p>
      </header>

      <ReviewQueueFilters
        threshold={threshold}
        portals={portals}
        bairro={bairro}
      />

      {error && (
        <div
          className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          Erro ao carregar a fila: {error.message}
        </div>
      )}

      {!error && (count ?? 0) === 0 && (
        <div
          className="mt-12 rounded-lg border border-green-200 bg-green-50 px-6 py-12 text-center"
          data-testid="empty-state"
        >
          <div className="text-4xl" aria-hidden="true">
            ✨
          </div>
          <h2 className="mt-3 text-lg font-semibold text-green-900">
            Nenhum anúncio pendente de revisão agora.
          </h2>
          <p className="mt-2 text-sm text-green-800">
            Pipeline está calibrado! Volte mais tarde para revisar novos
            anúncios.
          </p>
        </div>
      )}

      {!error && (count ?? 0) > 0 && (
        <ul className="mt-4 space-y-3" data-testid="queue-list">
          {(listings ?? []).map((listing) => (
            <li key={listing.id}>
              <ReviewQueueCard listing={listing} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          className="mt-6 flex items-center justify-between"
          aria-label="Paginação"
          data-testid="pagination"
        >
          <PageLink
            page={page - 1}
            disabled={page <= 1}
            sp={sp}
            label="Anterior"
          />
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <PageLink
            page={page + 1}
            disabled={page >= totalPages}
            sp={sp}
            label="Próxima"
          />
        </nav>
      )}
    </main>
  )
}

function PageLink({
  page,
  disabled,
  sp,
  label,
}: {
  page: number
  disabled: boolean
  sp: SearchParams
  label: string
}) {
  if (disabled) {
    return (
      <span
        className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-400"
        aria-disabled="true"
      >
        {label}
      </span>
    )
  }
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (sp.threshold) params.set('threshold', sp.threshold)
  if (sp.bairro) params.set('bairro', sp.bairro)
  if (Array.isArray(sp.portal)) {
    sp.portal.forEach((p) => params.append('portal', p))
  } else if (sp.portal) {
    params.set('portal', sp.portal)
  }
  return (
    <a
      href={`/leads/review-queue?${params.toString()}`}
      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {label}
    </a>
  )
}

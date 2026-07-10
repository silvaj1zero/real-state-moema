'use client'

/**
 * OwnerLookupModal — Story 6.7 (AC2-AC5, AC8, AC9).
 *
 * Dossie "Quem e o dono?": dispara o lookup (Story 6.6) ao abrir, mostra as
 * 3 secoes (proprietario / contatos enriquecidos / proxima acao) e trata a
 * taxonomia de erros (not_found, failed, 429, 402, 503). Rodape LGPD com
 * "Esquecer dados" (AC5).
 *
 * O lookup e modelado como useQuery (nao mutation): dispara ao montar sem
 * setState em effect (regra react-hooks/set-state-in-effect) e o retry do
 * AC4 vira refetch(). O endpoint e cache-first (6.6 AC6), entao re-render
 * nao gera custo.
 */

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserSearch, X, Phone, MessageCircle, Mail, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { postOwnerLookup, ownerLookupKeys, useForgetOwnerLookup } from '@/hooks/useOwnerLookup'
import { useEnrichedContactsByEdificio, bestContact } from '@/hooks/useEnrichedContactsByEdificio'
import {
  mapOwnerLookupError,
  mapOwnerLookupResult,
  NOT_FOUND_MESSAGE,
  GEOSAMPA_URL,
} from '@/lib/owner-lookup-errors'
import { formatPhone, telLink, whatsappLink } from '@/lib/contact-links'
import { CaptarLeadModal } from '@/components/search/CaptarLeadModal'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

interface OwnerLookupModalProps {
  edificioId: string
  edificioNome: string
  endereco: string | null
  consultantId: string
  onClose: () => void
  /** AC8: com quiet=1 na URL, cache hits nao disparam evento de feed. */
  quiet?: boolean
}

export function OwnerLookupModal({
  edificioId,
  edificioNome,
  endereco,
  consultantId,
  onClose,
  quiet = false,
}: OwnerLookupModalProps) {
  const queryClient = useQueryClient()
  const forget = useForgetOwnerLookup()
  const contacts = useEnrichedContactsByEdificio(edificioId)

  // Lookup ao abrir (AC2) — o endpoint resolve cache/custo (6.6).
  const dossie = useQuery({
    queryKey: ownerLookupKeys.dossie(edificioId),
    queryFn: () => postOwnerLookup({ edificio_id: edificioId }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  })
  const result = dossie.data ?? null

  const [ownerExpanded, setOwnerExpanded] = useState(true)
  const [contactsExpanded, setContactsExpanded] = useState(false)
  const [confirmForget, setConfirmForget] = useState(false)
  const [forgotten, setForgotten] = useState(false)
  const [captarListing, setCaptarListing] = useState<ScrapedListingParametric | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  // AC8 — evento de adocao ao abrir o dossie; cache hit "silencioso"
  // (?quiet=1) nao dispara. Best-effort, sem setState (so I/O externo).
  useEffect(() => {
    if (!result || firedRef.current) return
    if (quiet && result.cache_hit) return
    firedRef.current = true
    createClient()
      .from('intelligence_feed')
      .insert({
        consultant_id: consultantId,
        tipo: 'owner_lookup_aberto',
        prioridade: 'baixa',
        titulo: `Dossiê de proprietário aberto: ${edificioNome}`,
        edificio_id: edificioId,
        metadata: { edificio_id: edificioId, cache_hit: result.cache_hit },
        is_read: true,
        is_push_sent: false,
      })
      .then(({ error }) => {
        if (error) console.warn('owner_lookup_aberto feed falhou:', error.message)
      })
  }, [result, quiet, consultantId, edificioId, edificioNome])

  // AC9 — escape fecha + foco inicial no dialog.
  useEffect(() => {
    containerRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleForget = async () => {
    if (!result?.lookup_id) return
    try {
      await forget.mutateAsync(result.lookup_id)
      setForgotten(true)
      setConfirmForget(false)
      queryClient.invalidateQueries({ queryKey: ownerLookupKeys.dossie(edificioId) })
    } catch (err) {
      console.error('forget falhou:', err instanceof Error ? err.message : err)
    }
  }

  const handleCaptar = async () => {
    const contact = bestContact(contacts.data ?? [])
    if (!contact) return
    const { data } = await createClient()
      .from('scraped_listings')
      .select('*')
      .eq('id', contact.listing_id)
      .maybeSingle()
    if (data) {
      setCaptarListing({ ...data, distancia_m: 0 } as ScrapedListingParametric)
    }
  }

  const uiError = dossie.error ? mapOwnerLookupError(dossie.error) : null
  // isFetching tem prioridade: num retry, o erro anterior dá lugar ao spinner.
  const state = dossie.isFetching
    ? 'loading'
    : uiError
      ? uiError.state
      : result
        ? mapOwnerLookupResult(result)
        : 'loading'

  const cacheDays = result?.cache_hit ? result.cache_age_days : null
  const enrichedList = contacts.data ?? []
  const captarContact = bestContact(enrichedList)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal (AC9: dialog + focus + escape) */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Dossiê de proprietário: ${edificioNome}`}
        tabIndex={-1}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto outline-none flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <UserSearch className="size-5 text-[#003DA5] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">Quem é o dono?</h3>
              <p className="text-xs text-gray-500 truncate">{edificioNome}{endereco ? ` — ${endereco}` : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar dossiê"
            className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 pb-4 flex-1">
          {/* Loading (AC2) */}
          {state === 'loading' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="size-8 border-2 border-[#003DA5]/30 border-t-[#003DA5] rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Consultando cartório...</p>
            </div>
          )}

          {/* Erros (AC4) */}
          {state === 'not_found' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p>{NOT_FOUND_MESSAGE}</p>
              <a
                href={GEOSAMPA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-amber-700 underline"
              >
                Verificar no GeoSampa <ExternalLink className="size-3" />
              </a>
            </div>
          )}
          {(state === 'error' || state === 'forbidden' || state === 'budget_exceeded' || state === 'disabled') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <p>{uiError?.message ?? 'Erro ao consultar cartório. Tente novamente.'}</p>
              {state === 'error' && (
                <button
                  onClick={() => void dossie.refetch()}
                  className="mt-2 text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {/* Sucesso (AC3) */}
          {state === 'success' && result && (
            <div className="space-y-3">
              {/* Badge cache (AC2) */}
              {cacheDays !== null && (
                <span className="inline-block text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                  Dados de cache ({cacheDays} {cacheDays === 1 ? 'dia' : 'dias'})
                </span>
              )}

              {/* (a) Proprietario */}
              <section className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setOwnerExpanded((v) => !v)}
                  className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800"
                  aria-expanded={ownerExpanded}
                >
                  Proprietário
                  {ownerExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {ownerExpanded && (
                  <div className="px-3 pb-3 text-sm space-y-1.5">
                    {forgotten ? (
                      <p className="text-gray-400 italic">Dados removidos a pedido do titular.</p>
                    ) : (
                      <>
                        <Row label="Nome" value={result.nome_proprietario} />
                        <Row label="CPF/CNPJ" value={result.cpf_cnpj_masked} />
                        <Row label="Matrícula" value={result.matricula} />
                        <Row label="Cartório" value={result.cartorio} />
                        <Row label="Data da matrícula" value={formatDate(result.data_matricula)} />
                        <Row label="Última transação" value={formatDate(result.ultima_transacao)} />
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* (b) Contatos enriquecidos */}
              <section className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setContactsExpanded((v) => !v)}
                  className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-800"
                  aria-expanded={contactsExpanded}
                >
                  Contatos enriquecidos ({enrichedList.length})
                  {contactsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {contactsExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {contacts.isLoading && <p className="text-xs text-gray-400">Carregando...</p>}
                    {!contacts.isLoading && enrichedList.length === 0 && (
                      <p className="text-xs text-gray-400">Nenhum contato enriquecido para este edifício.</p>
                    )}
                    {enrichedList.map((c) => (
                      <div key={c.listing_id} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                        <p className="font-medium text-gray-800">{c.nome ?? 'Anunciante sem nome'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {c.telefone && (
                            <a href={telLink(c.telefone)} className="inline-flex items-center gap-1 text-xs text-[#003DA5]">
                              <Phone className="size-3" /> {formatPhone(c.telefone)}
                            </a>
                          )}
                          {(c.whatsapp || c.telefone) && (
                            <a
                              href={whatsappLink(c.whatsapp ?? c.telefone!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-600"
                            >
                              <MessageCircle className="size-3" /> WhatsApp
                            </a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="size-3" /> E-mail
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* (c) Proxima acao */}
              <section className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-2">Próxima ação</p>
                <button
                  onClick={() => void handleCaptar()}
                  disabled={!captarContact || forgotten}
                  className="w-full h-11 bg-[#003DA5] text-white rounded-lg font-medium text-sm hover:bg-[#002d7a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Captar lead
                </button>
                {!captarContact && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Sem anúncio vinculado a este edifício — capte manualmente pelo funil.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Rodape LGPD (AC5) */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-5 py-3 text-[11px] text-gray-500">
          Dados obtidos de cartórios públicos via ARISP. Uso restrito à prospecção profissional.{' '}
          {result?.lookup_id && !forgotten && (
            confirmForget ? (
              <span>
                Confirmar remoção?{' '}
                <button onClick={() => void handleForget()} disabled={forget.isPending} className="text-red-600 underline font-medium">
                  {forget.isPending ? 'Removendo...' : 'Sim, esquecer'}
                </button>{' '}
                <button onClick={() => setConfirmForget(false)} className="underline">
                  Cancelar
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmForget(true)} className="underline text-gray-600">
                Esquecer dados
              </button>
            )
          )}
          {forgotten && <span className="text-green-600 font-medium">Dados removidos.</span>}
        </div>
      </div>

      {/* Captar lead pre-preenchido (AC3c) */}
      {captarListing && (
        <CaptarLeadModal
          listing={captarListing}
          consultantId={consultantId}
          prefill={{
            nome: forgotten ? undefined : (result?.nome_proprietario ?? undefined),
            telefone: captarContact?.telefone ?? captarContact?.whatsapp ?? undefined,
            email: captarContact?.email ?? undefined,
          }}
          onClose={() => setCaptarListing(null)}
          onSuccess={() => {
            setCaptarListing(null)
            onClose()
          }}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

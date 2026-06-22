'use client'

import { useState, useCallback } from 'react'
import {
  Phone,
  MessageCircle,
  MapPin,
  UserSearch,
  Loader2,
  StickyNote,
  Check,
} from 'lucide-react'
import {
  useFisboCallList,
  useRegisterContatoStatus,
  type CallListFilters,
} from '@/hooks/useFisboCallList'
import { useRegisterContatoStatusBridge } from '@/components/fisbo/useCallListBridge'
import { useEnrichContact } from '@/hooks/useContactEnrichment'
import { telLink, whatsappLink, formatPhone, maskPhone } from '@/lib/contact-links'
import { ScheduleModal } from '@/components/scheduling/ScheduleModal'
import type { CallListItem } from '@/lib/fisbo/callListOrder'
import type { ContatoStatus } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Status metadata (labels + cores)
// ---------------------------------------------------------------------------

const STATUS_META: Record<ContatoStatus, { label: string; badge: string }> = {
  nao_contatado: { label: 'Não contatado', badge: 'bg-gray-100 text-gray-600' },
  atendeu: { label: 'Atendeu', badge: 'bg-green-100 text-green-700' },
  nao_atendeu: { label: 'Não atendeu', badge: 'bg-amber-100 text-amber-700' },
  retornar: { label: 'Retornar', badge: 'bg-blue-100 text-blue-700' },
  agendado: { label: 'Agendado', badge: 'bg-emerald-100 text-emerald-800' },
  descartado: { label: 'Descartado', badge: 'bg-gray-200 text-gray-500' },
}

/** Ações de 1 toque (AC3). 'agendado' tem ponte com o funil/agenda (AC5). */
const ACTION_STATUSES: ContatoStatus[] = [
  'atendeu',
  'nao_atendeu',
  'retornar',
  'agendado',
  'descartado',
]

const STATUS_FILTER_OPTIONS: ContatoStatus[] = [
  'nao_contatado',
  'atendeu',
  'nao_atendeu',
  'retornar',
  'agendado',
  'descartado',
]

function formatPreco(value: number | null): string | null {
  if (value == null) return null
  return `R$ ${value.toLocaleString('pt-BR')}`
}

// ---------------------------------------------------------------------------
// FisboCallList — tela/seção principal (AC1)
// ---------------------------------------------------------------------------

export function FisboCallList({ consultantId }: { consultantId: string }) {
  const [bairro, setBairro] = useState<string | null>(null)
  const [status, setStatus] = useState<ContatoStatus | null>(null)

  const filters: CallListFilters = { bairro, status }
  const { items, bairros, total, isLoading, error } = useFisboCallList(consultantId, filters)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <h1 className="text-base font-bold text-gray-900">Call list FISBO</h1>
          <span className="text-xs text-gray-400">{items.length} de {total}</span>
        </div>

        {/* Filtros (AC7) */}
        <div className="flex gap-2 px-4 pb-2">
          <select
            aria-label="Filtrar por bairro"
            value={bairro ?? ''}
            onChange={(e) => setBairro(e.target.value || null)}
            className="flex-1 h-9 px-2 rounded-lg border border-gray-300 text-xs bg-white"
          >
            <option value="">Todos os bairros</option>
            {bairros.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por status"
            value={status ?? ''}
            onChange={(e) => setStatus((e.target.value || null) as ContatoStatus | null)}
            className="flex-1 h-9 px-2 rounded-lg border border-gray-300 text-xs bg-white"
          >
            <option value="">Todos os status</option>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : error ? (
        <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Erro ao carregar a call list.'}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 px-6 text-gray-500">
          <UserSearch className="size-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">Nenhum FISBO para ligar com os filtros atuais.</p>
        </div>
      ) : (
        <ul className="px-4 py-3 space-y-3">
          {items.map((item) => (
            <CallListRow key={item.listingId} item={item} consultantId={consultantId} />
          ))}
        </ul>
      )}

      {/* Modal de agendamento (AC5) — controlado por store global */}
      <ScheduleModal />
    </div>
  )
}

// ---------------------------------------------------------------------------
// CallListRow — item individual
// ---------------------------------------------------------------------------

function CallListRow({ item, consultantId }: { item: CallListItem; consultantId: string }) {
  const [notaOpen, setNotaOpen] = useState(false)
  const [nota, setNota] = useState('')
  const [revealed, setRevealed] = useState(false)

  const registerMutation = useRegisterContatoStatus()
  const enrichMutation = useEnrichContact()
  const { onAfterRegister } = useRegisterContatoStatusBridge()

  const preco = formatPreco(item.precoM2 ? null : item.preco)
  const precoM2 = item.precoM2 ? `${formatPreco(item.precoM2)}/m²` : null

  const handleStatus = useCallback(
    async (status: ContatoStatus) => {
      const result = await registerMutation.mutateAsync({
        item,
        status,
        notas: nota || undefined,
        consultantId,
      })
      setNota('')
      setNotaOpen(false)
      // Ponte com funil/agenda (AC5)
      await onAfterRegister(status, result, consultantId)
    },
    [registerMutation, item, nota, consultantId, onAfterRegister],
  )

  const meta = STATUS_META[item.contatoStatus]
  const busy = registerMutation.isPending

  return (
    <li className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      {/* Cabeçalho: nome + status */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-900">
          {item.nome || 'Proprietário (sem nome)'}
        </p>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', meta.badge)}>
          {meta.label}
        </span>
      </div>

      {/* Endereço/bairro + preço */}
      {(item.endereco || item.bairro) && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
          <MapPin className="size-3 shrink-0" />
          {[item.endereco, item.bairro].filter(Boolean).join(' · ')}
        </p>
      )}
      {(precoM2 || preco) && (
        <p className="text-xs font-medium text-gray-700 mb-2">{precoM2 ?? preco}</p>
      )}

      {/* Contato (tel/wa) ou degradação (AC6) */}
      {item.semContato ? (
        <div className="flex items-center justify-between gap-2 mb-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-xs text-gray-400">Sem contato</span>
          <button
            onClick={() => enrichMutation.mutate(item.listingId)}
            disabled={enrichMutation.isPending}
            className="text-xs font-medium text-[#003DA5] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
          >
            {enrichMutation.isPending ? (
              <><Loader2 className="size-3 animate-spin" /> Enriquecendo…</>
            ) : (
              <><UserSearch className="size-3" /> Enriquecer</>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {item.telefone && (
            revealed ? (
              <a
                href={telLink(item.telefone)}
                className="min-h-[40px] px-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <Phone className="size-3.5" /> {formatPhone(item.telefone)}
              </a>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="min-h-[40px] px-3 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <Phone className="size-3.5" /> {maskPhone(item.telefone)}
                <span className="text-[10px] text-[#003DA5] font-semibold ml-0.5">Revelar</span>
              </button>
            )
          )}
          {item.whatsapp && (
            <a
              href={whatsappLink(item.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3 rounded-lg bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          )}
        </div>
      )}

      {/* Botões de status (AC3 — 1 toque) */}
      <div className="flex flex-wrap gap-1.5">
        {ACTION_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatus(s)}
            disabled={busy}
            className={cn(
              'text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50',
              item.contatoStatus === s
                ? 'border-[#003DA5] bg-[#003DA5]/10 text-[#003DA5]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {item.contatoStatus === s && <Check className="size-3 inline mr-0.5" />}
            {STATUS_META[s].label}
          </button>
        ))}
        <button
          onClick={() => setNotaOpen((v) => !v)}
          className="text-[11px] font-medium px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 inline-flex items-center gap-1"
        >
          <StickyNote className="size-3" /> Nota
        </button>
      </div>

      {/* Nota opcional (AC3) */}
      {notaOpen && (
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota da tentativa (opcional) — aplicada ao registrar o status."
          rows={2}
          className="mt-2 w-full px-2 py-1.5 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30"
        />
      )}
      {!notaOpen && item.contatoNotas && (
        <p className="mt-2 text-[11px] text-gray-500 italic">“{item.contatoNotas}”</p>
      )}
    </li>
  )
}

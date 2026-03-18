'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useSafariEvents, useSafariRsvps, useCreateSafari, useAddRsvp, useUpdateRsvpStatus, useUpdateSafariStatus } from '@/hooks/useSafari'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import { usePartners } from '@/hooks/useReferrals'
import type { SafariEvent, StatusSafari, StatusRsvp } from '@/lib/supabase/types'
import { ArrowLeft, Plus, Calendar, Users, MapPin, Trophy, X, Copy, UserPlus } from 'lucide-react'

const STATUS_SAFARI: Record<StatusSafari, { label: string; color: string }> = {
  planejado: { label: 'Planejado', color: '#003DA5' },
  confirmado: { label: 'Confirmado', color: '#22C55E' },
  realizado: { label: 'Realizado', color: '#6366F1' },
  cancelado: { label: 'Cancelado', color: '#DC3545' },
}

const STATUS_RSVP: Record<StatusRsvp, { label: string; color: string }> = {
  convidado: { label: 'Convidado', color: '#9E9E9E' },
  confirmado: { label: 'Confirmado', color: '#28A745' },
  recusado: { label: 'Recusado', color: '#DC3545' },
  pendente: { label: 'Pendente', color: '#FFC107' },
}

function SafariCard({ event, onSelect }: { event: SafariEvent; onSelect: (id: string) => void }) {
  const config = STATUS_SAFARI[event.status]
  return (
    <button onClick={() => onSelect(event.id)} className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-left">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-900 truncate">{event.titulo}</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}15`, color: config.color }}>{config.label}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-0.5"><Calendar size={10} /> {new Date(event.data_hora).toLocaleDateString('pt-BR')}</span>
        {event.endereco && <span className="flex items-center gap-0.5 truncate max-w-[120px]"><MapPin size={10} /> {event.endereco}</span>}
        <span className="flex items-center gap-0.5"><Users size={10} /> {event.vagas} vagas</span>
        {event.propostas_recebidas > 0 && <span className="flex items-center gap-0.5 text-[#FFD700]"><Trophy size={10} /> {event.propostas_recebidas}</span>}
      </div>
    </button>
  )
}

function SafariDetail({ eventId, consultantId, onBack }: { eventId: string; consultantId: string; onBack: () => void }) {
  const { events } = useSafariEvents(consultantId)
  const event = events.find((e) => e.id === eventId)
  const { rsvps } = useSafariRsvps(eventId)
  const addRsvp = useAddRsvp()
  const updateRsvpStatus = useUpdateRsvpStatus()
  const updateSafari = useUpdateSafariStatus()
  const { partners } = usePartners(consultantId)

  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestFranquia, setGuestFranquia] = useState('')
  const [guestTel, setGuestTel] = useState('')
  const [showPostEvent, setShowPostEvent] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [propostas, setPropostas] = useState('0')

  if (!event) return null

  const confirmed = rsvps.filter((r) => r.status === 'confirmado').length
  const vagasRestantes = event.vagas - confirmed

  const handleAddGuest = async () => {
    if (!guestName.trim()) return
    await addRsvp.mutateAsync({ safari_event_id: eventId, nome_convidado: guestName.trim(), franquia: guestFranquia.trim() || undefined, telefone: guestTel.trim() || undefined })
    setGuestName('')
    setGuestFranquia('')
    setGuestTel('')
    setShowAddGuest(false)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/safari/${eventId}`
    navigator.clipboard.writeText(url)
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Link copiado!', type: 'success' } }))
  }

  const handlePostEvent = async () => {
    await updateSafari.mutateAsync({ id: eventId, consultant_id: consultantId, status: 'realizado', feedback: feedback.trim(), propostas_recebidas: parseInt(propostas) || 0 })
    setShowPostEvent(false)
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Safari finalizado!', type: 'success' } }))
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#003DA5] mb-3"><ArrowLeft size={16} /> Voltar</button>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
        <h2 className="text-base font-bold text-gray-900 mb-1">{event.titulo}</h2>
        {event.descricao && <p className="text-xs text-gray-500 mb-2">{event.descricao}</p>}
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-0.5"><Calendar size={12} /> {new Date(event.data_hora).toLocaleString('pt-BR')}</span>
          {event.endereco && <span className="flex items-center gap-0.5"><MapPin size={12} /> {event.endereco}</span>}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleCopyLink} className="flex items-center gap-1 text-xs font-medium text-[#003DA5] px-3 py-1.5 rounded-lg bg-blue-50"><Copy size={12} /> Copiar Link</button>
          {event.status !== 'realizado' && event.status !== 'cancelado' && (
            <button onClick={() => setShowPostEvent(true)} className="flex items-center gap-1 text-xs font-medium text-[#6366F1] px-3 py-1.5 rounded-lg bg-purple-50">Finalizar</button>
          )}
        </div>
      </div>

      {/* RSVP list */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700">{confirmed} confirmados de {rsvps.length} | {vagasRestantes} vagas</p>
          <button onClick={() => setShowAddGuest(true)} className="flex items-center gap-1 text-xs font-medium text-[#003DA5]"><UserPlus size={14} /> Convidar</button>
        </div>
        <div className="space-y-1.5">
          {rsvps.map((r) => {
            const cfg = STATUS_RSVP[r.status]
            return (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 p-2.5">
                <div>
                  <p className="text-xs font-medium text-gray-800">{r.nome_convidado}</p>
                  {r.franquia && <p className="text-[10px] text-gray-400">{r.franquia}</p>}
                </div>
                <select value={r.status} onChange={(e) => updateRsvpStatus.mutate({ id: r.id, eventId, status: e.target.value as StatusRsvp })} className="text-[10px] rounded-lg border border-gray-200 px-1.5 py-0.5 outline-none" style={{ color: cfg.color }}>
                  {(Object.entries(STATUS_RSVP) as [StatusRsvp, { label: string }][]).map(([s, { label }]) => (<option key={s} value={s}>{label}</option>))}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Partner suggestions for invites */}
      {showAddGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Convidar</h3>
              <button onClick={() => setShowAddGuest(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} /></button>
            </div>
            {partners.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-400 mb-1">Parceiros cadastrados:</p>
                <div className="flex flex-wrap gap-1">
                  {partners.slice(0, 5).map((p) => (
                    <button key={p.parceiro_nome} onClick={() => { setGuestName(p.parceiro_nome); setGuestFranquia(p.parceiro_franquia ?? '') }} className="px-2 py-1 rounded-full bg-blue-50 text-[10px] text-[#003DA5] font-medium">{p.parceiro_nome}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nome *" className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs outline-none focus:border-[#003DA5]" autoFocus />
              <input type="text" value={guestFranquia} onChange={(e) => setGuestFranquia(e.target.value)} placeholder="Franquia" className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs outline-none focus:border-[#003DA5]" />
              <input type="tel" value={guestTel} onChange={(e) => setGuestTel(e.target.value)} placeholder="Telefone" className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs outline-none focus:border-[#003DA5]" />
            </div>
            <button onClick={handleAddGuest} disabled={!guestName.trim()} className="w-full h-10 mt-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#22C55E' }}>Adicionar</button>
          </div>
        </div>
      )}

      {/* Post-event modal */}
      {showPostEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Finalizar Safari</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Feedback *</label>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Como foi o evento?" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs outline-none resize-none focus:border-[#003DA5]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Propostas recebidas</label>
                <input type="number" value={propostas} onChange={(e) => setPropostas(e.target.value)} min="0" className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs outline-none focus:border-[#003DA5]" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowPostEvent(false)} className="flex-1 h-10 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100">Cancelar</button>
              <button onClick={handlePostEvent} disabled={!feedback.trim()} className="flex-1 h-10 rounded-xl text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#6366F1' }}>Finalizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SafariPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { events, isLoading } = useSafariEvents(user?.id ?? null)
  const { leads } = useLeadsByFunnel(user?.id ?? null)
  const createSafari = useCreateSafari()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [endereco, setEndereco] = useState('')
  const [vagas, setVagas] = useState('10')
  const [selectedLeadId, setSelectedLeadId] = useState('')

  const exclusiveLeads = leads.filter((l) => l.etapa_funil === 'representacao' || l.etapa_funil === 'venda')

  const handleCreate = async () => {
    if (!titulo.trim() || !dataHora || !selectedLeadId || !user) return
    const lead = exclusiveLeads.find((l) => l.id === selectedLeadId)
    await createSafari.mutateAsync({
      consultant_id: user.id,
      lead_id: selectedLeadId,
      edificio_id: lead?.edificio_id || undefined,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      data_hora: new Date(dataHora).toISOString(),
      endereco: endereco.trim() || undefined,
      vagas: parseInt(vagas) || 10,
    })
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Safari criado!', type: 'success' } }))
    setShowCreate(false)
    setTitulo('')
    setDescricao('')
    setDataHora('')
    setEndereco('')
    setVagas('10')
    setSelectedLeadId('')
  }

  if (selectedId && user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
          <div className="flex items-center justify-center h-12 px-4"><h1 className="text-base font-bold text-gray-900">Safari</h1></div>
        </header>
        <div className="px-4 py-3">
          <SafariDetail eventId={selectedId} consultantId={user.id} onBack={() => setSelectedId(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><ArrowLeft size={20} className="text-gray-700" /></button>
          <h1 className="text-base font-bold text-gray-900">Safaris</h1>
          <button onClick={() => setShowCreate(true)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#003DA5' }}><Plus size={16} className="text-white" /></button>
        </div>
      </header>

      <div className="px-4 py-3 space-y-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhum safari criado ainda</div>
        ) : (
          events.map((e) => <SafariCard key={e.id} event={e} onSelect={setSelectedId} />)
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowCreate(true)} className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-10" style={{ backgroundColor: '#FF8C00' }}><Plus size={22} className="text-white" /></button>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
            <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Novo Safari</h2>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} className="text-gray-500" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Lead (exclusividade) *</label>
                  <select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]">
                    <option value="">Selecione um lead</option>
                    {exclusiveLeads.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título *" className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]" autoFocus />
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none resize-none focus:border-[#003DA5]" />
                <input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]" />
                <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço" className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]" />
                <input type="number" value={vagas} onChange={(e) => setVagas(e.target.value)} min="1" placeholder="Vagas" className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]" />
              </div>
              <button onClick={handleCreate} disabled={!titulo.trim() || !dataHora || !selectedLeadId} className="w-full h-14 mt-4 rounded-xl text-base font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#22C55E' }}>Criar Safari</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

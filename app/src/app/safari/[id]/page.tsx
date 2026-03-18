'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SafariEvent } from '@/lib/supabase/types'
import { Calendar, MapPin, Users, Check } from 'lucide-react'

export default function SafariPublicPage() {
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<SafariEvent | null>(null)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: ev } = await supabase
        .from('safari_events')
        .select('id, titulo, descricao, data_hora, endereco, vagas, status')
        .eq('id', eventId)
        .single()

      if (ev) {
        setEvent(ev as SafariEvent)
        const { count } = await supabase
          .from('safari_event_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('safari_event_id', eventId)
          .eq('status', 'confirmado')
        setConfirmedCount(count ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [eventId])

  const vagasRestantes = event ? event.vagas - confirmedCount : 0
  const lotado = vagasRestantes <= 0

  const handleConfirm = async () => {
    if (!nome.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('safari_event_rsvps').insert({
      safari_event_id: eventId,
      nome_convidado: nome.trim(),
      telefone: telefone.trim() || null,
      status: lotado ? 'pendente' : 'confirmado',
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Evento não encontrado</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check size={32} className="text-[#22C55E]" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {lotado ? 'Entrou na fila de espera!' : 'Presença confirmada!'}
        </h2>
        <p className="text-sm text-gray-500 text-center">
          {lotado
            ? 'Você será notificado se uma vaga abrir.'
            : `Nos vemos em ${new Date(event.data_hora).toLocaleDateString('pt-BR')}`}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003DA5] px-4 pt-8 pb-6 text-white">
        <p className="text-xs font-medium opacity-70 mb-1">Safari / Open House</p>
        <h1 className="text-xl font-bold">{event.titulo}</h1>
        {event.descricao && <p className="text-sm opacity-80 mt-1">{event.descricao}</p>}
      </div>

      <div className="px-4 py-4">
        {/* Event details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar size={16} className="text-[#003DA5]" />
            <span>{new Date(event.data_hora).toLocaleString('pt-BR')}</span>
          </div>
          {event.endereco && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin size={16} className="text-[#003DA5]" />
              <span>{event.endereco}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Users size={16} className="text-[#003DA5]" />
            <span>{lotado ? 'Evento lotado' : `${vagasRestantes} vagas restantes`}</span>
          </div>
        </div>

        {/* RSVP form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">
            {lotado ? 'Entrar na fila de espera' : 'Confirmar Presença'}
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome *"
              className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]"
              autoFocus
            />
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Telefone"
              className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]"
            />
          </div>
          <button
            onClick={handleConfirm}
            disabled={!nome.trim() || submitting}
            className="w-full h-14 mt-4 rounded-xl text-base font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: lotado ? '#F59E0B' : '#22C55E' }}
          >
            {submitting ? 'Enviando...' : lotado ? 'Entrar na Fila' : 'Confirmar Presença'}
          </button>
        </div>
      </div>
    </div>
  )
}

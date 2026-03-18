'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/store/map'
import { useReverseGeocode } from '@/hooks/useReverseGeocode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TipologiaEdificio, PadraoEdificio } from '@/lib/supabase/types'

interface QuickRegisterFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (edificioId: string, lat: number, lng: number) => void
}

const TIPOLOGIAS: { value: TipologiaEdificio; label: string }[] = [
  { value: 'residencial_vertical', label: 'Residencial' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'misto', label: 'Misto' },
]

const PADROES: { value: PadraoEdificio; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'medio', label: 'Médio' },
  { value: 'alto', label: 'Alto' },
  { value: 'luxo', label: 'Luxo' },
]

export function QuickRegisterForm({ isOpen, onClose, onSuccess }: QuickRegisterFormProps) {
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState<string | null>(null)
  const [cep, setCep] = useState<string | null>(null)
  const [tipologia, setTipologia] = useState<TipologiaEdificio | null>(null)
  const [padrao, setPadrao] = useState<PadraoEdificio | null>(null)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const { reverseGeocode, isLoading: isGeocoding } = useReverseGeocode()

  // Get GPS on open
  useEffect(() => {
    if (!isOpen) return
    nameInputRef.current?.focus()

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setGpsCoords({ lat: latitude, lng: longitude })
        setGpsAccuracy(accuracy)

        const result = await reverseGeocode(latitude, longitude)
        if (result) {
          setEndereco(result.endereco)
          setBairro(result.bairro)
          setCep(result.cep)
        }
      },
      () => setGpsCoords(null),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [isOpen, reverseGeocode])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setNome('')
      setEndereco('')
      setBairro(null)
      setCep(null)
      setTipologia(null)
      setPadrao(null)
      setGpsCoords(null)
      setGpsAccuracy(null)
      setShowDiscard(false)
    }
  }, [isOpen])

  const handleClose = () => {
    if (nome.trim()) {
      setShowDiscard(true)
    } else {
      onClose()
    }
  }

  const handleSave = async () => {
    if (!nome.trim() || !gpsCoords) return
    setIsSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const edificioId = crypto.randomUUID()

      // INSERT edificios (base)
      const { error: edError } = await supabase.from('edificios').insert({
        id: edificioId,
        nome: nome.trim(),
        endereco: endereco || `${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)}`,
        coordinates: `SRID=4326;POINT(${gpsCoords.lng} ${gpsCoords.lat})`,
        bairro,
        cep,
        cidade: 'Sao Paulo',
        estado: 'SP',
        origem: 'manual',
        verificado: true,
        created_by: user.id,
      })

      if (edError) throw edError

      // INSERT edificios_qualificacoes (privada)
      const { error: qualError } = await supabase.from('edificios_qualificacoes').insert({
        edificio_id: edificioId,
        consultant_id: user.id,
        tipologia,
        padrao,
        status_varredura: 'mapeado',
      })

      if (qualError) throw qualError

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50)

      onSuccess(edificioId, gpsCoords.lat, gpsCoords.lng)
      onClose()
    } catch (err) {
      console.error('Erro ao cadastrar edifício:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const gpsColor = gpsAccuracy === null ? 'bg-red-500' : gpsAccuracy < 20 ? 'bg-green-500' : gpsAccuracy < 100 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={handleClose} />

      {/* Form panel */}
      <div className="relative bg-white rounded-t-2xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300">
        {/* Handle + Close */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gpsColor}`} />
            <span className="text-xs text-gray-500">
              {gpsAccuracy ? `GPS ±${Math.round(gpsAccuracy)}m` : 'Sem GPS'}
            </span>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nome (obrigatório, auto-focus) */}
        <Input
          ref={nameInputRef}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ed. Nome do Edifício"
          className="h-12 text-base mb-3"
          autoFocus
        />

        {/* Endereço (pré-preenchido pelo GPS) */}
        <Input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder={isGeocoding ? 'Buscando endereço...' : 'Digite o endereço'}
          className="h-12 text-base mb-4"
          disabled={isGeocoding}
        />

        {/* Tipologia (chips) */}
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 mb-1.5 block">Tipologia (opcional)</span>
          <div className="flex gap-2">
            {TIPOLOGIAS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTipologia(tipologia === value ? null : value)}
                className={`h-10 px-4 rounded-full text-sm font-medium border transition-colors ${
                  tipologia === value
                    ? 'bg-[#003DA5] text-white border-[#003DA5]'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Padrão (chips) */}
        <div className="mb-5">
          <span className="text-xs font-medium text-gray-500 mb-1.5 block">Padrão (opcional)</span>
          <div className="flex gap-2">
            {PADROES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPadrao(padrao === value ? null : value)}
                className={`h-10 px-4 rounded-full text-sm font-medium border transition-colors ${
                  padrao === value
                    ? 'bg-[#003DA5] text-white border-[#003DA5]'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={!nome.trim() || !gpsCoords || isSaving}
          className="w-full h-14 text-base font-semibold bg-[#22C55E] hover:bg-[#16A34A] text-white"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvando...
            </span>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>

      {/* Discard confirmation */}
      {showDiscard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 mx-4 max-w-xs w-full">
            <p className="text-sm font-semibold text-gray-800 mb-4">Descartar cadastro?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscard(false)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#DC1431] rounded-lg"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

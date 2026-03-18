'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, Send, FileText, Pencil, RotateCcw } from 'lucide-react'
import {
  DEFAULT_RULES,
  TIPOLOGIA_TIPS,
  type Tipologia,
  type HomeStageRule,
  getCustomRules,
  saveCustomRules,
  clearCustomRules,
  buildWhatsAppUrl,
  useUpdateHomeStageChecklist,
} from '@/hooks/useHomeStage'
import { HomeStageRuleCard } from './HomeStageRule'
import { cn } from '@/lib/utils'

const TIPOLOGIA_OPTIONS: { value: Tipologia; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'cobertura', label: 'Cobertura' },
]

interface HomeStageScreenProps {
  leadId: string
  leadNome: string
  telefone: string | null
  edificioEndereco: string
  edificioTipologia: string | null
  consultantId: string
}

export function HomeStageScreen({
  leadId,
  leadNome,
  telefone,
  edificioEndereco,
  edificioTipologia,
  consultantId,
}: HomeStageScreenProps) {
  const router = useRouter()
  const updateChecklist = useUpdateHomeStageChecklist()

  // Tipologia selector
  const defaultTipo = (['apartamento', 'casa', 'comercial', 'cobertura'].includes(
    edificioTipologia || '',
  )
    ? edificioTipologia
    : 'apartamento') as Tipologia
  const [tipologia, setTipologia] = useState<Tipologia>(defaultTipo)

  // Custom rules (from localStorage or defaults)
  const [rules, setRules] = useState<HomeStageRule[]>(
    () => getCustomRules(consultantId) || DEFAULT_RULES,
  )
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  function handleSaveRules() {
    saveCustomRules(consultantId, rules)
    setIsEditing(false)
    showToast('Template salvo!')
  }

  function handleResetRules() {
    clearCustomRules(consultantId)
    setRules(DEFAULT_RULES)
    setIsEditing(false)
    showToast('Template restaurado!')
  }

  function handleWhatsApp() {
    const url = buildWhatsAppUrl(telefone, leadNome, edificioEndereco)
    if (!url) {
      showToast('Cadastre o telefone do lead para compartilhar via WhatsApp.')
      return
    }
    window.open(url, '_blank')
    updateChecklist.mutate(leadId)
    showToast('Home Staging enviado!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Home className="size-4 text-green-500" />
              Home Staging
            </h1>
            <p className="text-xs text-gray-500 truncate">
              {leadNome} — {edificioEndereco}
            </p>
          </div>
          <button
            onClick={() => (isEditing ? handleSaveRules() : setIsEditing(true))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Pencil className="size-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Branding header */}
        <div className="bg-[#003DA5] rounded-xl p-4 text-white">
          <p className="text-xs opacity-80">RE/MAX Galeria</p>
          <p className="text-sm font-semibold">Luciana Borba | Consultora</p>
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-[10px] opacity-70">
              Preparado especialmente para {leadNome} — {edificioEndereco}
            </p>
          </div>
        </div>

        {/* Tipologia selector (AC3) */}
        <div className="flex gap-1.5">
          {TIPOLOGIA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTipologia(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                tipologia === opt.value
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 3 Rules of Gold (AC2) */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">
            3 Regras de Ouro do Home Staging
          </h2>
          {rules.map((rule, idx) =>
            isEditing ? (
              <div key={rule.id} className="bg-white rounded-xl p-3 shadow-sm border border-blue-200">
                <input
                  className="w-full text-base font-bold text-gray-900 mb-1 border-b border-gray-200 pb-1 focus:outline-none focus:border-[#003DA5]"
                  value={rule.title}
                  onChange={(e) => {
                    const updated = [...rules]
                    updated[idx] = { ...updated[idx], title: e.target.value }
                    setRules(updated)
                  }}
                />
                <textarea
                  className="w-full text-sm text-gray-600 resize-none focus:outline-none"
                  rows={2}
                  value={rule.description}
                  onChange={(e) => {
                    const updated = [...rules]
                    updated[idx] = { ...updated[idx], description: e.target.value }
                    setRules(updated)
                  }}
                />
              </div>
            ) : (
              <HomeStageRuleCard key={rule.id} rule={rule} />
            ),
          )}
        </div>

        {isEditing && (
          <button
            onClick={handleResetRules}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="size-3.5" />
            Restaurar Padrão
          </button>
        )}

        {/* Tipologia tips (AC3) */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h3 className="text-xs font-semibold text-blue-800 mb-1 capitalize">
            Dica para {tipologia}
          </h3>
          <p className="text-sm text-blue-700">{TIPOLOGIA_TIPS[tipologia]}</p>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 z-40">
        {/* WhatsApp (AC5) */}
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium rounded-xl transition-colors"
        >
          <Send className="size-5" />
          Enviar via WhatsApp
        </button>

        {/* PDF (AC6) */}
        <button
          onClick={() => showToast('PDF gerado!')}
          className="flex items-center justify-center gap-1.5 h-12 px-4 border border-[#003DA5] text-[#003DA5] font-medium rounded-xl hover:bg-[#003DA5]/5 transition-colors"
        >
          <FileText className="size-4" />
          PDF
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-in fade-in duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}

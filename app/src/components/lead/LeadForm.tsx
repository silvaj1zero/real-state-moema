'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/lead/ChipSelect'
import { PhotoUploader } from '@/components/lead/PhotoUploader'
import { useCreateLead } from '@/hooks/useLeads'
import { useInformantesByEdificio } from '@/hooks/useInformantes'
import { useLeadsStore } from '@/store/leads'
import { useAuthStore } from '@/store/auth'
import type { OrigemLead, FonteFrog, PrazoUrgencia } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Chip option definitions
// ---------------------------------------------------------------------------

const ORIGEM_OPTIONS = [
  { value: 'digital', label: 'Digital' },
  { value: 'placa', label: 'Placa' },
  { value: 'zelador', label: 'Zelador' },
  { value: 'indicacao', label: 'Indicação' },
]

const PERFIL_OPTIONS = [
  { value: 'investidor', label: 'Investidor' },
  { value: 'herdeiro', label: 'Herdeiro' },
  { value: 'mudanca_cidade', label: 'Mudança de cidade' },
  { value: 'upgrade_downgrade', label: 'Upgrade/Downgrade' },
]

const VALORIZA_OPTIONS = [
  { value: 'preco', label: 'Preço' },
  { value: 'rapidez', label: 'Rapidez' },
  { value: 'discricao', label: 'Discrição' },
  { value: 'seguranca', label: 'Segurança' },
]

const PRAZO_OPTIONS = [
  { value: 'imediato', label: 'Imediato' },
  { value: 'tres_meses', label: '3 meses' },
  { value: 'seis_meses', label: '6 meses' },
  { value: 'sem_pressa', label: 'Sem pressa' },
]

const FROG_OPTIONS = [
  { value: 'familia', label: 'Família' },
  { value: 'relacionamentos', label: 'Relacionamentos' },
  { value: 'organizacoes', label: 'Organizações' },
  { value: 'geografia', label: 'Geografia' },
]

// ---------------------------------------------------------------------------
// Phone mask utility
// ---------------------------------------------------------------------------

function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function unformatPhone(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

// ---------------------------------------------------------------------------
// LeadForm
// ---------------------------------------------------------------------------

interface LeadFormProps {
  edificioId: string
  edificioNome?: string
  onClose: () => void
  onSuccess?: (leadId: string) => void
}

export function LeadForm({ edificioId, edificioNome, onClose, onSuccess }: LeadFormProps) {
  const user = useAuthStore((s) => s.user)
  const closeLeadForm = useLeadsStore((s) => s.closeLeadForm)
  const createLead = useCreateLead()

  // Required fields
  const [nome, setNome] = useState('')
  const [unidade, setUnidade] = useState('')
  const [origem, setOrigem] = useState<OrigemLead | null>(null)

  // Contact fields
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

  // Profile section (collapsible)
  const [showProfile, setShowProfile] = useState(false)
  const [perfilPsicografico, setPerfilPsicografico] = useState<string | null>(null)
  const [valoriza, setValoriza] = useState<string | null>(null)
  const [fonteFrog, setFonteFrog] = useState<FonteFrog | null>(null)

  // V1 Data section (collapsible)
  const [showV1, setShowV1] = useState(false)
  const [motivacaoVenda, setMotivacaoVenda] = useState('')
  const [prazoUrgencia, setPrazoUrgencia] = useState<PrazoUrgencia | null>(null)
  const [fotosV1, setFotosV1] = useState<string[]>([])

  // Informante selection (AC7 — when origem = Zelador or Indicacao)
  const [informanteId, setInformanteId] = useState<string | null>(null)
  const { informantes: availableInformantes } = useInformantesByEdificio(edificioId)
  const showInformanteSelector = origem === 'zelador' || origem === 'indicacao'

  // Notes
  const [notas, setNotas] = useState('')

  const [isSaving, setIsSaving] = useState(false)

  const canSave = nome.trim().length > 0

  const handleSave = async () => {
    if (!canSave || !user) return

    setIsSaving(true)
    try {
      const result = await createLead.mutateAsync({
        consultant_id: user.id,
        edificio_id: edificioId,
        nome: nome.trim(),
        unidade: unidade.trim() || undefined,
        telefone: unformatPhone(telefone) || undefined,
        email: email.trim() || undefined,
        origem: origem || 'digital',
        fonte_frog: fonteFrog || undefined,
        informante_id: showInformanteSelector ? informanteId || undefined : undefined,
        motivacao_venda: motivacaoVenda.trim() || undefined,
        prazo_urgencia: prazoUrgencia || undefined,
        fotos_v1: fotosV1.length > 0 ? fotosV1 : undefined,
        perfil_psicografico: perfilPsicografico as
          | 'investidor'
          | 'herdeiro'
          | 'mudanca_cidade'
          | 'upgrade_downgrade'
          | undefined,
        valoriza: valoriza as
          | 'preco'
          | 'rapidez'
          | 'discricao'
          | 'seguranca'
          | undefined,
      })

      // Show toast (simple implementation — replace with proper toast lib later)
      if (typeof window !== 'undefined') {
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
        // Dispatch custom event for toast (consumed by layout)
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: `Lead ${nome.trim()} cadastrado!`, type: 'success' },
          }),
        )
      }

      closeLeadForm()
      onSuccess?.(result.id)
      onClose()
    } catch (err) {
      console.error('Error creating lead:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Erro ao cadastrar lead', type: 'error' },
          }),
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    closeLeadForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Novo Lead</h2>
              {edificioNome && (
                <p className="text-sm text-gray-500">{edificioNome}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ============================================================= */}
          {/* Required Fields */}
          {/* ============================================================= */}
          <div className="space-y-4 mb-6">
            {/* Nome */}
            <div>
              <Label htmlFor="lead-nome">Nome do proprietário *</Label>
              <Input
                id="lead-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="mt-1 h-12"
                autoFocus
              />
            </div>

            {/* Unidade */}
            <div>
              <Label htmlFor="lead-unidade">Unidade (apt/sala)</Label>
              <Input
                id="lead-unidade"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="Ex: Apt 42, Sala 301"
                className="mt-1 h-12"
              />
            </div>

            {/* Telefone */}
            <div>
              <Label htmlFor="lead-telefone">Telefone</Label>
              <Input
                id="lead-telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                placeholder="(11) XXXXX-XXXX"
                type="tel"
                inputMode="numeric"
                className="mt-1 h-12"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                className="mt-1 h-12"
              />
            </div>

            {/* Origem */}
            <div>
              <Label>Origem do lead</Label>
              <ChipSelect
                options={ORIGEM_OPTIONS}
                value={origem}
                onChange={(v) => setOrigem(v as OrigemLead | null)}
                className="mt-2"
              />
            </div>

            {/* AC7: Informante selector when origem = Zelador or Indicacao */}
            {showInformanteSelector && (
              <div>
                <Label>Informante (origem da indicação)</Label>
                {availableInformantes.length > 0 ? (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                    {availableInformantes.map((inf) => {
                      const isSelected = informanteId === inf.id
                      return (
                        <button
                          key={inf.id}
                          type="button"
                          onClick={() =>
                            setInformanteId(isSelected ? null : inf.id)
                          }
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                isSelected
                                  ? 'bg-[#003DA5] border-[#003DA5] text-white'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && '\u2713'}
                            </span>
                            <span>{inf.nome}</span>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {inf.funcao}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">
                    Nenhum informante neste edifício.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        // Open informante form — dispatch event consumed by building card
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('open-informante-form', {
                              detail: { edificioId },
                            }),
                          )
                        }
                      }}
                      className="text-[#003DA5] font-medium hover:underline"
                    >
                      Cadastrar informante
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Fonte FROG (optional) */}
            <div>
              <Label>Fonte FROG</Label>
              <ChipSelect
                options={FROG_OPTIONS}
                value={fonteFrog}
                onChange={(v) => setFonteFrog(v as FonteFrog | null)}
                className="mt-2"
              />
            </div>
          </div>

          {/* ============================================================= */}
          {/* Profile Section (collapsible) */}
          {/* ============================================================= */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 text-sm font-medium text-[#003DA5] mb-3"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                className={`transition-transform ${showProfile ? 'rotate-90' : ''}`}
              >
                <path d="M4 2L8 6L4 10z" />
              </svg>
              Mais detalhes (Perfil)
            </button>

            {showProfile && (
              <div className="space-y-4 pl-2 border-l-2 border-gray-100">
                {/* Perfil psicografico */}
                <div>
                  <Label>Perfil psicográfico</Label>
                  <ChipSelect
                    options={PERFIL_OPTIONS}
                    value={perfilPsicografico}
                    onChange={(v) => setPerfilPsicografico(v as string | null)}
                    className="mt-2"
                  />
                </div>

                {/* Valoriza */}
                <div>
                  <Label>O que valoriza</Label>
                  <ChipSelect
                    options={VALORIZA_OPTIONS}
                    value={valoriza}
                    onChange={(v) => setValoriza(v as string | null)}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* V1 Data Section (collapsible) */}
          {/* ============================================================= */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowV1(!showV1)}
              className="flex items-center gap-2 text-sm font-medium text-[#003DA5] mb-3"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                className={`transition-transform ${showV1 ? 'rotate-90' : ''}`}
              >
                <path d="M4 2L8 6L4 10z" />
              </svg>
              Dados da V1
            </button>

            {showV1 && (
              <div className="space-y-4 pl-2 border-l-2 border-gray-100">
                {/* Motivacao real da venda */}
                <div>
                  <Label htmlFor="lead-motivacao">Motivação real da venda</Label>
                  <textarea
                    id="lead-motivacao"
                    value={motivacaoVenda}
                    onChange={(e) => setMotivacaoVenda(e.target.value)}
                    placeholder="Descreva a motivação do proprietário para vender..."
                    className="mt-1 w-full h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  />
                </div>

                {/* Prazo urgencia */}
                <div>
                  <Label>Prazo de urgência</Label>
                  <ChipSelect
                    options={PRAZO_OPTIONS}
                    value={prazoUrgencia}
                    onChange={(v) => setPrazoUrgencia(v as PrazoUrgencia | null)}
                    className="mt-2"
                  />
                </div>

                {/* Fotos V1 */}
                <div>
                  <Label>Fotos da V1 (máx {5})</Label>
                  <PhotoUploader
                    consultantId={user?.id || ''}
                    value={fotosV1}
                    onChange={setFotosV1}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* Notes */}
          {/* ============================================================= */}
          <div className="mb-6">
            <Label htmlFor="lead-notas">Notas</Label>
            <textarea
              id="lead-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações adicionais..."
              className="mt-1 w-full h-20 rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            />
          </div>

          {/* ============================================================= */}
          {/* Save Button — 56px green */}
          {/* ============================================================= */}
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full text-base font-semibold text-white rounded-xl"
            style={{
              height: '56px',
              backgroundColor: canSave && !isSaving ? '#22C55E' : undefined,
            }}
          >
            {isSaving ? 'Salvando...' : 'Salvar Lead'}
          </Button>
        </div>
      </div>
    </div>
  )
}

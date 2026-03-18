'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useLeadsByFunnel } from '@/hooks/useLeads'
import type { EtapaFunil } from '@/lib/supabase/types'
import Papa from 'papaparse'
import { ArrowLeft, Download, Upload, AlertTriangle, CheckCircle, FileText } from 'lucide-react'

const FUNNEL_MAP: Record<EtapaFunil, string> = {
  contato: 'Prospect',
  v1_agendada: 'Qualified',
  v1_realizada: 'Qualified',
  v2_agendada: 'Listing',
  v2_realizada: 'Listing',
  representacao: 'Exclusive',
  venda: 'Closed',
  perdido: 'Lost',
}

export default function IntegracoesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { leads } = useLeadsByFunnel(user?.id ?? null)

  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv')

  const handleExportCSV = () => {
    setExportType('csv')
    setShowSecurityModal(true)
    setAccepted(false)
  }

  const handleExportPDF = () => {
    setExportType('pdf')
    setShowSecurityModal(true)
    setAccepted(false)
  }

  const confirmExport = () => {
    if (!accepted) return

    if (exportType === 'csv') {
      const data = leads.map((l) => ({
        Nome: l.nome,
        Telefone: l.telefone_encrypted || '',
        Email: l.email_encrypted || '',
        Edificio: l.edificios?.nome || '',
        Endereco: l.edificios?.endereco || '',
        Etapa: FUNNEL_MAP[l.etapa_funil] || l.etapa_funil,
        Origem: l.origem,
        Data: new Date(l.created_at).toLocaleDateString('pt-BR'),
      }))

      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `myremax_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: `${data.length} leads exportados para CSV!`, type: 'success' },
        }),
      )
    } else {
      // Simple text-based "PDF" export (real PDF would use jsPDF)
      const lines = [
        'RELATÓRIO MY RE/MAX — EXPORT',
        `Data: ${new Date().toLocaleDateString('pt-BR')}`,
        `Total de leads: ${leads.length}`,
        '',
        'LEADS:',
        ...leads.map(
          (l) =>
            `- ${l.nome} | ${FUNNEL_MAP[l.etapa_funil]} | ${l.edificios?.nome || 'S/ edifício'} | ${new Date(l.created_at).toLocaleDateString('pt-BR')}`,
        ),
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `myremax_report_${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Relatório exportado!', type: 'success' },
        }),
      )
    }

    setShowSecurityModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-base font-bold text-gray-900">My RE/MAX</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Investigation status */}
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={14} className="text-[#D97706]" />
            <span className="text-xs font-semibold text-[#D97706]">API não disponível</span>
          </div>
          <p className="text-[10px] text-gray-600">
            My RE/MAX não possui API pública documentada. Modo CSV/PDF ativo (princípio PV: fallback CSV).
            Quando API estiver disponível, ativar sync bidirecional automaticamente.
          </p>
        </div>

        {/* Export options (AC3) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Exportar para My RE/MAX</h2>
          <p className="text-xs text-gray-500 mb-3">{leads.length} leads ativos no sistema</p>

          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#003DA5' }}
            >
              <Download size={16} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl text-sm font-semibold text-[#003DA5] border-2 border-[#003DA5]"
            >
              <FileText size={16} /> Relatório
            </button>
          </div>
        </div>

        {/* Import from My RE/MAX (AC4) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Importar do My RE/MAX</h2>
          <p className="text-xs text-gray-500 mb-3">
            Exporte um CSV do My RE/MAX e importe aqui. Usa o mesmo fluxo da importação Captei.
          </p>
          <button
            onClick={() => router.push('/captei')}
            className="flex items-center gap-1.5 text-sm font-medium text-[#003DA5]"
          >
            <Upload size={16} /> Ir para importação CSV
          </button>
        </div>

        {/* Funnel mapping (AC7) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Mapeamento de Etapas</h2>
          <div className="space-y-1">
            {Object.entries(FUNNEL_MAP).map(([from, to]) => (
              <div key={from} className="flex items-center justify-between text-xs py-1">
                <span className="text-gray-600 capitalize">{from.replace(/_/g, ' ')}</span>
                <span className="text-gray-300">→</span>
                <span className="text-[#003DA5] font-medium">{to}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security modal (AC6) */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-[#D97706]" />
              <h3 className="text-sm font-bold text-gray-900">Aviso de Segurança</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Este arquivo contém dados pessoais (telefone, email). Trate conforme LGPD. Não compartilhe publicamente.
            </p>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 accent-[#003DA5]"
              />
              <span className="text-xs text-gray-700">Entendo e aceito</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="flex-1 h-10 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExport}
                disabled={!accepted}
                className="flex-1 h-10 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#22C55E' }}
              >
                <CheckCircle size={14} className="inline mr-1" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

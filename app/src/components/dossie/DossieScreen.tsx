'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { pdf } from '@react-pdf/renderer'
import { ArrowLeft, FileText, Share2, Download, Copy, MessageCircle } from 'lucide-react'
import {
  useDossie,
  useCreateDossie,
  DEFAULT_PLANO,
  DEFAULT_HISTORICO,
  type PlanoMarketing,
  type HistoricoResultados,
  type AcmSnapshot,
} from '@/hooks/useDossie'
import { DossieDocument } from './DossieDocument'

interface DossieScreenProps {
  leadId: string
  leadNome: string
  edificioEndereco: string
  consultantId: string
  acmSnapshot: AcmSnapshot | null
}

export function DossieScreen({
  leadId,
  leadNome,
  edificioEndereco,
  consultantId,
  acmSnapshot,
}: DossieScreenProps) {
  const router = useRouter()
  const { data: existingDossie } = useDossie(leadId)
  const createDossie = useCreateDossie()

  const [plano, setPlano] = useState<PlanoMarketing>(
    (existingDossie?.plano_marketing as PlanoMarketing) || DEFAULT_PLANO,
  )
  const [historico, setHistorico] = useState<HistoricoResultados>(
    (existingDossie?.historico_resultados as HistoricoResultados) || DEFAULT_HISTORICO,
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const generatePdf = useCallback(async () => {
    setIsGenerating(true)
    try {
      const blob = await pdf(
        <DossieDocument
          leadNome={leadNome}
          endereco={edificioEndereco}
          consultantNome="Luciana Borba"
          consultantCreci="000.000-F"
          consultantTelefone="(11) 99999-9999"
          consultantEmail="luciana@remax.com.br"
          acmSnapshot={acmSnapshot}
          planoMarketing={plano}
          historico={historico}
        />,
      ).toBlob()

      const url = URL.createObjectURL(blob)
      setPdfUrl(url)

      // Save to DB
      await createDossie.mutateAsync({
        lead_id: leadId,
        consultant_id: consultantId,
        titulo: `Dossiê — ${leadNome} — ${edificioEndereco}`,
        acm_snapshot: acmSnapshot,
        plano_marketing: plano,
        historico_resultados: historico,
        pdf_blob: blob,
      })

      showToast('Dossiê gerado!')
    } catch (err) {
      console.error('PDF generation error:', err)
      showToast('Erro ao gerar PDF')
    } finally {
      setIsGenerating(false)
    }
  }, [leadNome, edificioEndereco, acmSnapshot, plano, historico, leadId, consultantId, createDossie])

  function handleDownload() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `dossie-${leadNome.toLowerCase().replace(/\s+/g, '-')}.pdf`
    a.click()
    showToast('Download iniciado!')
  }

  function handleCopyLink() {
    if (existingDossie?.pdf_url) {
      navigator.clipboard.writeText(existingDossie.pdf_url)
      showToast('Link copiado!')
    } else {
      showToast('Gere o dossiê primeiro')
    }
    setShowShareMenu(false)
  }

  function handleWhatsApp() {
    const link = existingDossie?.pdf_url || ''
    const msg = encodeURIComponent(
      `Olá! Preparei um dossiê completo para o imóvel em ${edificioEndereco}. Confira: ${link}`,
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
    setShowShareMenu(false)
    showToast('Dossiê compartilhado!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <FileText className="size-4 text-[#003DA5]" />
              {existingDossie ? `Dossiê v${existingDossie.versao}` : 'Gerar Dossiê'}
            </h1>
            <p className="text-xs text-gray-500 truncate">{leadNome} — {edificioEndereco}</p>
          </div>
          {pdfUrl && (
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <Share2 className="size-5 text-gray-600" />
              </button>
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border py-1 z-50">
                  <button onClick={handleWhatsApp} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50">
                    <MessageCircle className="size-3.5 text-green-500" /> WhatsApp
                  </button>
                  <button onClick={handleCopyLink} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50">
                    <Copy className="size-3.5 text-gray-400" /> Copiar Link
                  </button>
                  <button onClick={handleDownload} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50">
                    <Download className="size-3.5 text-gray-400" /> Download
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* ACM Section (readonly) */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">ACM</h2>
          {acmSnapshot ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Média/m²</p>
                <p className="text-xs font-bold text-[#003DA5]">
                  R$ {acmSnapshot.mediaPrecoM2.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Mediana/m²</p>
                <p className="text-xs font-bold text-green-700">
                  R$ {acmSnapshot.medianaPrecoM2.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Comparáveis</p>
                <p className="text-xs font-bold text-purple-700">{acmSnapshot.totalComparaveis}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">ACM em preparação — gere pela tela ACM.</p>
          )}
        </div>

        {/* Plano de Marketing (editable — AC5) */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Plano de Marketing</h2>
          <label className="text-[10px] text-gray-500 block mb-1">Estratégia</label>
          <textarea
            className="w-full text-xs border border-gray-200 rounded-lg p-2 mb-2 resize-none focus:border-[#003DA5] focus:outline-none"
            rows={3}
            value={plano.estrategia}
            onChange={(e) => setPlano({ ...plano, estrategia: e.target.value })}
          />
          <label className="text-[10px] text-gray-500 block mb-1">Canais</label>
          <textarea
            className="w-full text-xs border border-gray-200 rounded-lg p-2 mb-2 resize-none focus:border-[#003DA5] focus:outline-none"
            rows={2}
            value={plano.canais}
            onChange={(e) => setPlano({ ...plano, canais: e.target.value })}
          />
          <label className="text-[10px] text-gray-500 block mb-1">Timeline</label>
          <textarea
            className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:border-[#003DA5] focus:outline-none"
            rows={2}
            value={plano.timeline}
            onChange={(e) => setPlano({ ...plano, timeline: e.target.value })}
          />
        </div>

        {/* Histórico (editable — AC5) */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Histórico de Resultados</h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Vendas Realizadas</label>
              <input
                type="number"
                className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:border-[#003DA5] focus:outline-none"
                value={historico.vendasRealizadas}
                onChange={(e) => setHistorico({ ...historico, vendasRealizadas: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Tempo Médio</label>
              <input
                className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:border-[#003DA5] focus:outline-none"
                value={historico.tempoMedio}
                onChange={(e) => setHistorico({ ...historico, tempoMedio: e.target.value })}
              />
            </div>
          </div>
          <label className="text-[10px] text-gray-500 block mb-1">Depoimento</label>
          <textarea
            className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:border-[#003DA5] focus:outline-none"
            rows={2}
            value={historico.depoimentos}
            onChange={(e) => setHistorico({ ...historico, depoimentos: e.target.value })}
          />
        </div>

        {/* PDF Preview */}
        {pdfUrl && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Preview</h2>
            <iframe src={pdfUrl} className="w-full h-64 rounded-lg border" title="Dossiê PDF Preview" />
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
        <button
          onClick={generatePdf}
          disabled={isGenerating}
          className="w-full h-12 bg-[#003DA5] hover:bg-[#002d7a] text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FileText className="size-5" />
          {isGenerating ? 'Gerando Dossiê...' : pdfUrl ? 'Regenerar Dossiê' : 'Gerar Dossiê'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

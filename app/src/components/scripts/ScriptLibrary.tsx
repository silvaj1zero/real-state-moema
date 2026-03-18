'use client'

import { useState, useMemo } from 'react'
import { useScripts, useCreateScript } from '@/hooks/useScripts'
import { ScriptCard, CATEGORIA_LABELS, CATEGORIA_COLORS } from './ScriptCard'
import type { CategoriaScript, EtapaFunil } from '@/lib/supabase/types'

const CATEGORIAS: CategoriaScript[] = [
  'objecao_imobiliaria',
  'objecao_experiencia',
  'objecao_exclusividade',
  'objecao_comissao',
  'objecao_preco',
  'abordagem_inicial',
  'fechamento',
  'follow_up',
]

const ETAPAS: { value: EtapaFunil; label: string }[] = [
  { value: 'contato', label: 'Contato' },
  { value: 'v1_agendada', label: 'V1 Agendada' },
  { value: 'v1_realizada', label: 'V1 Realizada' },
  { value: 'v2_agendada', label: 'V2 Agendada' },
  { value: 'v2_realizada', label: 'V2 Realizada' },
  { value: 'representacao', label: 'Representação' },
  { value: 'venda', label: 'Venda' },
  { value: 'perdido', label: 'Perdido' },
]

interface ScriptLibraryProps {
  isOpen: boolean
  onClose: () => void
}

export function ScriptLibrary({ isOpen, onClose }: ScriptLibraryProps) {
  const [search, setSearch] = useState('')
  const [activeCategoria, setActiveCategoria] = useState<CategoriaScript | null>(null)
  const [showForm, setShowForm] = useState(false)

  const filters = useMemo(
    () => ({
      categoria: activeCategoria ?? undefined,
      search: search.length >= 2 ? search : undefined,
    }),
    [activeCategoria, search]
  )

  const { data: scripts = [], isLoading } = useScripts(filters)
  const createScript = useCreateScript()

  // Form state
  const [formTitulo, setFormTitulo] = useState('')
  const [formCategoria, setFormCategoria] = useState<CategoriaScript>('abordagem_inicial')
  const [formObjecao, setFormObjecao] = useState('')
  const [formResposta, setFormResposta] = useState('')
  const [formTecnica, setFormTecnica] = useState('')
  const [formEtapa, setFormEtapa] = useState<EtapaFunil>('contato')

  if (!isOpen) return null

  const resetForm = () => {
    setFormTitulo('')
    setFormCategoria('abordagem_inicial')
    setFormObjecao('')
    setFormResposta('')
    setFormTecnica('')
    setFormEtapa('contato')
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!formTitulo.trim() || !formObjecao.trim() || !formResposta.trim()) return

    try {
      await createScript.mutateAsync({
        titulo: formTitulo.trim(),
        categoria: formCategoria,
        objecao: formObjecao.trim(),
        resposta: formResposta.trim(),
        tecnica: formTecnica.trim() || null,
        etapa_funil: formEtapa,
      })
      resetForm()
    } catch (err) {
      console.error('Erro ao criar script:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Biblioteca de Scripts</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar scripts..."
            className="w-full h-10 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveCategoria(null)}
          className={`shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors ${
            activeCategoria === null
              ? 'bg-[#003DA5] text-white border-transparent'
              : 'bg-white text-gray-600 border-gray-300'
          }`}
        >
          Todos
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoria(activeCategoria === cat ? null : cat)}
            className={`shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors ${
              activeCategoria === cat
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
            style={
              activeCategoria === cat ? { backgroundColor: CATEGORIA_COLORS[cat] } : undefined
            }
          >
            {CATEGORIA_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Script list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Nenhum script encontrado</p>
            {search && (
              <p className="text-xs text-gray-400 mt-1">Tente outro termo de busca</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {scripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        )}
      </div>

      {/* FAB to add custom script */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-[#003DA5] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform z-10"
          aria-label="Adicionar script"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Create script form (bottom sheet) */}
      {showForm && (
        <div className="absolute inset-0 z-20 bg-black/30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Novo Script</h3>
                <button onClick={resetForm} className="text-sm text-gray-500">
                  Cancelar
                </button>
              </div>

              <div className="space-y-3">
                {/* Titulo */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                    Título
                  </label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ex: Objeção de preço do imóvel"
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] outline-none"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                    Categoria
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as CategoriaScript)}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] outline-none bg-white"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORIA_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Etapa do Funil */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                    Etapa do Funil
                  </label>
                  <select
                    value={formEtapa}
                    onChange={(e) => setFormEtapa(e.target.value as EtapaFunil)}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] outline-none bg-white"
                  >
                    {ETAPAS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Objeção */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                    Objeção
                  </label>
                  <textarea
                    value={formObjecao}
                    onChange={(e) => setFormObjecao(e.target.value)}
                    placeholder="A objeção que o cliente faz..."
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none h-16 focus:border-[#003DA5] outline-none"
                  />
                </div>

                {/* Resposta */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                    Resposta
                  </label>
                  <textarea
                    value={formResposta}
                    onChange={(e) => setFormResposta(e.target.value)}
                    placeholder="Como responder à objeção..."
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none h-24 focus:border-[#003DA5] outline-none"
                  />
                </div>

                {/* Técnica */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                    Técnica
                  </label>
                  <input
                    type="text"
                    value={formTecnica}
                    onChange={(e) => setFormTecnica(e.target.value)}
                    placeholder="Ex: Espelhamento, Feel-Felt-Found"
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] outline-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={
                    createScript.isPending ||
                    !formTitulo.trim() ||
                    !formObjecao.trim() ||
                    !formResposta.trim()
                  }
                  className="w-full h-11 text-sm font-medium text-white bg-[#003DA5] rounded-lg disabled:opacity-50 transition-opacity"
                >
                  {createScript.isPending ? 'Salvando...' : 'Salvar Script'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

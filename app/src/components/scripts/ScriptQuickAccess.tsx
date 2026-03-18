'use client'

import { useState } from 'react'
import { useScripts } from '@/hooks/useScripts'
import { ScriptCard } from './ScriptCard'
import type { EtapaFunil } from '@/lib/supabase/types'

interface ScriptQuickAccessProps {
  etapaFunil?: EtapaFunil
}

export function ScriptQuickAccess({ etapaFunil }: ScriptQuickAccessProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: scripts = [], isLoading } = useScripts({
    etapaFunil,
    search: search.length >= 2 ? search : undefined,
  })

  return (
    <>
      {/* Trigger button — compact, designed for lead cards */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-[#003DA5] bg-[#003DA5]/10 rounded-md active:bg-[#003DA5]/20 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Scripts
      </button>

      {/* Bottom sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-base font-bold text-gray-900">Scripts</h3>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setSearch('')
                }}
                className="w-8 h-8 flex items-center justify-center"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search within sheet */}
            <div className="px-4 pb-3">
              <div className="relative">
                <svg
                  width="14"
                  height="14"
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
                  className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-[#003DA5] outline-none transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Scripts list */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : scripts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Nenhum script encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scripts.map((script) => (
                    <ScriptCard key={script.id} script={script} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

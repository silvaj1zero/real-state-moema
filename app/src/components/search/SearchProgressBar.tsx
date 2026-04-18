'use client'

import { Loader2 } from 'lucide-react'
import { useSearchStore } from '@/store/search'
import { useSearchStatus } from '@/hooks/useParametricSearch'

export function SearchProgressBar() {
  const currentSearchId = useSearchStore((s) => s.currentSearchId)
  const searchStatus = useSearchStore((s) => s.searchStatus)
  const selectedPortals = useSearchStore((s) => s.selectedPortals)

  const { data: statusData } = useSearchStatus(currentSearchId)

  // Only show when actively searching
  if (searchStatus === 'idle' || searchStatus === 'completed' || searchStatus === 'failed') {
    return null
  }

  const portalsText = Array.from(selectedPortals).join(', ').toUpperCase()
  const resultsSoFar = statusData?.results_count ?? 0

  return (
    <div className="bg-[#003DA5]/5 border border-[#003DA5]/20 rounded-xl p-4">
      {/* Animated bar */}
      <div className="w-full h-1.5 bg-[#003DA5]/10 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-[#003DA5] rounded-full animate-progress" />
      </div>

      {/* Text */}
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 text-[#003DA5] animate-spin shrink-0" />
        <p className="text-sm text-[#003DA5] font-medium">
          Buscando em {portalsText}...
          {resultsSoFar > 0 && (
            <span className="font-normal text-[#003DA5]/70 ml-1">
              {resultsSoFar} resultado{resultsSoFar !== 1 ? 's' : ''} ate agora
            </span>
          )}
        </p>
      </div>

      {/* Status detail */}
      {searchStatus === 'pending' && (
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Preparando busca nos portais...
        </p>
      )}
      {searchStatus === 'running' && (
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Coletando e processando anuncios...
        </p>
      )}

      {/* Style for progress animation */}
      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress {
          animation: progress-indeterminate 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

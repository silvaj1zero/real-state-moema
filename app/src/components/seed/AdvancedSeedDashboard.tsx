'use client'

import { Database, MapPin, Globe, FileText, RefreshCw } from 'lucide-react'
import { useSeedProgress, useRunSeed } from '@/hooks/useAdvancedSeed'
import { cn } from '@/lib/utils'

/**
 * AdvancedSeedDashboard — Story 3.5, AC6
 * Shows building enrichment progress by source and by field.
 */
export function AdvancedSeedDashboard() {
  const { data: progress, isLoading } = useSeedProgress()
  const runSeed = useRunSeed()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 bg-white rounded-xl animate-pulse" />
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!progress) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Database className="size-4 text-[#003DA5]" />
          Dados Avancados
        </h2>
        <button
          onClick={() => runSeed.mutate('all')}
          disabled={runSeed.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-[#003DA5] bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn('size-3', runSeed.isPending && 'animate-spin')} />
          Atualizar Dados
        </button>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">
            Edificios enriquecidos: {progress.enrichedCount}/{progress.total}
          </span>
          <span className="text-xs font-bold text-[#003DA5]">{progress.percentage}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-[#003DA5] rounded-full h-2 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Breakdown by source */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-900 mb-3">Por Fonte</h3>
        <div className="grid grid-cols-2 gap-3">
          <SourceCard
            icon={<MapPin className="size-3.5" />}
            label="Google Places"
            count={progress.bySource.google_places}
            color="text-red-600 bg-red-50"
          />
          <SourceCard
            icon={<Globe className="size-3.5" />}
            label="OSM Overpass"
            count={progress.bySource.osm_overpass}
            color="text-green-600 bg-green-50"
          />
          <SourceCard
            icon={<FileText className="size-3.5" />}
            label="GeoSampa IPTU"
            count={progress.bySource.geosampa_iptu}
            color="text-purple-600 bg-purple-50"
          />
          <SourceCard
            icon={<Database className="size-3.5" />}
            label="Manual/Base"
            count={progress.bySource.manual}
            color="text-gray-600 bg-gray-50"
          />
        </div>
      </div>

      {/* Field coverage */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-900 mb-3">Cobertura por Campo</h3>
        <div className="space-y-3">
          <FieldBar label="Unidades" pct={progress.byField.total_units.pct} filled={progress.byField.total_units.filled} total={progress.byField.total_units.total} />
          <FieldBar label="Ano Construcao" pct={progress.byField.ano_construcao.pct} filled={progress.byField.ano_construcao.filled} total={progress.byField.ano_construcao.total} />
          <FieldBar label="Padrao" pct={progress.byField.padrao_iptu.pct} filled={progress.byField.padrao_iptu.filled} total={progress.byField.padrao_iptu.total} />
          <FieldBar label="Pavimentos" pct={progress.byField.num_pavimentos.pct} filled={progress.byField.num_pavimentos.filled} total={progress.byField.num_pavimentos.total} />
        </div>
      </div>

      {/* Status feedback */}
      {runSeed.isSuccess && (
        <div className="text-[10px] text-green-600 text-center">Atualizacao concluida com sucesso.</div>
      )}
      {runSeed.isError && (
        <div className="text-[10px] text-red-600 text-center">Erro ao atualizar. Verifique API keys.</div>
      )}
    </div>
  )
}

function SourceCard({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className={cn('rounded-lg p-2.5 flex items-center gap-2', color)}>
      {icon}
      <div>
        <p className="text-xs font-bold">{count}</p>
        <p className="text-[9px] opacity-75">{label}</p>
      </div>
    </div>
  )
}

function FieldBar({ label, pct, filled, total }: { label: string; pct: number; filled: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-600">{label}</span>
        <span className="text-[10px] text-gray-500">{filled}/{total} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={cn(
            'rounded-full h-1.5 transition-all duration-500',
            pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

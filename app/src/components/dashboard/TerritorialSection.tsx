'use client'

import { cn } from '@/lib/utils'
import type { TerritorialKPIs } from '@/hooks/useDashboard'
import { KPICard } from './KPICard'
import { EmptyState } from './EmptyState'
import { useAuthStore } from '@/store/auth'
import { useMapStore } from '@/store/map'
import { useRadiusProgress } from '@/hooks/useRadiusExpansion'
import { RadiusProgressBar } from '@/components/expansion/RadiusProgressBar'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function BuildingIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  )
}

function SpeedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function FisboIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// TerritorialSection
// ---------------------------------------------------------------------------

interface TerritorialSectionProps {
  kpis: TerritorialKPIs
  className?: string
}

export function TerritorialSection({ kpis, className }: TerritorialSectionProps) {
  const user = useAuthStore((s) => s.user)
  const epicenter = useMapStore((s) => s.epicenter)
  const activeRadius = useMapStore((s) => s.activeRadius)
  const { progress, isLoading: progressLoading } = useRadiusProgress(
    epicenter,
    user?.id ?? null,
    activeRadius,
  )

  const isEmpty =
    kpis.totalEdificios === 0 && kpis.visitados === 0

  if (isEmpty) {
    return <EmptyState section="territorial" className={className} />
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: '#003DA5' }}
        />
        Territorial
      </h3>

      {/* Radius progress bar (compact) */}
      {!progressLoading && progress.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <RadiusProgressBar
            progress={progress}
            activeRadius={activeRadius}
            compact
          />
        </div>
      )}

      {/* KPI cards grid */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard
          title="Densidade"
          value={`${kpis.densidadeCarteira}`}
          subtitle="imoveis/km2"
          color="#003DA5"
          icon={<BuildingIcon />}
          compact
        />
        <KPICard
          title="Velocidade"
          value={`${kpis.velocidadeVarredura}`}
          subtitle="edificios/semana"
          color="#003DA5"
          icon={<SpeedIcon />}
          compact
        />
        <KPICard
          title="Dominio FISBO"
          value={`${kpis.taxaDominioFisbo}%`}
          subtitle={`${kpis.fisbosCadastrados}/${kpis.fisbosDetectados}`}
          color={kpis.taxaDominioFisbo >= 50 ? '#22C55E' : '#EAB308'}
          icon={<FisboIcon />}
          compact
        />
        <KPICard
          title="Varredura"
          value={`${kpis.visitados}/${kpis.totalEdificios}`}
          subtitle={kpis.totalEdificios > 0
            ? `${Math.round((kpis.visitados / kpis.totalEdificios) * 100)}% coberto`
            : '0% coberto'
          }
          color="#003DA5"
          compact
        />
      </div>
    </div>
  )
}

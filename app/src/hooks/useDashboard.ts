'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EtapaFunil, FonteFrog } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DashboardPeriod = 'semana' | 'mes' | 'trimestre' | 'custom'

export interface PeriodRange {
  from: string // ISO
  to: string // ISO
}

export interface TerritorialKPIs {
  densidadeCarteira: number // imoveis assessorados / km²
  velocidadeVarredura: number // buildings visited per week in period
  taxaDominioFisbo: number // FISBOs cadastrados / total FISBOs in zone (0-100)
  totalEdificios: number
  visitados: number
  fisbosDetectados: number
  fisbosCadastrados: number
}

export interface FunnelKPIs {
  volumeProspeccaoDiario: number // contacts created per day average
  conversaoPorEtapa: Record<string, number> // etapa -> rate (0-100)
  leadsParados7Dias: number // leads stuck >7 days in same stage
  totalLeads: number
  leadsPorEtapa: Record<EtapaFunil, number>
}

export interface InformantesKPIs {
  totalInformantes: number
  leadsGeradosPorInformante: number // average
  roiGentileza: number // (comissao - investido) / investido * 100
  totalInvestido: number
  totalComissoes: number
  semContato15Dias: number
}

export interface FrogKPIs {
  categories: {
    categoria: FonteFrog
    leadCount: number
    conversionRate: number
  }[]
  totalLeads: number
}

export interface MetaDiariaKPIs {
  v1sAgendadasHoje: number
  meta: number // default 5
  percentual: number // 0-100
}

export interface DashboardKPIs {
  territorial: TerritorialKPIs
  funnel: FunnelKPIs
  informantes: InformantesKPIs
  frog: FrogKPIs
  metaDiaria: MetaDiariaKPIs
  isLoading: boolean
  error: Error | null
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: (consultantId: string, period: DashboardPeriod) =>
    ['dashboard', 'kpis', consultantId, period] as const,
}

// ---------------------------------------------------------------------------
// Helper: compute date range from period
// ---------------------------------------------------------------------------

function getPeriodRange(period: DashboardPeriod, customRange?: PeriodRange): PeriodRange {
  const now = new Date()
  const to = now.toISOString()

  switch (period) {
    case 'semana': {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to }
    }
    case 'mes': {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to }
    }
    case 'trimestre': {
      const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to }
    }
    case 'custom':
      return customRange ?? { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to }
  }
}

function daysBetween(from: string, to: string): number {
  return Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)))
}

// ---------------------------------------------------------------------------
// useDashboardKPIs — aggregation hook
// ---------------------------------------------------------------------------

export function useDashboardKPIs(
  consultantId: string | null,
  period: DashboardPeriod = 'mes',
  customRange?: PeriodRange,
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: dashboardKeys.kpis(consultantId ?? '', period),
    queryFn: async (): Promise<Omit<DashboardKPIs, 'isLoading' | 'error'>> => {
      if (!consultantId) {
        return getEmptyKPIs()
      }

      const supabase = createClient()
      const range = getPeriodRange(period, customRange)
      const days = daysBetween(range.from, range.to)

      // ===================================================================
      // Parallel data fetching — batch all queries together
      // ===================================================================

      const [
        leadsResult,
        edificiosQualResult,
        informantesResult,
        agendamentosHojeResult,
        settingsResult,
      ] = await Promise.all([
        // All leads for this consultant
        supabase
          .from('leads')
          .select('id, etapa_funil, etapa_changed_at, fonte_frog, informante_id, is_fisbo, created_at')
          .eq('consultant_id', consultantId),

        // Edificio qualifications for this consultant
        supabase
          .from('edificios_qualificacoes')
          .select('id, edificio_id, status_varredura, is_fisbo_detected, updated_at')
          .eq('consultant_id', consultantId),

        // Informantes
        supabase
          .from('informantes')
          .select('id, total_investido_gentileza, comissao_devida, updated_at')
          .eq('consultant_id', consultantId),

        // Today's V1 agendamentos
        (() => {
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date()
          todayEnd.setHours(23, 59, 59, 999)
          return supabase
            .from('agendamentos')
            .select('id, tipo, data_hora')
            .eq('consultant_id', consultantId)
            .eq('tipo', 'v1')
            .gte('data_hora', todayStart.toISOString())
            .lte('data_hora', todayEnd.toISOString())
            .not('status', 'eq', 'cancelado')
        })(),

        // Consultant settings (meta_v1_diaria)
        supabase
          .from('consultant_settings')
          .select('meta_v1_diaria')
          .eq('consultant_id', consultantId)
          .maybeSingle(),
      ])

      const leads = leadsResult.data ?? []
      const quals = edificiosQualResult.data ?? []
      const informantes = informantesResult.data ?? []
      const agendamentosHoje = agendamentosHojeResult.data ?? []
      const metaV1 = settingsResult.data?.meta_v1_diaria ?? 5

      // ===================================================================
      // TERRITORIAL KPIs
      // ===================================================================

      const totalEdificios = quals.length
      const visitados = quals.filter((q) => q.status_varredura !== 'nao_visitado').length
      const fisbosDetectados = quals.filter((q) => q.is_fisbo_detected).length
      const fisbosCadastrados = leads.filter((l) => l.is_fisbo).length

      // Density: visited buildings per km² (approximate Moema area ~3.2 km²)
      const areaKm2 = 3.14 * (2 * 2) // pi * r² for 2km radius
      const densidadeCarteira = areaKm2 > 0 ? Math.round((visitados / areaKm2) * 10) / 10 : 0

      // Speed: buildings visited in period / weeks
      const visitadosInPeriod = quals.filter(
        (q) => q.status_varredura !== 'nao_visitado' && q.updated_at >= range.from
      ).length
      const weeks = Math.max(1, days / 7)
      const velocidadeVarredura = Math.round((visitadosInPeriod / weeks) * 10) / 10

      // FISBO domain rate
      const taxaDominioFisbo = fisbosDetectados > 0
        ? Math.round((fisbosCadastrados / fisbosDetectados) * 100)
        : 0

      const territorial: TerritorialKPIs = {
        densidadeCarteira,
        velocidadeVarredura,
        taxaDominioFisbo,
        totalEdificios,
        visitados,
        fisbosDetectados,
        fisbosCadastrados,
      }

      // ===================================================================
      // FUNNEL KPIs
      // ===================================================================

      const leadsInPeriod = leads.filter((l) => l.created_at >= range.from)
      const volumeProspeccaoDiario = Math.round((leadsInPeriod.length / days) * 10) / 10

      // Count per stage (exclude 'perdido')
      const activeEtapas: EtapaFunil[] = [
        'contato', 'v1_agendada', 'v1_realizada', 'v2_agendada', 'v2_realizada', 'representacao', 'venda',
      ]
      const leadsPorEtapa: Record<EtapaFunil, number> = {
        contato: 0, v1_agendada: 0, v1_realizada: 0, v2_agendada: 0,
        v2_realizada: 0, representacao: 0, venda: 0, perdido: 0,
      }
      for (const l of leads) {
        if (l.etapa_funil in leadsPorEtapa) {
          leadsPorEtapa[l.etapa_funil as EtapaFunil]++
        }
      }

      // Conversion rates between stages
      const conversaoPorEtapa: Record<string, number> = {}
      for (let i = 0; i < activeEtapas.length - 1; i++) {
        const current = leadsPorEtapa[activeEtapas[i]]
        const next = leadsPorEtapa[activeEtapas[i + 1]]
        if (current + next > 0) {
          conversaoPorEtapa[activeEtapas[i]] = Math.round((next / (current + next)) * 100)
        } else {
          conversaoPorEtapa[activeEtapas[i]] = 0
        }
      }

      // Leads stuck >7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const leadsParados7Dias = leads.filter(
        (l) => l.etapa_funil !== 'venda' && l.etapa_funil !== 'perdido' && l.etapa_changed_at < sevenDaysAgo
      ).length

      const totalLeads = leads.filter((l) => l.etapa_funil !== 'perdido').length

      const funnel: FunnelKPIs = {
        volumeProspeccaoDiario,
        conversaoPorEtapa,
        leadsParados7Dias,
        totalLeads,
        leadsPorEtapa,
      }

      // ===================================================================
      // INFORMANTES KPIs
      // ===================================================================

      let totalInvestido = 0
      let totalComissoes = 0
      for (const inf of informantes) {
        totalInvestido += inf.total_investido_gentileza ?? 0
        totalComissoes += inf.comissao_devida ?? 0
      }

      const roiGentileza = totalInvestido > 0
        ? Math.round(((totalComissoes - totalInvestido) / totalInvestido) * 100)
        : 0

      // Leads generated by informantes
      const leadsFromInformantes = leads.filter((l) => l.informante_id).length
      const leadsGeradosPorInformante = informantes.length > 0
        ? Math.round((leadsFromInformantes / informantes.length) * 10) / 10
        : 0

      // Informants without contact >15 days
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      const semContato15Dias = informantes.filter(
        (inf) => inf.updated_at < fifteenDaysAgo
      ).length

      const informantesKPIs: InformantesKPIs = {
        totalInformantes: informantes.length,
        leadsGeradosPorInformante,
        roiGentileza,
        totalInvestido,
        totalComissoes,
        semContato15Dias,
      }

      // ===================================================================
      // FROG KPIs
      // ===================================================================

      const frogCategories: FonteFrog[] = ['familia', 'relacionamentos', 'organizacoes', 'geografia']
      const categoryCounts: Record<FonteFrog, { total: number; converted: number }> = {
        familia: { total: 0, converted: 0 },
        relacionamentos: { total: 0, converted: 0 },
        organizacoes: { total: 0, converted: 0 },
        geografia: { total: 0, converted: 0 },
      }
      const convertedStages = new Set(['representacao', 'venda'])

      for (const lead of leads) {
        const cat = lead.fonte_frog as FonteFrog
        if (cat && categoryCounts[cat]) {
          categoryCounts[cat].total++
          if (convertedStages.has(lead.etapa_funil)) {
            categoryCounts[cat].converted++
          }
        }
      }

      const frog: FrogKPIs = {
        categories: frogCategories.map((cat) => ({
          categoria: cat,
          leadCount: categoryCounts[cat].total,
          conversionRate: categoryCounts[cat].total > 0
            ? Math.round((categoryCounts[cat].converted / categoryCounts[cat].total) * 100)
            : 0,
        })),
        totalLeads: Object.values(categoryCounts).reduce((sum, c) => sum + c.total, 0),
      }

      // ===================================================================
      // META DIARIA KPIs
      // ===================================================================

      const v1sAgendadasHoje = agendamentosHoje.length
      const metaDiaria: MetaDiariaKPIs = {
        v1sAgendadasHoje,
        meta: metaV1,
        percentual: metaV1 > 0 ? Math.min(100, Math.round((v1sAgendadasHoje / metaV1) * 100)) : 0,
      }

      return { territorial, funnel, informantes: informantesKPIs, frog, metaDiaria }
    },
    enabled: !!consultantId,
    staleTime: 60 * 1000, // 1 minute
  })

  // Pull-to-refresh: invalidates all dashboard queries
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    // Also invalidate underlying data queries
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    queryClient.invalidateQueries({ queryKey: ['funnel'] })
    queryClient.invalidateQueries({ queryKey: ['frog'] })
    queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
    queryClient.invalidateQueries({ queryKey: ['informantes'] })
    queryClient.invalidateQueries({ queryKey: ['cobertura'] })
  }, [queryClient])

  const data = query.data ?? getEmptyKPIs()

  return {
    ...data,
    isLoading: query.isLoading,
    error: query.error,
    refresh,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// Empty state factory
// ---------------------------------------------------------------------------

function getEmptyKPIs(): Omit<DashboardKPIs, 'isLoading' | 'error'> {
  return {
    territorial: {
      densidadeCarteira: 0,
      velocidadeVarredura: 0,
      taxaDominioFisbo: 0,
      totalEdificios: 0,
      visitados: 0,
      fisbosDetectados: 0,
      fisbosCadastrados: 0,
    },
    funnel: {
      volumeProspeccaoDiario: 0,
      conversaoPorEtapa: {},
      leadsParados7Dias: 0,
      totalLeads: 0,
      leadsPorEtapa: {
        contato: 0, v1_agendada: 0, v1_realizada: 0, v2_agendada: 0,
        v2_realizada: 0, representacao: 0, venda: 0, perdido: 0,
      },
    },
    informantes: {
      totalInformantes: 0,
      leadsGeradosPorInformante: 0,
      roiGentileza: 0,
      totalInvestido: 0,
      totalComissoes: 0,
      semContato15Dias: 0,
    },
    frog: {
      categories: [
        { categoria: 'familia', leadCount: 0, conversionRate: 0 },
        { categoria: 'relacionamentos', leadCount: 0, conversionRate: 0 },
        { categoria: 'organizacoes', leadCount: 0, conversionRate: 0 },
        { categoria: 'geografia', leadCount: 0, conversionRate: 0 },
      ],
      totalLeads: 0,
    },
    metaDiaria: {
      v1sAgendadasHoje: 0,
      meta: 5,
      percentual: 0,
    },
  }
}

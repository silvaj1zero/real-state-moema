'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useComissoes, useDashboardStats } from '@/hooks/useComissoes'
import type { Comissao, StatusPagamento } from '@/lib/supabase/types'
import { useUpdateComissaoStatus } from '@/hooks/useComissoes'
import { ArrowLeft, DollarSign, Clock, TrendingUp, CreditCard, Download } from 'lucide-react'

const STATUS_CONFIG: Record<StatusPagamento, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#9E9E9E' },
  recebido: { label: 'Recebido', color: '#003DA5' },
  pago_informante: { label: 'Pago Inform.', color: '#FF8C00' },
  pago_parceiro: { label: 'Pago Parceiro', color: '#6366F1' },
  completo: { label: 'Completo', color: '#22C55E' },
}

const ALL_STATUSES: StatusPagamento[] = ['pendente', 'recebido', 'pago_informante', 'pago_parceiro', 'completo']

function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ComissaoCard({ comissao }: { comissao: Comissao }) {
  const user = useAuthStore((s) => s.user)
  const updateStatus = useUpdateComissaoStatus()
  const config = STATUS_CONFIG[comissao.status_pagamento]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">{fmtR(comissao.valor_bruto)}</span>
        <select
          value={comissao.status_pagamento}
          onChange={(e) => {
            if (!user) return
            updateStatus.mutate({
              id: comissao.id,
              consultant_id: user.id,
              status: e.target.value as StatusPagamento,
            })
          }}
          className="text-xs rounded-lg border border-gray-300 px-2 py-1 outline-none"
          style={{ color: config.color }}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
        <span>Imóvel: {fmtR(comissao.valor_imovel)}</span>
        <span>{comissao.percentual_comissao}%</span>
        {comissao.split_consultora && <span>Consultora: {fmtR(comissao.split_consultora)}</span>}
        {comissao.data_recebimento && <span>Rec: {new Date(comissao.data_recebimento).toLocaleDateString('pt-BR')}</span>}
      </div>
      <div className="mt-1 text-[10px] text-gray-300">
        {new Date(comissao.created_at).toLocaleDateString('pt-BR')}
      </div>
    </div>
  )
}

function MonthlyChart({ data }: { data: { month: string; valor: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.valor), 1)

  return (
    <div className="flex items-end gap-2 h-24 px-4 py-2">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-[#003DA5] min-h-[2px] transition-all"
            style={{ height: `${Math.max((d.valor / maxVal) * 80, 2)}px` }}
          />
          <span className="text-[9px] text-gray-400">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function ComissoesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { comissoes, isLoading } = useComissoes(user?.id ?? null)
  const { stats } = useDashboardStats(user?.id ?? null)

  const handleExportCSV = () => {
    const headers = 'Data,Valor Imóvel,Comissão %,Valor Bruto,Consultora,Franquia,Status\n'
    const rows = comissoes.map((c) =>
      `${new Date(c.created_at).toLocaleDateString('pt-BR')},${c.valor_imovel},${c.percentual_comissao},${c.valor_bruto},${c.split_consultora ?? 0},${c.split_franquia ?? 0},${c.status_pagamento}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comissoes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Comissões</h1>
          <button onClick={handleExportCSV} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <Download size={18} className="text-gray-500" />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        {[
          { label: 'Total Bruto', value: fmtR(stats.totalBruto), Icon: DollarSign, color: '#003DA5' },
          { label: 'Líquido Consultora', value: fmtR(stats.totalLiquidoConsultora), Icon: TrendingUp, color: '#22C55E' },
          { label: 'Pendentes', value: String(stats.pendentesCount), Icon: Clock, color: '#F59E0B' },
          { label: 'Recebidas mês', value: fmtR(stats.recebidasMes), Icon: CreditCard, color: '#6366F1' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-bold" style={{ color }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm mb-3">
        <p className="text-xs font-medium text-gray-500 px-4 pt-3">Últimos 6 meses</p>
        <MonthlyChart data={stats.monthlyData} />
      </div>

      {/* Commission list */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)
        ) : comissoes.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Nenhuma comissão registrada</div>
        ) : (
          comissoes.map((c) => <ComissaoCard key={c.id} comissao={c} />)
        )}
      </div>
    </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProcessOptOutButton } from './_process-button'

export const dynamic = 'force-dynamic'

interface OptOutRow {
  id: string
  protocol_number: string
  telefone: string | null
  email: string | null
  evidence: string | null
  status: string
  created_at: string
  notes: string | null
}

/**
 * /admin/lgpd — Epic 7 Story 7.10 AC9.
 *
 * Admin-only dashboard for processing pending opt-out requests and reviewing
 * the audit log. AuthZ enforced via role=admin claim.
 */
export default async function AdminLGPDPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin/lgpd')
  }

  const role =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ??
    (user.user_metadata as Record<string, unknown> | undefined)?.role

  if (role !== 'admin') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="mt-2 text-gray-600">
          Esta página é restrita a administradores.
        </p>
      </main>
    )
  }

  const { data: pending } = await supabase
    .from('lgpd_opt_out_requests')
    .select('id, protocol_number, telefone, email, evidence, status, created_at, notes')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (pending ?? []) as OptOutRow[]

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">LGPD — Painel Administrativo</h1>
      <p className="mt-2 text-sm text-gray-600">
        Solicitações de opt-out e audit log. SLA de processamento: 15 dias
        corridos.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Solicitações recentes</h2>
        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Protocolo</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Telefone</th>
                <th className="px-3 py-2 text-left">E-mail</th>
                <th className="px-3 py-2 text-left">Criado</th>
                <th className="px-3 py-2 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                    Nenhuma solicitação registrada ainda.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-mono">{row.protocol_number}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.status === 'completed'
                            ? 'text-green-700'
                            : row.status === 'pending'
                            ? 'text-amber-700'
                            : 'text-gray-700'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.telefone ?? '—'}</td>
                    <td className="px-3 py-2">{row.email ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {new Date(row.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-2">
                      {row.status === 'pending' ? (
                        <ProcessOptOutButton protocolNumber={row.protocol_number} />
                      ) : (
                        <span className="text-xs text-gray-500">
                          {row.notes ?? '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

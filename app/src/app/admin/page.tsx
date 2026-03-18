'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, UserPlus, Shield } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [franquia, setFranquia] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const canSave = email.trim().length > 0 && nome.trim().length > 0

  const handleInvite = async () => {
    if (!canSave) return
    setIsSaving(true)
    setResult(null)

    try {
      const supabase = createClient()

      // Create user via Supabase Auth (magic link)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        email_confirm: false,
        user_metadata: { nome: nome.trim(), franquia: franquia.trim() },
      })

      if (authError) {
        // Fallback: use signUp with a temporary password if admin API not available
        const tempPassword = `Remax2026!${Math.random().toString(36).slice(2, 8)}`
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: tempPassword,
          options: {
            data: { nome: nome.trim(), franquia: franquia.trim() },
          },
        })

        if (signUpError) throw signUpError

        const userId = signUpData.user?.id
        if (userId) {
          // Insert into consultores
          await supabase.from('consultores').insert({
            id: userId,
            auth_user_id: userId,
            nome: nome.trim(),
            franquia: franquia.trim() || null,
            role: 'consultant',
          })

          // Insert consultant_settings with defaults
          await supabase.from('consultant_settings').insert({
            consultant_id: userId,
          })
        }

        setResult({
          success: true,
          message: `Consultor convidado! Email: ${email.trim()} — Senha temporária: ${tempPassword}`,
        })
      } else {
        const userId = authData.user?.id
        if (userId) {
          await supabase.from('consultores').insert({
            id: userId,
            auth_user_id: userId,
            nome: nome.trim(),
            franquia: franquia.trim() || null,
            role: 'consultant',
          })

          await supabase.from('consultant_settings').insert({
            consultant_id: userId,
          })
        }

        setResult({
          success: true,
          message: `Consultor ${nome.trim()} convidado com sucesso! Email de confirmação enviado.`,
        })
      }

      setEmail('')
      setNome('')
      setFranquia('')
    } catch (err) {
      console.error('Error inviting consultant:', err)
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao convidar consultor',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5">
            <Shield size={18} className="text-[#003DA5]" />
            <h1 className="text-base font-bold text-gray-900">Admin</h1>
          </div>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-4">
            <UserPlus size={16} className="text-[#003DA5]" />
            Convidar Consultor
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="consultor@email.com"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Franquia</label>
              <input
                type="text"
                value={franquia}
                onChange={(e) => setFranquia(e.target.value)}
                placeholder="Ex: RE/MAX Galeria"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]"
              />
            </div>
          </div>

          {result && (
            <div className={`mt-3 p-3 rounded-lg text-xs ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.message}
            </div>
          )}

          <button
            onClick={handleInvite}
            disabled={!canSave || isSaving}
            className="w-full h-14 mt-4 rounded-xl text-base font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: canSave && !isSaving ? '#003DA5' : '#9CA3AF' }}
          >
            {isSaving ? 'Convidando...' : 'Convidar Consultor'}
          </button>
        </div>

        {/* RLS Status info */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mt-4">
          <h3 className="text-xs font-bold text-[#003DA5] mb-2">Multi-Tenant (RLS)</h3>
          <p className="text-[10px] text-gray-600">
            Para ativar o isolamento de dados entre consultores, execute a migration{' '}
            <code className="text-[#003DA5]">005_rls_activation.sql</code> no Supabase SQL Editor.
            Após ativar, cada consultor verá apenas seus próprios dados. Edifícios são públicos.
          </p>
        </div>
      </div>
    </div>
  )
}

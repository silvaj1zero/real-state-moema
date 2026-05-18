'use client'

import { useState } from 'react'

interface SubmitState {
  status: 'idle' | 'submitting' | 'success' | 'error'
  protocolNumber?: string
  message?: string
}

/**
 * LGPD Opt-Out Form — Epic 7 Story 7.10 AC8.
 *
 * Public form. Submits POST /api/lgpd/opt-out with telefone and/or email.
 * On success, displays the protocol number and 15-day SLA.
 */
export function LGPDOptOutForm() {
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [evidence, setEvidence] = useState('')
  const [state, setState] = useState<SubmitState>({ status: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!telefone && !email) {
      setState({
        status: 'error',
        message: 'Informe telefone OU e-mail para identificarmos seus dados.',
      })
      return
    }

    setState({ status: 'submitting' })
    try {
      const res = await fetch('/api/lgpd/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefone || undefined,
          email: email || undefined,
          evidence: evidence || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 202 && data.protocol_number) {
        setState({
          status: 'success',
          protocolNumber: data.protocol_number,
          message: data.message,
        })
        return
      }
      setState({
        status: 'error',
        message:
          data?.issues?.[0]?.message ??
          data?.error ??
          'Erro ao registrar solicitação. Tente novamente.',
      })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Falha de rede.',
      })
    }
  }

  if (state.status === 'success') {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-6">
        <h3 className="text-lg font-semibold text-green-900">
          Solicitação registrada
        </h3>
        <p className="mt-2 text-sm text-green-800">
          Protocolo: <strong>{state.protocolNumber}</strong>
        </p>
        <p className="mt-2 text-sm text-green-800">{state.message}</p>
        <p className="mt-4 text-xs text-green-700">
          Guarde este número de protocolo. Caso precise acompanhar ou
          contestar, entre em contato com o DPO informando o protocolo.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium">
          Telefone (com DDD)
        </label>
        <input
          id="telefone"
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-8888"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu-email@exemplo.com"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          autoComplete="email"
        />
        <p className="mt-1 text-xs text-gray-500">
          Informe pelo menos um dos campos acima.
        </p>
      </div>

      <div>
        <label htmlFor="evidence" className="block text-sm font-medium">
          Como nos identificamos (opcional)
        </label>
        <textarea
          id="evidence"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex.: 'Vocês me ligaram em 12/05 oferecendo serviço de venda do meu apto na Av. X'"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {state.status === 'error' && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={state.status === 'submitting'}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {state.status === 'submitting'
          ? 'Enviando...'
          : 'Solicitar remoção de dados'}
      </button>
    </form>
  )
}

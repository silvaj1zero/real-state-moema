'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateInformante } from '@/hooks/useInformantes'
import type { Informante } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  return parseInt(digits, 10) / 100
}

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const cents = parseInt(digits, 10)
  return (cents / 100).toFixed(2).replace('.', ',')
}

// ---------------------------------------------------------------------------
// ComissaoTracker — 5% commission section in InformanteDetail
// PV principle: "Comissao: sistema sugere, humano confirma"
// ---------------------------------------------------------------------------

interface ComissaoTrackerProps {
  informante: Informante
}

export function ComissaoTracker({ informante }: ComissaoTrackerProps) {
  const updateInformante = useUpdateInformante()

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentValueStr, setPaymentValueStr] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // 5% commission calculation
  const [showCalcForm, setShowCalcForm] = useState(false)
  const [commissionBaseStr, setCommissionBaseStr] = useState('')

  const pendente = informante.comissao_devida - informante.comissao_paga

  // Handle registering a payment
  const handleRegisterPayment = async () => {
    const paymentValue = parseCurrencyInput(paymentValueStr)
    if (paymentValue <= 0) return

    setIsProcessing(true)
    try {
      await updateInformante.mutateAsync({
        id: informante.id,
        consultant_id: informante.consultant_id,
        updates: {
          comissao_paga: informante.comissao_paga + paymentValue,
        },
      })

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Pagamento de ${formatCurrencyBR(paymentValue)} registrado!`,
              type: 'success',
            },
          }),
        )
      }

      setShowPaymentForm(false)
      setPaymentValueStr('')
    } catch (err) {
      console.error('Error registering payment:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Erro ao registrar pagamento', type: 'error' },
          }),
        )
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle 5% calculation
  const handleCalculate5Percent = async () => {
    const baseValue = parseCurrencyInput(commissionBaseStr)
    if (baseValue <= 0) return

    const commission5 = baseValue * 0.05

    setIsProcessing(true)
    try {
      // PV principle: system calculates, human confirms
      // Add the 5% to comissao_devida
      await updateInformante.mutateAsync({
        id: informante.id,
        consultant_id: informante.consultant_id,
        updates: {
          comissao_devida: informante.comissao_devida + commission5,
        },
      })

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Comissao de ${formatCurrencyBR(commission5)} (5% de ${formatCurrencyBR(baseValue)}) adicionada!`,
              type: 'success',
            },
          }),
        )
      }

      setShowCalcForm(false)
      setCommissionBaseStr('')
    } catch (err) {
      console.error('Error calculating commission:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Erro ao calcular comissao', type: 'error' },
          }),
        )
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mb-6 p-3 bg-amber-50 rounded-xl border border-amber-200">
      <span className="text-sm font-semibold text-gray-900 block mb-3">
        Comissao (5%)
      </span>

      {/* Summary display */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide block">
            Devida
          </span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrencyBR(informante.comissao_devida)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide block">
            Paga
          </span>
          <span className="text-sm font-bold text-green-600">
            {formatCurrencyBR(informante.comissao_paga)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide block">
            Pendente
          </span>
          <span
            className={`text-sm font-bold ${
              pendente > 0 ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            {formatCurrencyBR(pendente)}
          </span>
        </div>
      </div>

      {/* PV principle note */}
      <p className="text-[10px] text-amber-600 mb-3 italic">
        Sistema sugere, humano confirma pagamento
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowCalcForm(!showCalcForm)
            setShowPaymentForm(false)
          }}
          className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
        >
          Calcular 5%
        </button>
        <button
          onClick={() => {
            setShowPaymentForm(!showPaymentForm)
            setShowCalcForm(false)
          }}
          className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
        >
          Registrar pagamento
        </button>
      </div>

      {/* Calculate 5% form */}
      {showCalcForm && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200 space-y-3">
          <div>
            <Label htmlFor="commission-base" className="text-xs">
              Valor da comissao da venda (R$)
            </Label>
            <Input
              id="commission-base"
              value={commissionBaseStr}
              onChange={(e) =>
                setCommissionBaseStr(formatCurrencyInput(e.target.value))
              }
              placeholder="0,00"
              inputMode="numeric"
              className="mt-1 h-10"
            />
            {commissionBaseStr && (
              <p className="text-[10px] text-amber-600 mt-1">
                5% = {formatCurrencyBR(parseCurrencyInput(commissionBaseStr) * 0.05)}
              </p>
            )}
          </div>
          <Button
            onClick={handleCalculate5Percent}
            disabled={isProcessing || !commissionBaseStr}
            className="w-full h-10 text-sm"
            style={{
              backgroundColor:
                commissionBaseStr && !isProcessing ? '#F59E0B' : undefined,
            }}
          >
            {isProcessing ? 'Processando...' : 'Confirmar 5%'}
          </Button>
        </div>
      )}

      {/* Register payment form */}
      {showPaymentForm && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 space-y-3">
          <div>
            <Label htmlFor="payment-value" className="text-xs">
              Valor do pagamento (R$)
            </Label>
            <Input
              id="payment-value"
              value={paymentValueStr}
              onChange={(e) =>
                setPaymentValueStr(formatCurrencyInput(e.target.value))
              }
              placeholder="0,00"
              inputMode="numeric"
              className="mt-1 h-10"
            />
          </div>
          <Button
            onClick={handleRegisterPayment}
            disabled={isProcessing || !paymentValueStr}
            className="w-full h-10 text-sm"
            style={{
              backgroundColor:
                paymentValueStr && !isProcessing ? '#22C55E' : undefined,
            }}
          >
            {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </div>
      )}
    </div>
  )
}

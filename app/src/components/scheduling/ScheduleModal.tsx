'use client'

import { useState, useCallback } from 'react'
import { useAgendamentosStore } from '@/store/agendamentos'
import { useAuthStore } from '@/store/auth'
import { useCreateAgendamento } from '@/hooks/useAgendamentos'
import { scheduleAppointmentReminder, requestNotificationPermission } from '@/lib/notifications/push'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the local datetime string for an <input type="datetime-local"> */
function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Default "Opcao 1" — tomorrow at 10:00 */
function defaultOpcao1(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return toLocalDatetimeValue(d)
}

/** Default "Opcao 2" — tomorrow at 15:00 */
function defaultOpcao2(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(15, 0, 0, 0)
  return toLocalDatetimeValue(d)
}

// ---------------------------------------------------------------------------
// ScheduleModal — "Técnica de Duas Opções"
// ---------------------------------------------------------------------------

export function ScheduleModal() {
  const user = useAuthStore((s) => s.user)
  const {
    isScheduleModalOpen,
    scheduleModalLeadId,
    scheduleModalTipo,
    closeScheduleModal,
  } = useAgendamentosStore()

  const createMutation = useCreateAgendamento()

  const [opcao1, setOpcao1] = useState(defaultOpcao1)
  const [opcao2, setOpcao2] = useState(defaultOpcao2)
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const tipoLabel = scheduleModalTipo === 'v2' ? 'V2' : 'V1'

  const handleClose = useCallback(() => {
    setOpcao1(defaultOpcao1())
    setOpcao2(defaultOpcao2())
    setNotas('')
    setError(null)
    setShowTooltip(false)
    closeScheduleModal()
  }, [closeScheduleModal])

  const handleSave = useCallback(async () => {
    if (!scheduleModalLeadId || !scheduleModalTipo || !user?.id) return

    setError(null)

    // Validate options are in the future
    const now = new Date()
    const date1 = new Date(opcao1)
    const date2 = new Date(opcao2)

    if (date1 <= now) {
      setError('Opção 1 deve ser uma data/hora futura.')
      return
    }

    if (date2 <= now) {
      setError('Opção 2 deve ser uma data/hora futura.')
      return
    }

    if (date1.getTime() === date2.getTime()) {
      setError('As duas opções devem ter horários diferentes.')
      return
    }

    try {
      // Request notification permission proactively
      await requestNotificationPermission()

      const agendamento = await createMutation.mutateAsync({
        lead_id: scheduleModalLeadId,
        consultant_id: user.id,
        tipo: scheduleModalTipo,
        data_hora: date1.toISOString(),
        opcao_alternativa: date2.toISOString(),
        notas: notas.trim() || undefined,
      })

      // Schedule push notification 1h before
      scheduleAppointmentReminder(
        agendamento.id,
        'Lead', // We don't have the name here; notification will be generic
        scheduleModalTipo,
        agendamento.data_hora
      )

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar.')
    }
  }, [
    scheduleModalLeadId,
    scheduleModalTipo,
    user?.id,
    opcao1,
    opcao2,
    notas,
    createMutation,
    handleClose,
  ])

  if (!isScheduleModalOpen || !scheduleModalLeadId || !scheduleModalTipo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Agendar {tipoLabel}
            </h2>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full text-white ${
                scheduleModalTipo === 'v2' ? 'bg-[#D97706]' : 'bg-[#003DA5]'
              }`}
            >
              {tipoLabel}
            </span>
          </div>
        </div>

        {/* Técnica de Duas Opções explanation */}
        <div className="mx-5 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="shrink-0 mt-0.5"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label="Sobre a Técnica de Duas Opções"
            >
              <svg
                className="w-4 h-4 text-[#003DA5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <div>
              <p className="text-sm font-medium text-blue-800">
                Técnica de Duas Opções
              </p>
              {showTooltip && (
                <p className="text-xs text-blue-700 mt-1">
                  Ofereça 2 horários ao proprietário — desloca a decisão de
                  &quot;sim ou não&quot; para &quot;qual dos dois&quot;.
                  Técnica RE/MAX de alta conversão.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Two datetime pickers side by side */}
        <div className="px-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Opção 1 */}
            <div>
              <Label htmlFor="schedule-opcao1" className="text-sm text-gray-700 mb-1">
                Opção 1
              </Label>
              <input
                id="schedule-opcao1"
                type="datetime-local"
                value={opcao1}
                onChange={(e) => setOpcao1(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              />
            </div>

            {/* Opção 2 */}
            <div>
              <Label htmlFor="schedule-opcao2" className="text-sm text-gray-700 mb-1">
                Opção 2
              </Label>
              <input
                id="schedule-opcao2"
                type="datetime-local"
                value={opcao2}
                onChange={(e) => setOpcao2(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="schedule-notas" className="text-sm text-gray-700 mb-1">
              Observações
            </Label>
            <textarea
              id="schedule-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Endereço do imóvel, detalhes da visita..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 mt-2">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-10 text-white bg-[#003DA5] hover:bg-[#002d7a]"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Agendar'
            )}
          </Button>
        </div>

        {/* Safe area bottom padding for mobile */}
        <div className="h-safe-area-bottom sm:hidden" />
      </div>
    </div>
  )
}

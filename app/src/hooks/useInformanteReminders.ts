'use client'

import { useMemo } from 'react'
import type { InformanteWithEdificios } from '@/hooks/useInformantes'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_REMINDER_DAYS = 15

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InformanteReminder {
  informante: InformanteWithEdificios
  daysWithoutContact: number
  needsContact: boolean
}

// ---------------------------------------------------------------------------
// useInformanteReminders — check last contact per informante
// ---------------------------------------------------------------------------

interface UseInformanteRemindersOptions {
  informantes: InformanteWithEdificios[]
  /** Days threshold from consultant_settings.lembrete_informante_dias */
  reminderDays?: number
  /** Last gentileza dates map: informanteId -> ISO date string */
  lastGentilezaDates?: Record<string, string>
}

export function useInformanteReminders({
  informantes,
  reminderDays = DEFAULT_REMINDER_DAYS,
  lastGentilezaDates = {},
}: UseInformanteRemindersOptions) {
  const reminders = useMemo(() => {
    const now = new Date()

    return informantes.map((informante): InformanteReminder => {
      // Use last gentileza date if available, otherwise fall back to updated_at
      const lastContactDate =
        lastGentilezaDates[informante.id] || informante.updated_at

      const lastContact = new Date(lastContactDate)
      const diffMs = now.getTime() - lastContact.getTime()
      const daysWithoutContact = Math.max(
        0,
        Math.floor(diffMs / (1000 * 60 * 60 * 24)),
      )

      return {
        informante,
        daysWithoutContact,
        needsContact: daysWithoutContact > reminderDays,
      }
    })
  }, [informantes, reminderDays, lastGentilezaDates])

  const informantesNeedingContact = useMemo(
    () => reminders.filter((r) => r.needsContact),
    [reminders],
  )

  return {
    reminders,
    informantesNeedingContact,
    reminderDays,
  }
}

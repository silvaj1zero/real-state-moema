// ---------------------------------------------------------------------------
// Web Push Notifications — MVP using Notification API
// Full service worker push is Story 1.6 extension
// ---------------------------------------------------------------------------

/**
 * Request browser notification permission.
 * Returns the current permission state after the request.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this browser.')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  // Ask user for permission
  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Show a browser notification immediately.
 */
export function showNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `remax-${Date.now()}`,
    })
  } catch (error) {
    console.error('Error showing notification:', error)
  }
}

// Active scheduled notification timers — keyed by agendamento ID
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Schedule a local notification for a future time.
 * Uses setTimeout for MVP — full service worker approach in Story 1.6.
 *
 * @param id - Unique identifier (agendamento ID) to allow cancellation
 * @param title - Notification title
 * @param body - Notification body
 * @param scheduledFor - ISO 8601 datetime when the notification should fire
 * @returns true if scheduled, false if the time is in the past or permissions denied
 */
export function scheduleLocalNotification(
  id: string,
  title: string,
  body: string,
  scheduledFor: string
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const scheduledTime = new Date(scheduledFor).getTime()
  const now = Date.now()
  const delay = scheduledTime - now

  // Don't schedule notifications in the past
  if (delay <= 0) return false

  // Cancel existing timer for this ID if any
  cancelScheduledNotification(id)

  const timer = setTimeout(() => {
    showNotification(title, body)
    scheduledTimers.delete(id)
  }, delay)

  scheduledTimers.set(id, timer)
  return true
}

/**
 * Cancel a previously scheduled notification.
 */
export function cancelScheduledNotification(id: string): void {
  const timer = scheduledTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    scheduledTimers.delete(id)
  }
}

/**
 * Schedule a reminder notification 1 hour before an appointment.
 *
 * @param agendamentoId - The agendamento ID
 * @param leadNome - Lead name for the notification body
 * @param tipo - 'v1' or 'v2'
 * @param dataHora - ISO 8601 datetime of the appointment
 */
export function scheduleAppointmentReminder(
  agendamentoId: string,
  leadNome: string,
  tipo: string,
  dataHora: string
): boolean {
  const appointmentTime = new Date(dataHora).getTime()
  const oneHourBefore = new Date(appointmentTime - 60 * 60 * 1000).toISOString()
  const tipoLabel = tipo.toUpperCase()

  return scheduleLocalNotification(
    `reminder-${agendamentoId}`,
    `${tipoLabel} em 1 hora`,
    `${tipoLabel} com ${leadNome} em 1 hora`,
    oneHourBefore
  )
}

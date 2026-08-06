import { useEffect, useRef } from 'react'
import { useWellnessStore, WELLNESS_REMINDERS } from '../stores/wellnessStore'
import { useNotificationStore } from '../../notifications/stores/notificationStore'

/**
 * Custom hook that manages the wellness notification engine.
 * Runs interval timers for each enabled reminder, checks work hours and snooze state,
 * and sends native browser notifications (or falls back to in-app notifications).
 *
 * Mount this in AppShell so it runs app-wide while the user is authenticated.
 */
export const useWellnessNotifications = () => {
  const timerRef = useRef(null)

  // Request browser notification permission on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      useWellnessStore.getState().setNotificationPermission('denied')
      return
    }

    if (Notification.permission === 'granted') {
      useWellnessStore.getState().setNotificationPermission('granted')
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((result) => {
        useWellnessStore.getState().setNotificationPermission(result)
      })
    }
  }, [])

  // Core ticker engine — checks real timestamps against intervals every 5 seconds
  useEffect(() => {
    const sendNotification = (reminder) => {
      // Native browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(`${reminder.emoji} ${reminder.name}`, {
            body: reminder.message,
            icon: '/favicon.ico',
            tag: `wellness-${reminder.id}`,
            requireInteraction: false,
            silent: false,
          })
          setTimeout(() => notif.close(), 8000)
        } catch {
          // fallback below
        }
      }

      // In-app notification center
      useNotificationStore.getState().addNotification({
        title: `${reminder.emoji} ${reminder.name}`,
        message: reminder.message,
        type: 'wellness',
        link: '/wellness',
      })
    }

    const checkReminders = () => {
      const state = useWellnessStore.getState()

      // Guard: work hours, snooze, global toggle
      if (!state.globalEnabled) return
      if (!state.isWithinWorkHours()) return
      if (state.isSnoozed()) return

      const now = Date.now()

      WELLNESS_REMINDERS.forEach((reminder) => {
        const settings = state.reminderSettings[reminder.id]
        if (!settings?.enabled) return

        const intervalMs = Math.max((settings.interval || reminder.defaultInterval) * 60 * 1000, 1000)
        const lastFiredIso = state.lastFiredAt[reminder.id]

        if (!lastFiredIso) {
          // First time initialized: set initial timestamp to now so it fires after 1 interval
          state.setLastFired(reminder.id)
          return
        }

        const lastFiredTime = new Date(lastFiredIso).getTime()

        // Check if interval has elapsed since last fired time
        if (now - lastFiredTime >= intervalMs) {
          // Record new fired timestamp BEFORE sending to prevent double firing
          state.setLastFired(reminder.id)
          sendNotification(reminder)
        }
      })
    }

    // Run check immediately on mount
    checkReminders()

    // Ticker loop every 5 seconds
    timerRef.current = setInterval(checkReminders, 5000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, []) // no deps — everything reads from store directly, no stale closures

  return { requestPermission: () => Notification.requestPermission() }
}


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
  const intervalsRef = useRef({})

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

  // Core timer engine — subscribe directly to Zustand store (no stale closures)
  useEffect(() => {
    const clearAllTimers = () => {
      Object.values(intervalsRef.current).forEach(clearInterval)
      intervalsRef.current = {}
    }

    const sendNotification = (reminder) => {
      const state = useWellnessStore.getState()

      // Guard: work hours, snooze, global toggle
      if (!state.globalEnabled) return
      if (!state.isWithinWorkHours()) return
      if (state.isSnoozed()) return

      // Record fired time
      state.setLastFired(reminder.id)

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

    const setupTimers = () => {
      clearAllTimers()

      const state = useWellnessStore.getState()
      if (!state.globalEnabled) return

      WELLNESS_REMINDERS.forEach((reminder) => {
        const settings = state.reminderSettings[reminder.id]
        if (!settings?.enabled) return

        const intervalMs = Math.max(settings.interval * 60 * 1000, 1000) // minimum 1 second

        intervalsRef.current[reminder.id] = setInterval(() => {
          sendNotification(reminder)
        }, intervalMs)
      })
    }

    // Initial setup
    setupTimers()

    // Re-setup timers when relevant settings change
    const unsubscribe = useWellnessStore.subscribe((state, prevState) => {
      // Only react to settings/toggle/snooze changes, NOT lastFiredAt changes
      const settingsChanged =
        state.globalEnabled !== prevState.globalEnabled ||
        state.reminderSettings !== prevState.reminderSettings ||
        state.snoozedUntil !== prevState.snoozedUntil

      if (settingsChanged) {
        setupTimers()
      }
    })

    return () => {
      clearAllTimers()
      unsubscribe()
    }
  }, []) // no deps — everything reads from store directly, no stale closures

  return { requestPermission: () => Notification.requestPermission() }
}

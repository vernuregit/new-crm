import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import app, { db } from './firebaseService'
import { doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore'

let messaging = null

try {
  messaging = getMessaging(app)
} catch (err) {
  console.warn('FCM Messaging is not supported in this browser environment:', err)
}

const ANNOUNCEMENT_SOUND = '/sounds/announcement.wav'

export const ensureNotificationPermission = async () => {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export const unlockAnnouncementAudio = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    const audio = new Audio(ANNOUNCEMENT_SOUND)
    audio.volume = 0
    void audio.play().then(() => {
      audio.pause()
      audio.currentTime = 0
    }).catch(() => {})
  } catch {
    // ignore
  }
}

const isVapidConfigured = (vapidKey) =>
  Boolean(vapidKey) && vapidKey !== 'mock_vapid_key'

export const requestFcmToken = async (userId) => {
  if (!('Notification' in window)) return null

  try {
    const permission = await ensureNotificationPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied by user.')
      return null
    }

    if (!messaging || !('serviceWorker' in navigator)) return null

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!isVapidConfigured(vapidKey)) {
      console.warn('FCM VAPID key is not configured. Closed-tab push will not register.')
      return null
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration })

    if (currentToken && userId) {
      const userRef = doc(db, 'users', userId)
      await setDoc(userRef, { fcmTokens: arrayUnion(currentToken) }, { merge: true })
    }

    return currentToken
  } catch (err) {
    console.error('An error occurred while retrieving FCM token:', err)
    return null
  }
}

export const playAnnouncementChime = () => {
  const playOscillator = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.setValueAtTime(1174.7, now + 0.18)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.42)
    } catch {
      // ignore
    }
  }

  try {
    const audio = new Audio(ANNOUNCEMENT_SOUND)
    audio.volume = 0.7
    void audio.play().catch(playOscillator)
  } catch {
    playOscillator()
  }
}

const recentlyShown = new Set()
const suppressedAnnouncementIds = new Set()

export const closeAnnouncementNotification = (announcementId) => {
  if (!announcementId) return
  const id = String(announcementId)
  suppressedAnnouncementIds.add(id)
  const tag = `announcement-${id}`
  recentlyShown.add(tag)

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  void navigator.serviceWorker.ready
    .then((reg) => reg.getNotifications({ tag }))
    .then((list) => list.forEach((n) => n.close()))
    .catch(() => {})
}

export const showForegroundAnnouncementNotification = async (payload) => {
  const type = payload?.data?.type
  if (type === 'announcement_deleted') {
    closeAnnouncementNotification(payload?.data?.announcementId)
    return
  }

  const title = payload?.notification?.title || payload?.data?.title || 'New Announcement'
  const body = payload?.notification?.body || payload?.data?.body || payload?.data?.message || ''
  const link = payload?.data?.link || '/announcements'
  const announcementId = payload?.data?.announcementId ? String(payload.data.announcementId) : ''
  const tag = announcementId ? `announcement-${announcementId}` : `announcement-${title}`

  if (announcementId && suppressedAnnouncementIds.has(announcementId)) return

  if (announcementId) {
    try {
      const snap = await getDoc(doc(db, 'announcements', announcementId))
      if (!snap.exists()) {
        closeAnnouncementNotification(announcementId)
        return
      }
    } catch {
      // If the existence check fails, still show — inbox listener is the source of truth.
    }
  }

  if (recentlyShown.has(tag)) return
  recentlyShown.add(tag)
  setTimeout(() => recentlyShown.delete(tag), 30000)

  playAnnouncementChime()

  if (!('Notification' in window) || Notification.permission !== 'granted') return

  try {
    const notif = new Notification(title, {
      body,
      icon: '/halologo.png',
      tag,
      silent: false,
    })
    notif.onclick = () => {
      window.focus()
      window.location.assign(link)
      notif.close()
    }
    setTimeout(() => notif.close(), 12000)
  } catch {
    // Fallback: in-app bell still updates via Firestore.
  }
}

export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}

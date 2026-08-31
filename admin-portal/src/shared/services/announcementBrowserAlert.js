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

export const playAnnouncementChime = () => {
  const playOscillator = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') void ctx.resume()
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

export const showForegroundAnnouncementNotification = (payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'New Announcement'
  const body = payload?.notification?.body || payload?.data?.body || payload?.data?.message || ''
  const link = payload?.data?.link || '/announcements'
  const tag = payload?.data?.announcementId
    ? `announcement-${payload.data.announcementId}`
    : `announcement-${title}`

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
    // In-app bell still updates via Firestore.
  }
}

export const alertLocalAnnouncement = async ({ title, body, announcementId, link = '/announcements' }) => {
  await ensureNotificationPermission()
  showForegroundAnnouncementNotification({
    notification: { title: `📢 ${title || 'New Announcement'}`, body: body || '' },
    data: { type: 'announcement', announcementId: announcementId || '', link },
  })
}

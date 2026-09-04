/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBsh-MRa-bWa4TWiZCqjfrAPbTAI9OUz6w',
  authDomain: 'new-crm-8165a.firebaseapp.com',
  projectId: 'new-crm-8165a',
  storageBucket: 'new-crm-8165a.firebasestorage.app',
  messagingSenderId: '117596186378',
  appId: '1:117596186378:web:df32d18c50d6692ffabcf3',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const type = payload.data?.type
  const announcementId = payload.data?.announcementId || ''

  if (type === 'announcement_deleted' && announcementId) {
    const tag = `announcement-${announcementId}`
    return self.registration.getNotifications({ tag }).then((list) => {
      list.forEach((n) => n.close())
    })
  }

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    (type === 'payslip' ? 'Check your balance' : 'New Announcement')
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || ''
  const url = payload.data?.link || (type === 'payslip' ? '/payslips' : '/announcements')
  const tag =
    payload.data?.tag ||
    (type === 'payslip'
      ? `payslip-${payload.data?.itemId || title}`
      : announcementId
        ? `announcement-${announcementId}`
        : 'announcement')

  return self.registration.showNotification(title, {
    body,
    icon: '/halologo.png',
    tag,
    silent: false,
    data: { url },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/announcements'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (typeof client.navigate === 'function') {
            return client.navigate(target).then((c) => (c ? c.focus() : client.focus()))
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        const absolute = target.startsWith('http') ? target : `${self.location.origin}${target}`
        return self.clients.openWindow(absolute)
      }
      return undefined
    })
  )
})

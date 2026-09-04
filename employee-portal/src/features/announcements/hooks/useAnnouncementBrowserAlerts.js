import { useEffect } from 'react'
import { subscribeAnnouncementCreates } from '../services/announcementsService'
import {
  ensureNotificationPermission,
  onForegroundMessage,
  requestFcmToken,
  showForegroundAnnouncementNotification,
  closeAnnouncementNotification,
  unlockAnnouncementAudio,
} from '../../../shared/services/fcmService'

export const useAnnouncementBrowserAlerts = (userId) => {
  useEffect(() => {
    if (!userId) return undefined

    const unlock = () => {
      void ensureNotificationPermission()
      unlockAnnouncementAudio()
      void requestFcmToken(userId)
    }

    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    void requestFcmToken(userId)

    const unsubscribeFcm = onForegroundMessage((payload) => {
      const type = payload?.data?.type
      if (type === 'announcement_deleted') {
        closeAnnouncementNotification(payload?.data?.announcementId)
        return
      }
      if (type && type !== 'announcement' && type !== 'payslip') return
      void showForegroundAnnouncementNotification(payload)
    })

    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      unsubscribeFcm()
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined

    return subscribeAnnouncementCreates(
      (announcement) => {
        const preview = announcement.body?.length > 120
          ? `${announcement.body.slice(0, 120)}...`
          : (announcement.body || '')
        void showForegroundAnnouncementNotification({
          notification: {
            title: `📢 ${announcement.title || 'New Announcement'}`,
            body: preview,
          },
          data: {
            type: 'announcement',
            announcementId: announcement.id || '',
            link: '/announcements',
          },
        })
      },
      (announcementId) => {
        closeAnnouncementNotification(announcementId)
      }
    )
  }, [userId])
}

import { useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'
import { showForegroundBrowserNotification } from '../../../shared/services/fcmService'

export const usePayslipBrowserAlerts = (userId) => {
  useEffect(() => {
    if (!userId) return undefined

    let primed = false
    const q = query(
      collection(db, 'notifications', userId, 'items'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!primed) {
        primed = true
        return
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const data = change.doc.data() || {}
        if (data.type !== 'payslip') return

        void showForegroundBrowserNotification({
          notification: {
            title: data.title || 'Check your balance',
            body: data.message || 'Check your balance.',
          },
          data: {
            type: 'payslip',
            link: data.link || '/payslips',
            tag: `payslip-${change.doc.id}`,
          },
        })
      })
    })

    return () => unsubscribe()
  }, [userId])
}

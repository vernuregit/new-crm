import { create } from 'zustand'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  notificationsLoaded: false,
  isOpen: false,
  unsubscribe: null,

  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  fetchNotifications: (uid) => {
    if (!uid) return

    const { unsubscribe: currentUnsubscribe } = get()
    if (currentUnsubscribe) {
      currentUnsubscribe()
    }

    const notificationsRef = collection(db, 'notifications', uid, 'items')
    const q = query(notificationsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map((doc) => ({
        notificationId: doc.id,
        ...doc.data(),
      }))
      set({ notifications: fetchedNotifications, notificationsLoaded: true })
    })

    set({ unsubscribe, notificationsLoaded: false })
  },

  markAsRead: async (uid, notificationId) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      ),
    }))

    if (!uid) return
    try {
      const notifRef = doc(db, 'notifications', uid, 'items', notificationId)
      await updateDoc(notifRef, { isRead: true })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  },

  markAllAsRead: async (uid) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }))

    if (!uid) return
    try {
      const unreadNotifications = get().notifications.filter(n => !n.isRead)
      if (unreadNotifications.length === 0) return

      const batch = writeBatch(db)
      unreadNotifications.forEach((n) => {
        const notifRef = doc(db, 'notifications', uid, 'items', n.notificationId)
        batch.update(notifRef, { isRead: true })
      })
      await batch.commit()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  },

  addNotification: (newNotif) =>
    set((state) => ({
      notifications: [
        {
          notificationId: `notif_${Date.now()}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          type: 'info',
          ...newNotif,
        },
        ...state.notifications,
      ],
    })),
}))

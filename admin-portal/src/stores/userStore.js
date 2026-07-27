import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,             // Firebase Auth user object or demo user
      userDoc: null,          // Firestore /users/{uid} document
      claims: null,           // Decoded custom claims
      isLoading: false,
      setUser: (user, userDoc, claims) => set({ user, userDoc, claims, isLoading: false }),
      clearUser: () => set({ user: null, userDoc: null, claims: null, isLoading: false }),
    }),
    {
      name: 'business-os-user-auth',
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Organization } from '@hacksuite/shared'
import { apiClient } from '../api/client'

interface AuthState {
  user: User | null
  org: Organization | null
  accessToken: string | null
  isLoading: boolean
  setAuth: (user: User, org: Organization | null, token: string) => void
  setOrg: (org: Organization) => void
  setToken: (token: string) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      org: null,
      accessToken: null,
      isLoading: false,

      setAuth: (user, org, token) =>
        set({ user, org, accessToken: token, isLoading: false }),
      setOrg: (org) => set({ org }),
      setToken: (token) => set({ accessToken: token }),

      signOut: async () => {
        try {
          await apiClient.post('/auth/logout')
        } catch {
          // ignore errors on logout
        }
        set({ user: null, org: null, accessToken: null })
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, org: state.org }),
    }
  )
)

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Staff, ShiftLog } from '@/types'

// ── State shape ────────────────────────────────────────────
interface AuthState {
  token:           string | null
  staff:           Staff | null
  shiftLog:        ShiftLog | null
  isAuthenticated: boolean

  // Actions
  login:  (token: string, staff: Staff, shiftLog: ShiftLog) => void
  logout: () => void
  updateShiftLog: (shiftLog: ShiftLog) => void
}

// ── Store ──────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      staff:           null,
      shiftLog:        null,
      isAuthenticated: false,

      login: (token, staff, shiftLog) => {
        // Persist token to localStorage for axios interceptor
        localStorage.setItem('tablecall_token', token)
        set({
          token,
          staff,
          shiftLog,
          isAuthenticated: true,
        })
      },

      logout: () => {
        localStorage.removeItem('tablecall_token')
        localStorage.removeItem('tablecall_staff')
        set({
          token:           null,
          staff:           null,
          shiftLog:        null,
          isAuthenticated: false,
        })
      },

      updateShiftLog: (shiftLog) => {
        set({ shiftLog })
      },
    }),
    {
      name:    'tablecall_auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields (token is stored separately for axios)
      partialize: (state) => ({
        token:           state.token,
        staff:           state.staff,
        shiftLog:        state.shiftLog,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// ── Selectors ──────────────────────────────────────────────
export const selectToken        = (s: AuthState) => s.token
export const selectStaff        = (s: AuthState) => s.staff
export const selectShiftLog     = (s: AuthState) => s.shiftLog
export const selectIsAuth       = (s: AuthState) => s.isAuthenticated

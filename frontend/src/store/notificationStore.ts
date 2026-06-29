import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Notification, Toast, ToastVariant } from '@/types'

// ── Toast helpers ──────────────────────────────────────────
let toastIdCounter = 0
const genToastId = () => `toast_${Date.now()}_${toastIdCounter++}`

// ── State ──────────────────────────────────────────────────
interface NotificationState {
  // Map of tableId → Notification[] (pending notifications per table)
  pendingByTable: Record<number, Notification[]>

  // All pending notifications flat list
  allPending: Notification[]

  // Toast queue
  toasts: Toast[]

  // Total pending count (for badge)
  pendingCount: number

  // Actions
  setPendingNotifications:   (notifications: Notification[]) => void
  addNotification:           (notification: Notification) => void
  handleNotification:        (notificationId: number) => void
  removeNotification:        (notificationId: number) => void

  addToast:                  (opts: Omit<Toast, 'id' | 'createdAt'>) => string
  removeToast:               (id: string) => void
  markToastExiting:          (id: string) => void
}

// ── Store ──────────────────────────────────────────────────
export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    pendingByTable: {},
    allPending:     [],
    toasts:         [],
    pendingCount:   0,

    // Bulk set from API
    setPendingNotifications: (notifications) => {
      const byTable: Record<number, Notification[]> = {}
      for (const n of notifications) {
        if (!byTable[n.table_id]) byTable[n.table_id] = []
        byTable[n.table_id].push(n)
      }
      set({
        pendingByTable: byTable,
        allPending:     notifications,
        pendingCount:   notifications.length,
      })
    },

    // Add one notification (from WS event)
    addNotification: (notification) => {
      const { allPending, pendingByTable } = get()

      // Avoid duplicates
      if (allPending.some((n) => n.id === notification.id)) return

      const tableId   = notification.table_id
      const tableList = pendingByTable[tableId] ?? []

      const newAll     = [...allPending, notification]
      const newByTable = {
        ...pendingByTable,
        [tableId]: [...tableList, notification],
      }

      set({
        allPending:     newAll,
        pendingByTable: newByTable,
        pendingCount:   newAll.length,
      })
    },

    // Mark notification as handled (from WS event or user action)
    handleNotification: (notificationId) => {
      const { allPending, pendingByTable } = get()

      const target  = allPending.find((n) => n.id === notificationId)
      if (!target) return

      const newAll = allPending.filter((n) => n.id !== notificationId)

      const tableId    = target.table_id
      const tableList  = (pendingByTable[tableId] ?? []).filter((n) => n.id !== notificationId)
      const newByTable = { ...pendingByTable, [tableId]: tableList }

      if (tableList.length === 0) {
        delete newByTable[tableId]
      }

      set({
        allPending:     newAll,
        pendingByTable: newByTable,
        pendingCount:   newAll.length,
      })
    },

    // Remove (e.g. cancelled)
    removeNotification: (notificationId) => {
      get().handleNotification(notificationId)
    },

    // ── Toast management ─────────────────────────────────

    addToast: (opts) => {
      const id: string = genToastId()
      const toast: Toast = {
        ...opts,
        id,
        createdAt: Date.now(),
        duration:  opts.duration ?? 5_000,
        exiting:   false,
      }
      set((state) => ({ toasts: [...state.toasts, toast] }))
      return id
    },

    markToastExiting: (id) => {
      set((state) => ({
        toasts: state.toasts.map((t) =>
          t.id === id ? { ...t, exiting: true } : t,
        ),
      }))
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    },
  })),
)

// ── Helpers ────────────────────────────────────────────────
export const notificationTypeLabel = (type: string): string => {
  switch (type) {
    case 'call_staff':    return 'เรียกพนักงาน'
    case 'request_bill':  return 'เช็คบิล'
    default:              return type
  }
}

export const notificationTypeVariant = (type: string): ToastVariant => {
  switch (type) {
    case 'call_staff':    return 'calling'
    case 'request_bill':  return 'bill'
    default:              return 'info'
  }
}

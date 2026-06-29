import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { apiGet, endpoints } from '@/lib/api'
import { wsClient } from '@/lib/ws-client'
import type { WsStatus } from '@/lib/ws-client'
import { useToast } from '@/components/ui/Toast'
import FloorView from '@/components/floor-view/FloorView'
import BottomNav from '@/components/staff/BottomNav'
import ShiftTimer from '@/components/staff/ShiftTimer'
import ToastContainer from '@/components/ui/Toast'
import type { RestaurantTable, Notification, WsMessage, WsNotificationCreatedData, WsNotificationHandledData } from '@/types'
import clsx from 'clsx'

export default function Dashboard() {
  const navigate            = useNavigate()
  const staff               = useAuthStore((s) => s.staff)
  const token               = useAuthStore((s) => s.token)
  const { addNotification, handleNotification, setPendingNotifications } = useNotificationStore()
  const queryClient         = useQueryClient()
  const toast               = useToast()

  // ── WS status indicator state ───────────────────────
  const [wsStatus, setWsStatus] = useState<WsStatus>(wsClient.getStatus())

  useEffect(() => {
    const unsub = wsClient.onStatus(setWsStatus)
    return () => unsub()
  }, [])

  // ── Fetch tables ─────────────────────────────────────
  const { data: tables = [], isLoading: tablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ['tables'],
    queryFn:  () => apiGet<RestaurantTable[]>(endpoints.tables),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // ── Fetch pending notifications ───────────────────────
  const { data: pendingNotifications } = useQuery<Notification[]>({
    queryKey: ['notifications', 'pending'],
    queryFn:  () => apiGet<Notification[]>(endpoints.notifications, { status: 'pending' }),
    staleTime: 15_000,
  })

  // Seed notification store when data arrives
  useEffect(() => {
    if (pendingNotifications) {
      setPendingNotifications(pendingNotifications)
    }
  }, [pendingNotifications, setPendingNotifications])

  // ── WebSocket ─────────────────────────────────────────
  const handleWsMessage = useCallback((msg: any) => {
    const type = msg.type || msg.event
    switch (type) {
      case 'notification.created': {
        const { notification } = msg.data as WsNotificationCreatedData
        addNotification(notification)
        toast.toastNotification(notification.type, notification.table_number, notification.table_label)
        // Invalidate tables to refresh status
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        break
      }
      case 'notification.handled': {
        const data = msg.data as any
        const notification = data.notification
        const staffName = data.staff_name
        handleNotification(notification.id)
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
        toast.toastSuccess(`รับเรื่องโต๊ะ ${notification.table_number || notification.table?.number} แล้ว`, `รับโดย ${staffName}`)
        break
      }
      case 'notification.cancelled': {
        const data = msg.data as { notification_id: number }
        handleNotification(data.notification_id)
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        break
      }
      case 'table.status_changed': {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        break
      }
      case 'staff.logged_in': {
        const data = msg.data as any
        if (staff?.role === 'admin') {
          // Add a simple string toast for admin
          toast.toastInfo(
            `พนักงานเข้าสู่ระบบ`,
            `✅ พนักงาน ${data.staff_name} ได้เข้าสู่ระบบแล้ว`
          )
        }
        break
      }
    }
  }, [addNotification, handleNotification, queryClient, toast, staff])

  useEffect(() => {
    if (!token) return
    wsClient.connect(token)
    const unsub = wsClient.onMessage(handleWsMessage)
    return () => {
      unsub()
      wsClient.disconnect()
    }
  }, [token, handleWsMessage])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-50/90 backdrop-blur-xl border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          {/* Left: App name */}
          <div>
            <h1 className="font-kanit font-bold text-xl text-gray-900 leading-none">
              Table<span className="text-amber-400">Call</span>
            </h1>
            <p className="font-sarabun text-gray-500 text-xs mt-0.5 leading-none">
              แดชบอร์ดพนักงาน
            </p>
          </div>

          {/* Center: WS status */}
          <div className="flex items-center gap-1.5">
            <div
              className={clsx(
                'w-1.5 h-1.5 rounded-full',
                wsStatus === 'connected'   && 'bg-emerald-400 animate-pulse',
                wsStatus === 'connecting'  && 'bg-amber-400 animate-pulse',
                wsStatus === 'disconnected'&& 'bg-zinc-600',
                wsStatus === 'error'       && 'bg-red-500 animate-pulse',
              )}
            />
            <span className="font-sarabun text-[10px] text-gray-400">
              {wsStatus === 'connected'    && 'เชื่อมต่อแล้ว'}
              {wsStatus === 'connecting'   && 'กำลังเชื่อมต่อ'}
              {wsStatus === 'disconnected' && 'ออฟไลน์'}
              {wsStatus === 'error'        && 'ขัดข้อง'}
            </span>
          </div>

          {/* Right: Staff + timer */}
          <div className="flex items-center gap-2">
            {staff?.role === 'admin' && (
              <button
                onClick={() => navigate('/staff/manage')}
                className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/50 flex items-center justify-center transition-colors hover:bg-amber-500/30"
                title="จัดการพนักงาน"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            )}
            <ShiftTimer compact />
            <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-xl">
              {staff?.emoji ?? '👤'}
            </div>
          </div>
        </div>
      </header>

      {/* Floor view */}
      <main className="max-w-lg mx-auto">
        <FloorView tables={tables} loading={tablesLoading} />
      </main>

      {/* Bottom nav */}
      <BottomNav />

      {/* Toast container */}
      <ToastContainer />
    </div>
  )
}

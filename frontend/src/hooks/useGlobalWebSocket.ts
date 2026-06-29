import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { wsClient } from '@/lib/ws-client'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import type { WsNotificationCreatedData } from '@/types'

export default function useGlobalWebSocket() {
  const token = useAuthStore((s) => s.token)
  const staff = useAuthStore((s) => s.staff)
  const toast = useToast()
  const queryClient = useQueryClient()
  const { addNotification, handleNotification } = useNotificationStore()

  const handleWsMessage = useCallback((msg: any) => {
    const type = msg.type || msg.event
    switch (type) {
      case 'notification.created': {
        const { notification } = msg.data as WsNotificationCreatedData
        addNotification(notification)
        toast.toastNotification(notification.type, notification.table_number)
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
          // Toast for admin
          toast.toastInfo(
            `พนักงานเข้าสู่ระบบ`,
            `✅ พนักงาน ${data.staff_name} ได้เข้าสู่ระบบแล้ว`
          )
          // Invalidate shift logs to show new active staff in real-time
          queryClient.invalidateQueries({ queryKey: ['admin-shift-logs'] })
          queryClient.invalidateQueries({ queryKey: ['admin', 'shifts'] })
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
}

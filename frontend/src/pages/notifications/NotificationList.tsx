import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, endpoints } from '@/lib/api'
import { useNotificationStore, notificationTypeLabel } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import ToastContainer from '@/components/ui/Toast'
import BottomNav from '@/components/staff/BottomNav'
import type { Notification } from '@/types'
import clsx from 'clsx'

// ── Time ago helper ────────────────────────────────────────
function useTimeAgo(dateStr: string) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    const calc = () => {
      const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
      if (s < 60)   return setLabel(`${s} วิ`)
      if (s < 3600) return setLabel(`${Math.floor(s / 60)} นาที`)
      return setLabel(`${Math.floor(s / 3600)} ชม.`)
    }
    calc()
    const id = setInterval(calc, 10_000)
    return () => clearInterval(id)
  }, [dateStr])
  return label
}

// ── Notification row ───────────────────────────────────────
function NotificationRow({
  notification,
  onHandle,
  isHandling,
}: {
  notification: Notification
  onHandle:     (id: number) => void
  isHandling:   boolean
}) {
  const timeAgo  = useTimeAgo(notification.created_at)
  const isCall   = notification.type === 'call_staff'
  const typeIcon  = isCall ? '🔔' : '💳'
  const typeLabel = notificationTypeLabel(notification.type)
  const [exiting, setExiting] = useState(false)

  const handleClick = () => {
    setExiting(true)
    setTimeout(() => onHandle(notification.id), 280)
  }

  return (
    <div
      className={clsx(
        'glass-card border rounded-2xl p-4',
        'transition-all duration-300',
        isCall  ? 'border-amber-500/40 bg-amber-950/30' : 'border-emerald-500/40 bg-emerald-950/30',
        exiting && 'opacity-0 scale-95 translate-x-4',
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={clsx(
            'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
            isCall ? 'bg-amber-500/20 animate-pulse-amber' : 'bg-emerald-500/20 animate-pulse-green',
          )}
        >
          {typeIcon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-kanit font-bold text-gray-900 text-base leading-tight">
                โต๊ะ {notification.table_number}
              </p>
              {notification.table_label && (
                <p className="font-sarabun text-gray-500 text-xs">{notification.table_label}</p>
              )}
            </div>
            <span className="font-sarabun text-gray-500 text-xs flex-shrink-0">{timeAgo}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-kanit font-semibold',
                isCall
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400',
              )}
            >
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Handle button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isHandling || exiting}
          className={clsx(
            'flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center',
            'transition-all duration-200 active:scale-90',
            'font-kanit font-bold text-sm',
            isHandling
              ? 'bg-zinc-700 text-gray-500 cursor-wait'
              : 'bg-emerald-500 hover:bg-emerald-400 text-gray-900 shadow-glow-green',
          )}
          aria-label="รับเรื่อง"
        >
          {isHandling ? (
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Shift log row (Admin only) ─────────────────────────────
function ShiftLogRow({ log }: { log: any }) {
  const clockIn  = new Date(log.clock_in)
  const clockOut = log.clock_out ? new Date(log.clock_out) : null
  const isActive = !log.clock_out

  const fmt = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })

  const durationStr = (() => {
    if (log.duration_minutes === null || log.duration_minutes === undefined) return null
    const h = Math.floor(log.duration_minutes / 60)
    const m = log.duration_minutes % 60
    return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
  })()

  return (
    <div className="glass-card border border-gray-200 rounded-2xl p-3.5 flex items-center gap-3">
      {/* Avatar / emoji */}
      <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
        {log.staff_emoji ?? '👤'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-kanit font-semibold text-gray-900 text-sm">{log.staff_name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="font-sarabun text-gray-600 text-xs">
            เข้า {fmt(clockIn)} น.
          </span>
          {clockOut ? (
            <span className="font-sarabun text-gray-600 text-xs">
              ออก {fmt(clockOut)} น.
            </span>
          ) : (
            <span className="font-sarabun text-emerald-500 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              ทำงานอยู่
            </span>
          )}
          {durationStr && (
            <span className="font-sarabun text-gray-500 text-xs">({durationStr})</span>
          )}
        </div>
      </div>

      {isActive ? (
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-kanit text-xs">
          Online
        </span>
      ) : (
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-300 text-gray-500 font-kanit text-xs">
          ออกงานแล้ว
        </span>
      )}
    </div>
  )
}

// ── Today's date helper ────────────────────────────────────
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Main page ──────────────────────────────────────────────
export default function NotificationList() {
  const location      = useLocation()
  const queryClient   = useQueryClient()
  const toast         = useToast()
  const staff         = useAuthStore((s) => s.staff)
  const isAdmin       = staff?.role === 'admin'

  const filterTableId = (location.state as { filterTableId?: number } | null)?.filterTableId

  const { allPending, handleNotification } = useNotificationStore()

  // ── Table notification query ────────────────────────────
  const { isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', 'pending'],
    queryFn:  () => apiGet<Notification[]>(endpoints.notifications, { status: 'pending' }),
    staleTime: 10_000,
    refetchInterval: 20_000,
  })

  // ── Handle mutation ─────────────────────────────────────
  const [handlingIds, setHandlingIds] = useState<Set<number>>(new Set())

  const mutation = useMutation<void, Error, number>({
    mutationFn: (id) => apiPost(endpoints.notificationHandle(id)),
    onMutate: (id) => {
      setHandlingIds((prev) => new Set([...prev, id]))
    },
    onSuccess: (_, id) => {
      handleNotification(id)
      setHandlingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
      toast.toastSuccess('รับเรื่องเรียบร้อย')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (_, id) => {
      setHandlingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
      toast.toastError('เกิดข้อผิดพลาด', 'ไม่สามารถรับเรื่องได้')
    },
  })

  const handleAction = useCallback((id: number) => {
    mutation.mutate(id)
  }, [mutation])

  // ── Filter & sort notifications ─────────────────────────
  const displayed = filterTableId
    ? allPending.filter((n) => n.table_id === filterTableId)
    : allPending

  const sorted = [...displayed].sort((a, b) => {
    if (a.type === 'call_staff' && b.type !== 'call_staff') return -1
    if (b.type === 'call_staff' && a.type !== 'call_staff') return 1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  // ── Admin: Shift log state ──────────────────────────────
  const [shiftDate, setShiftDate] = useState(() => todayISO())
  const [feedbackDate, setFeedbackDate] = useState(() => todayISO())

  const { data: shiftLogs = [], isLoading: shiftLoading } = useQuery<any[]>({
    queryKey: ['admin-shift-logs', shiftDate],
    queryFn:  () => apiGet<any[]>(endpoints.adminShiftLogs, { date: shiftDate }),
    enabled:  isAdmin,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
  const authToken = localStorage.getItem('tablecall_token') ?? ''

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header (Fixed) */}
      <header className="shrink-0 z-40 bg-gray-50/90 backdrop-blur-xl border-b border-gray-200 h-16 flex items-center">
        <div className="flex items-center justify-between px-4 w-full max-w-lg mx-auto">
          <div>
            <h1 className="font-kanit font-bold text-xl text-gray-900">การแจ้งเตือน</h1>
            {filterTableId && (
              <p className="font-sarabun text-amber-400 text-xs">กรองตามโต๊ะ</p>
            )}
          </div>

          {sorted.length > 0 && (
            <span className="bg-amber-500 text-black font-kanit font-bold text-sm px-3 py-1 rounded-full">
              {sorted.length} รายการ
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area (Fills remaining height) */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col min-h-0 pt-4">
        
        {/* ── SECTION 1: Table notifications ─────────────── */}
        <section className="flex-1 flex flex-col min-h-0 border-b border-gray-200">
          {/* Section 1 Header (Fixed) */}
          <div className="shrink-0 bg-gray-50 py-3 px-4 shadow-sm z-10 flex items-center">
            <h2 className="font-kanit font-semibold text-gray-700 text-sm">
              🔔 คำร้องจากโต๊ะ
            </h2>
          </div>

          {/* Section 1 Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Loading skeleton */}
            {isLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="w-16 h-16 rounded-3xl bg-gray-200 flex items-center justify-center text-3xl">
                  🎉
                </div>
                <div className="text-center">
                  <p className="font-kanit text-gray-900 font-semibold text-base">
                    ไม่มีคำร้องค้างอยู่
                  </p>
                  <p className="font-sarabun text-gray-500 text-sm mt-1">
                    {filterTableId ? 'โต๊ะนี้ไม่มีคำร้อง' : 'ทุกโต๊ะเรียบร้อยแล้ว'}
                  </p>
                </div>
              </div>
            )}

            {/* Notification list */}
            {!isLoading && sorted.length > 0 && (
              <div className="flex flex-col gap-3">
                {sorted.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onHandle={handleAction}
                    isHandling={handlingIds.has(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 2: Staff status (Admin only) ─────── */}
        {isAdmin && (
          <section className="flex-1 flex flex-col min-h-0 bg-gray-50 pt-6">
            {/* Section 2 Header (Fixed) */}
            <div className="shrink-0 bg-gray-50 py-3 px-4 shadow-sm z-10 flex items-center justify-between">
              <h2 className="font-kanit font-semibold text-gray-700 text-sm">
                👥 สถานะพนักงานวันนี้
              </h2>
              <span className="font-sarabun text-gray-500 text-xs bg-gray-200 px-2 py-0.5 rounded-md">
                {shiftLogs.filter((log: any, index: number, self: any[]) => self.findIndex(l => l.staff_id === log.staff_id) === index).length} คน
              </span>
            </div>

            {/* Section 2 Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 pb-20">
              {shiftLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : shiftLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="font-sarabun text-gray-400 text-sm">ไม่มีข้อมูลการเข้างานในวันนี้</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {shiftLogs.filter((log: any, index: number, self: any[]) => self.findIndex(l => l.staff_id === log.staff_id) === index).map((log: any) => (
                    <ShiftLogRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </main>

      <div className="shrink-0">
        <BottomNav />
      </div>
      <ToastContainer />
    </div>
  )
}

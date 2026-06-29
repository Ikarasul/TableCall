import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useNotificationStore } from '@/store/notificationStore'
import { notificationTypeLabel } from '@/store/notificationStore'
import type { Toast as ToastType } from '@/types'
import clsx from 'clsx'

// ── Single Toast Item ──────────────────────────────────────
function ToastItem({ toast }: { toast: ToastType }) {
  const { markToastExiting, removeToast } = useNotificationStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startExit = useCallback(() => {
    markToastExiting(toast.id)
    setTimeout(() => removeToast(toast.id), 320)
  }, [toast.id, markToastExiting, removeToast])

  useEffect(() => {
    timerRef.current = setTimeout(startExit, toast.duration ?? 5_000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, toast.duration, startExit])

  const variantStyles = {
    calling: 'border-amber-500/60 bg-amber-500/10',
    bill:    'border-emerald-500/60 bg-emerald-500/10',
    success: 'border-emerald-500/60 bg-emerald-500/10',
    error:   'border-red-500/60 bg-red-500/10',
    info:    'border-zinc-500/60 bg-zinc-500/10',
  }

  const iconStyles = {
    calling: 'text-amber-400',
    bill:    'text-emerald-400',
    success: 'text-emerald-400',
    error:   'text-red-400',
    info:    'text-gray-600',
  }

  const dotStyles = {
    calling: 'bg-amber-400',
    bill:    'bg-emerald-400',
    success: 'bg-emerald-400',
    error:   'bg-red-400',
    info:    'bg-zinc-400',
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'relative w-80 max-w-[calc(100vw-2rem)]',
        'glass-card border rounded-2xl px-4 py-3',
        'cursor-pointer select-none',
        'transition-all duration-300',
        toast.exiting ? 'animate-slide-out-right opacity-0' : 'animate-slide-in-right',
        variantStyles[toast.variant],
      )}
      onClick={startExit}
    >
      {/* Progress bar */}
      <div
        className={clsx('absolute bottom-0 left-0 h-0.5 rounded-full', dotStyles[toast.variant])}
        style={{
          animation: `shrinkWidth ${toast.duration ?? 5000}ms linear forwards`,
          width: '100%',
        }}
      />

      <div className="flex items-start gap-3">
        {/* Emoji / Icon */}
        <div className={clsx('text-2xl flex-shrink-0 mt-0.5', iconStyles[toast.variant])}>
          {toast.emoji ?? (toast.variant === 'calling' ? '🔔' : toast.variant === 'bill' ? '💳' : '📢')}
        </div>

        <div className="flex-1 min-w-0">
          {/* Dot indicator + title */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', dotStyles[toast.variant])} />
            <p className="font-kanit font-semibold text-gray-900 text-sm truncate">
              {toast.title}
            </p>
          </div>

          {toast.body && (
            <p className="font-sarabun text-gray-600 text-xs leading-relaxed line-clamp-2">
              {toast.body}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); startExit() }}
          className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 -mt-0.5 -mr-1 p-1"
          aria-label="ปิด"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// ── Toast Container ────────────────────────────────────────
export default function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      aria-label="การแจ้งเตือน"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}

// ── Hook to fire toasts easily ─────────────────────────────
import { playNotificationSound } from '@/lib/audio'

export function useToast() {
  const { addToast } = useNotificationStore()

  return useMemo(() => ({
    toastCalling: (tableLabel: string, tableNumber: string) => {
      playNotificationSound()
      addToast({
        variant: 'calling',
        title:   `โต๊ะ ${tableNumber} เรียกพนักงาน`,
        body:    tableLabel,
        emoji:   '🔔',
      })
    },

    toastBill: (tableLabel: string, tableNumber: string) => {
      playNotificationSound()
      addToast({
        variant: 'bill',
        title:   `โต๊ะ ${tableNumber} ขอเช็คบิล`,
        body:    tableLabel,
        emoji:   '💳',
      })
    },

    toastSuccess: (title: string, body?: string) =>
      addToast({ variant: 'success', title, body, emoji: '✅' }),

    toastError: (title: string, body?: string) =>
      addToast({ variant: 'error', title, body, emoji: '❌', duration: 7_000 }),

    toastInfo: (title: string, body?: string) => {
      playNotificationSound()
      addToast({ variant: 'info', title, body })
    },

    toastNotification: (type: string, tableNumber: string, tableLabel?: string) => {
      playNotificationSound()
      const label = notificationTypeLabel(type)
      if (type === 'call_staff') {
        addToast({
          variant: 'calling',
          title:   `โต๊ะ ${tableNumber} – ${label}`,
          body:    tableLabel,
          emoji:   '🔔',
        })
      } else {
        addToast({
          variant: 'bill',
          title:   `โต๊ะ ${tableNumber} – ${label}`,
          body:    tableLabel,
          emoji:   '💳',
        })
      }
    },
  }), [addToast])
}

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, endpoints } from '@/lib/api'
import type { TableInfo, CustomerActionResult, RecentRequest, NotificationType } from '@/types'
import clsx from 'clsx'

// ── Cooldown hook ──────────────────────────────────────────
function useCooldown(cooldownUntil: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!cooldownUntil) { setSecondsLeft(0); return }

    const calc = () => {
      const remaining = Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 1000)
      setSecondsLeft(Math.max(0, remaining))
    }

    calc()
    const id = setInterval(calc, 500)
    return () => clearInterval(id)
  }, [cooldownUntil])

  return secondsLeft
}

// ── Action button ──────────────────────────────────────────
interface ActionButtonProps {
  type:           NotificationType
  icon:           string
  label:          string
  sublabel:       string
  colorClass:     string
  glowClass:      string
  bgClass:        string
  borderClass:    string
  cooldownUntil:  string | null
  disabled:       boolean
  onPress:        (type: NotificationType) => void
}

function ActionButton({
  type, icon, label, sublabel,
  colorClass, glowClass, bgClass, borderClass,
  cooldownUntil, disabled, onPress,
}: ActionButtonProps) {
  const secondsLeft = useCooldown(cooldownUntil)
  const isCooling   = secondsLeft > 0
  const isDisabled  = disabled || isCooling
  const [pressed, setPressed] = useState(false)

  const handlePress = () => {
    if (isDisabled) return
    setPressed(true)
    setTimeout(() => setPressed(false), 300)
    onPress(type)
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={isDisabled}
      className={clsx(
        'flex-1 flex flex-col items-center justify-center gap-4',
        'rounded-3xl border-2 p-6 min-h-[220px]',
        'transition-all duration-300 active:scale-95',
        'no-tap-highlight relative overflow-hidden',
        bgClass,
        borderClass,
        isDisabled ? 'opacity-70 cursor-not-allowed' : [glowClass, 'hover:brightness-110'],
        pressed && 'scale-95',
      )}
      aria-label={label}
    >
      {/* Ripple effect overlay */}
      {pressed && (
        <div className="absolute inset-0 bg-gray-100 animate-ping rounded-3xl" />
      )}

      {/* Cooling overlay */}
      {isCooling && (
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center rounded-3xl gap-2 z-10">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <span className="font-kanit text-gray-900 font-bold text-lg">{secondsLeft}</span>
          <span className="font-sarabun text-gray-900/70 text-sm">วินาที</span>
        </div>
      )}

      {/* Icon */}
      <div
        className={clsx(
          'text-7xl leading-none transition-transform duration-200',
          !isDisabled && 'group-hover:scale-110',
        )}
      >
        {icon}
      </div>

      {/* Label */}
      <div className="text-center z-10">
        <p className={clsx('font-kanit font-bold text-2xl', colorClass)}>
          {label}
        </p>
        <p className={clsx("font-sarabun text-sm mt-1", colorClass.includes('text-white') ? 'text-white/90' : 'text-gray-900/60')}>
          {isCooling ? `รอ ${secondsLeft} วินาที` : sublabel}
        </p>
      </div>
    </button>
  )
}

// ── Recent request item ────────────────────────────────────
function RecentItem({ req }: { req: RecentRequest }) {
  const typeLabel = req.type === 'call_staff' ? 'เรียกพนักงาน' : 'เช็คบิล'
  const typeIcon  = req.type === 'call_staff' ? '🔔' : '💳'
  const timeAgo   = (() => {
    const s = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 1000)
    if (s < 60)  return `${s} วินาทีที่แล้ว`
    if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`
    return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`
  })()

  const statusColor = req.status === 'handled' ? 'text-emerald-400' : req.status === 'pending' ? 'text-amber-400' : 'text-gray-500'
  const statusLabel = req.status === 'handled' ? 'รับเรื่องแล้ว' : req.status === 'pending' ? 'รอดำเนินการ' : 'ยกเลิก'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xl">{typeIcon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-sarabun text-gray-900 text-sm">{typeLabel}</p>
        <p className="font-sarabun text-gray-500 text-xs">{timeAgo}</p>
      </div>
      <span className={clsx('font-sarabun text-xs font-medium', statusColor)}>
        {statusLabel}
      </span>
    </div>
  )
}

// ── Feedback form ──────────────────────────────────────────
function FeedbackForm({ qrToken }: { qrToken: string }) {
  const [rating, setRating] = useState(0)
  const [suggestions, setSuggestions] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  const mutation = useMutation({
    mutationFn: (data: any) => apiPost(endpoints.customerFeedback(qrToken), data),
    onSuccess: () => setSubmitted(true)
  })

  if (submitted) {
    return (
      <div className="mx-4 mt-6 glass-card p-6 rounded-2xl border border-gray-200 text-center animate-in fade-in zoom-in">
        <div className="text-4xl mb-2">💖</div>
        <h3 className="font-kanit font-semibold text-gray-900">ขอบคุณสำหรับคำติชม</h3>
        <p className="font-sarabun text-gray-600 text-sm mt-1">เราจะนำไปพัฒนาการบริการให้ดียิ่งขึ้น</p>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-6 glass-card p-5 rounded-2xl border border-gray-200">
      <h3 className="font-kanit font-semibold text-gray-900 mb-3 text-center">ให้คะแนนความพึงพอใจ</h3>
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={clsx(
              "text-3xl transition-transform hover:scale-110 active:scale-95",
              rating >= star ? "" : "grayscale opacity-30"
            )}
          >
            ⭐
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            placeholder="พิมพ์ข้อเสนอแนะที่นี่ (ถ้ามี)..."
            className="w-full bg-white border-2 border-amber-100 rounded-xl p-3 font-sarabun text-gray-900 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 min-h-[80px] resize-none mb-3 shadow-inner"
          />
          <button
            onClick={() => mutation.mutate({ rating, suggestions })}
            disabled={mutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-kanit font-semibold rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/30"
          >
            {mutation.isPending ? 'กำลังส่ง...' : 'ส่งข้อเสนอแนะ'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function CustomerActions() {
  const { qrToken }  = useParams<{ qrToken: string }>()
  const location     = useLocation()
  const queryClient  = useQueryClient()

  const tableInfo = (location.state as { tableInfo?: TableInfo } | null)?.tableInfo

  // Cooldown state per type
  const [callCooldown, setCallCooldown] = useState<string | null>(null)
  const [billCooldown, setBillCooldown] = useState<string | null>(null)
  const [pendingType,  setPendingType]  = useState<NotificationType | null>(null)
  const [successMsg,   setSuccessMsg]   = useState('')
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch table info if not in state
  const { data: fetchedTable } = useQuery<TableInfo>({
    queryKey: ['table-info', qrToken],
    queryFn:  () => apiGet<TableInfo>(endpoints.tableByToken(qrToken!)),
    enabled:  !!qrToken && !tableInfo,
    staleTime: Infinity,
  })

  const table = tableInfo ?? fetchedTable

  // Fetch recent requests
  const { data: recentRequests } = useQuery<RecentRequest[]>({
    queryKey: ['customer-recent', qrToken],
    queryFn:  () => apiGet<any>(endpoints.customerRecent(qrToken!)).then(res => res.recent_notifications || []),
    enabled:  !!qrToken,
    refetchInterval: 15_000,
  })

  // Mutation
  const mutation = useMutation<CustomerActionResult, Error, NotificationType>({
    mutationFn: (type) =>
      apiPost<CustomerActionResult>(endpoints.customerAction(qrToken!), { kind: type }),
    onSuccess: (data) => {
      // Set cooldown
      if (data.cooldown_until) {
        if (pendingType === 'call_staff') setCallCooldown(data.cooldown_until)
        if (pendingType === 'request_bill') setBillCooldown(data.cooldown_until)
      }

      // Show brief success message
      const msg = pendingType === 'call_staff' ? 'ส่งคำร้องเรียกพนักงานแล้ว ✓' : 'ส่งคำร้องเช็คบิลแล้ว ✓'
      setSuccessMsg(msg)
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccessMsg(''), 3000)

      queryClient.invalidateQueries({ queryKey: ['customer-recent', qrToken] })
      setPendingType(null)
    },
    onError: () => {
      setPendingType(null)
    },
  })

  const handleAction = useCallback((type: NotificationType) => {
    // Note: The backend expects "call" or "bill", our frontend uses "call_staff" or "request_bill"
    // We map it here.
    const kind = type === 'call_staff' ? 'call' : 'bill'
    setPendingType(type)
    mutation.mutate(kind as any)
  }, [mutation])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-6 px-6 text-center relative">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/8 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="font-kanit font-bold text-2xl text-gray-900">
            {table?.restaurant_name ?? 'TableCall'}
          </h1>
          {table && (
            <div className="mt-2 inline-flex items-center gap-2 glass-card px-4 py-1.5 rounded-full border border-amber-500/20">
              <span className="text-amber-400">🪑</span>
              <span className="font-kanit text-gray-900 font-semibold">โต๊ะ {table.table_number || table.number}</span>
              {table.seats && (
                <span className="font-sarabun text-gray-500 text-sm">{table.seats} ที่นั่ง</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Success banner */}
      {successMsg && (
        <div className="mx-4 mb-2 glass-card border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 rounded-2xl animate-scale-in">
          <p className="font-kanit text-emerald-400 text-center font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex-1 flex flex-col gap-4 px-4 py-2">
        <div className="flex gap-4 flex-1">
          <ActionButton
            type="call_staff"
            icon="🔔"
            label="เรียกพนักงาน"
            sublabel="กดเพื่อเรียกพนักงาน"
            colorClass="text-white"
            glowClass="shadow-xl shadow-amber-500/30"
            bgClass="bg-gradient-to-br from-amber-400 to-orange-500"
            borderClass="border-amber-400"
            cooldownUntil={callCooldown}
            disabled={mutation.isPending && pendingType === 'call_staff'}
            onPress={handleAction}
          />
        </div>

        <div className="flex gap-4 flex-1">
          <ActionButton
            type="request_bill"
            icon="💳"
            label="เช็คบิล"
            sublabel="กดเพื่อขอใบเสร็จ"
            colorClass="text-white"
            glowClass="shadow-xl shadow-emerald-500/30"
            bgClass="bg-gradient-to-br from-emerald-400 to-teal-500"
            borderClass="border-emerald-400"
            cooldownUntil={billCooldown}
            disabled={mutation.isPending && pendingType === 'request_bill'}
            onPress={handleAction}
          />
        </div>
      </div>

      {qrToken && <FeedbackForm qrToken={qrToken} />}

      {/* Recent requests */}
      {recentRequests && recentRequests.length > 0 && (
        <div className="mx-4 mt-6 mb-8 glass-card p-4 rounded-2xl border border-gray-200">
          <h3 className="font-kanit text-gray-600 text-sm font-semibold mb-2">
            ประวัติล่าสุด
          </h3>
          {recentRequests.slice(0, 5).map((req) => (
            <RecentItem key={req.id || req.created_at} req={req} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="py-4 text-center">
        <p className="font-sarabun text-zinc-700 text-xs">
          TableCall • ระบบเรียกพนักงาน
        </p>
      </div>
    </div>
  )
}

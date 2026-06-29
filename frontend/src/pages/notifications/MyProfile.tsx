import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { apiGet, apiPost, endpoints } from '@/lib/api'
import ShiftTimer from '@/components/staff/ShiftTimer'
import BottomNav from '@/components/staff/BottomNav'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import type { StaffStats } from '@/types'
import clsx from 'clsx'

// ── Confirm logout dialog ──────────────────────────────────
function LogoutDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card border border-red-500/30 bg-zinc-900 rounded-3xl p-6 w-full max-w-sm animate-scale-in shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 drop-shadow-md">🚪</div>
          <h3 className="font-kanit font-bold text-xl text-gray-50">ออกงานวันนี้?</h3>
          <p className="font-sarabun text-gray-400 text-sm mt-2 leading-relaxed">
            ระบบจะบันทึกเวลาออกงาน
            <br />และออกจากระบบ
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="btn-red py-4 text-lg w-full font-kanit font-semibold shadow-lg shadow-red-500/20"
          >
            ✓ ยืนยัน ออกงาน
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-4 text-lg w-full font-kanit font-semibold text-gray-400 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-colors"
          >
            ยังอยู่ต่อ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="glass-card border border-gray-200 p-4 rounded-2xl flex flex-col gap-2">
      <span className="text-2xl">{icon}</span>
      <p className={clsx('font-kanit font-bold text-2xl', color)}>{value}</p>
      <p className="font-sarabun text-gray-500 text-xs leading-tight">{label}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────
export default function MyProfile() {
  const navigate      = useNavigate()
  const queryClient   = useQueryClient()
  const staff         = useAuthStore((s) => s.staff)
  const shiftLog      = useAuthStore((s) => s.shiftLog)
  const logout        = useAuthStore((s) => s.logout)
  const pendingCount  = useNotificationStore((s) => s.pendingCount)
  const toast         = useToast()

  const [showConfirm, setShowConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  // Auto-update shift timer every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Fetch stats — refresh every 30s, re-fetch on mount/focus
  const { data: stats } = useQuery<StaffStats>({
    queryKey: ['staff-stats'],
    queryFn:  () => apiGet<StaffStats>(endpoints.staffStats),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
    setTick(t => t + 1)
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const clockOutMutation = useMutation({
    mutationFn: () => apiPost(endpoints.staffClockOut),
    onSuccess: () => {
      logout()
      navigate('/staff/login', { replace: true })
    },
    onError: () => {
      toast.toastError('เกิดข้อผิดพลาด', 'ไม่สามารถออกงานได้')
      setShowConfirm(false)
    },
  })

  const handleLogout = () => {
    clockOutMutation.mutate()
  }

  // Format shift duration — prefer backend value (live), fallback to local estimate
  const shiftDuration = (() => {
    void tick // re-render every 30s
    // ถ้า API ส่งค่ามาแล้วให้ใช้ค่านั้นเลย
    const apiMinutes = stats?.shift_duration_minutes
    if (apiMinutes != null) {
      const h = Math.floor(apiMinutes / 60)
      const m = apiMinutes % 60
      return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
    }
    // fallback คำนวณเองจาก clock_in
    if (!shiftLog?.clock_in) return '—'
    const s = Math.floor((Date.now() - new Date(shiftLog.clock_in).getTime()) / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
  })()

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-50/90 backdrop-blur-xl border-b border-gray-200">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-kanit font-bold text-xl text-gray-900">โปรไฟล์</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-gray-200 hover:bg-zinc-700 active:scale-95 transition-all"
            title="รีเฟรชข้อมูล"
          >
            <svg
              className={clsx('w-4 h-4 text-gray-600', isRefreshing && 'animate-spin')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        {/* Profile card */}
        <div className="glass-card border border-amber-500/20 p-6 rounded-3xl mb-6 text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full bg-amber-500/10 blur-2xl" />
          </div>

          <div className="relative z-10">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-3xl bg-gray-200 border-2 border-amber-500/30 flex items-center justify-center text-5xl mx-auto mb-4 shadow-glow-amber">
              {staff?.emoji ?? '👤'}
            </div>

            <h2 className="font-kanit font-bold text-2xl text-gray-900">{staff?.name ?? '—'}</h2>
                <p className="font-sarabun text-gray-600 text-sm mt-1 capitalize">
                  {staff?.role === 'admin' ? 'แอดมิน' : 'พนักงาน'}
                </p>

            {/* Shift timer */}
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-sarabun text-amber-400 text-sm">กำลังทำงาน:</span>
              <ShiftTimer compact className="text-sm" />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <h3 className="font-kanit text-gray-600 font-semibold text-sm mb-3 px-1">
          สถิติวันนี้
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon="⏰"
            label="เวลาทำงาน"
            value={shiftDuration}
            color="text-amber-400"
          />
          <StatCard
            icon="✅"
            label="รับเรื่องแล้ว (กะนี้)"
            value={stats?.handled_count ?? 0}
            color="text-emerald-400"
          />
          <StatCard
            icon="🔔"
            label="ค้างอยู่ตอนนี้"
            value={pendingCount}
            color={pendingCount > 0 ? 'text-amber-400' : 'text-gray-600'}
          />
          <StatCard
            icon="📊"
            label="รับเรื่องทั้งหมดวันนี้"
            value={0}
            color="text-blue-400"
          />
        </div>

        {/* Clock in time */}
        {shiftLog?.clock_in && (
          <div className="glass-card border border-gray-200 p-4 rounded-2xl mb-6 flex items-center gap-3">
            <span className="text-2xl">🕐</span>
            <div>
              <p className="font-sarabun text-gray-600 text-xs">เวลาเริ่มงาน</p>
              <p className="font-kanit text-gray-900 font-semibold">
                {new Date(shiftLog.clock_in).toLocaleTimeString('th-TH', {
                  hour: '2-digit', minute: '2-digit', hour12: false,
                })} น.
              </p>
            </div>
          </div>
        )}

        {/* Clock out button */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={clockOutMutation.isPending}
          className={clsx(
            'w-full py-4 text-xl rounded-2xl font-kanit font-bold',
            'transition-all duration-200 active:scale-95',
            'border-2 border-red-500/50',
            'bg-red-500/10 hover:bg-red-500/20',
            'text-red-400 hover:text-red-300',
            clockOutMutation.isPending && 'opacity-50 cursor-wait',
          )}
        >
          {clockOutMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              กำลังออกงาน...
            </span>
          ) : (
            '🚪 ออกงาน'
          )}
        </button>
      </main>

      {/* Confirm dialog */}
      {showConfirm && (
        <LogoutDialog
          onConfirm={handleLogout}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <BottomNav />
      <ToastContainer />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

interface ShiftTimerProps {
  className?: string
  compact?:   boolean
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].join(':')
}

export default function ShiftTimer({ className = '', compact = false }: ShiftTimerProps) {
  const shiftLog = useAuthStore((s) => s.shiftLog)
  const [elapsed, setElapsed] = useState<number>(0)

  useEffect(() => {
    if (!shiftLog?.clock_in) return

    const clockInTime = new Date(shiftLog.clock_in).getTime()

    const calc = () => {
      const now     = Date.now()
      const seconds = Math.floor((now - clockInTime) / 1000)
      setElapsed(Math.max(0, seconds))
    }

    calc() // initial
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [shiftLog?.clock_in])

  if (!shiftLog) return null

  if (compact) {
    return (
      <span className={`font-kanit text-amber-400 font-medium tabular-nums ${className}`}>
        {formatDuration(elapsed)}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <div className="flex flex-col">
        <span className="font-sarabun text-gray-600 text-xs leading-none">เวลาทำงาน</span>
        <span className="font-kanit text-amber-400 font-semibold text-sm tabular-nums leading-tight">
          {formatDuration(elapsed)}
        </span>
      </div>
    </div>
  )
}

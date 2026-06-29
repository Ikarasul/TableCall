import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, endpoints } from '@/lib/api'
import type { TableInfo } from '@/types'

export default function TableLanding() {
  const { qrToken } = useParams<{ qrToken: string }>()
  const navigate    = useNavigate()

  const { data, isLoading, isError } = useQuery<TableInfo>({
    queryKey: ['table-info', qrToken],
    queryFn:  () => apiGet<TableInfo>(endpoints.tableByToken(qrToken!)),
    enabled:  !!qrToken,
    retry:    1,
  })

  // Auto-navigate when valid
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        navigate(`/table/${qrToken}/actions`, { replace: true, state: { tableInfo: data } })
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [data, qrToken, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-5xl animate-bounce-in">
            🔔
          </div>
          <div className="absolute inset-0 rounded-3xl animate-ping bg-amber-500/10" />
        </div>

        <div className="text-center">
          <h1 className="font-kanit font-bold text-2xl text-gray-900">
            Table<span className="text-amber-400">Call</span>
          </h1>
          <p className="font-sarabun text-gray-600 text-sm mt-2">
            กำลังโหลด...
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !qrToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-8">
        <div className="text-7xl">❌</div>
        <div className="text-center">
          <h2 className="font-kanit font-bold text-2xl text-gray-900">QR Code ไม่ถูกต้อง</h2>
          <p className="font-sarabun text-gray-600 text-sm mt-2 leading-relaxed">
            ลิงก์นี้หมดอายุหรือไม่ถูกต้อง
            <br />กรุณาสแกน QR Code ใหม่อีกครั้ง
          </p>
        </div>

        <div className="glass-card border border-red-500/20 bg-red-500/5 px-6 py-4 rounded-2xl text-center">
          <p className="font-sarabun text-gray-500 text-xs">
            หากปัญหายังคงเกิดขึ้น<br />กรุณาแจ้งพนักงานของร้าน
          </p>
        </div>
      </div>
    )
  }

  // Briefly show success before redirect
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
      <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-5xl animate-bounce-in">
        ✅
      </div>
      <div className="text-center">
        <h1 className="font-kanit font-bold text-2xl text-gray-900">
          โต๊ะ {data?.table_number}
        </h1>
        <p className="font-sarabun text-gray-600 text-sm mt-1">กำลังเข้าสู่หน้าบริการ...</p>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { apiGet, apiPost, apiPatch, apiDelete, endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { RestaurantTable } from '@/types'
import clsx from 'clsx'

// ── Today ISO helper ───────────────────────────────────────
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Shift log row component ────────────────────────────────
function ShiftLogRow({ log }: { log: any }) {
  const clockIn  = new Date(log.clock_in)
  const clockOut = log.clock_out ? new Date(log.clock_out) : null
  const isActive = !log.clock_out

  const fmt = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })

  const durationStr = (() => {
    if (log.duration_minutes == null) return null
    const h = Math.floor(log.duration_minutes / 60)
    const m = log.duration_minutes % 60
    return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
  })()

  return (
    <div className="glass-card border border-gray-200 rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
        {log.staff_emoji ?? '👤'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-kanit font-semibold text-gray-900 text-sm">{log.staff_name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="font-sarabun text-gray-600 text-xs">เข้า {fmt(clockIn)} น.</span>
          {clockOut ? (
            <span className="font-sarabun text-gray-600 text-xs">ออก {fmt(clockOut)} น.</span>
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
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-kanit text-xs">Online</span>
      ) : (
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-300 text-gray-500 font-kanit text-xs">ออกงาน</span>
      )}
    </div>
  )
}

type TabType = 'staff' | 'tables' | 'reports'

export default function ManageTables() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const currentStaff = useAuthStore((s) => s.staff)

  // Active tab state — default to 'tables' or read from URL
  const activeTab = (searchParams.get('tab') as TabType) || 'tables'
  const setActiveTab = (tab: TabType) => setSearchParams({ tab })

  // Redirect if not admin
  if (currentStaff?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-kanit text-red-500 mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="font-sarabun text-gray-600 mb-6">คุณต้องเป็นผู้ดูแลระบบ (Admin) เพื่อใช้งานหน้านี้</p>
          <button
            onClick={() => navigate('/staff/dashboard')}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-xl hover:bg-zinc-700 transition-colors font-kanit"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    )
  }

  // ── Tables data ────────────────────────────────────────
  const { data: tables = [], isLoading } = useQuery<RestaurantTable[]>({
    queryKey: ['admin-tables-list'],
    queryFn: () => apiGet(endpoints.adminTables),
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
  const [showQR, setShowQR] = useState<RestaurantTable | null>(null)

  const [number, setNumber] = useState('')
  const [seats, setSeats] = useState(4)
  const [isActive, setIsActive] = useState(true)

  const qrRef = useRef<SVGSVGElement>(null)

  const resetForm = () => {
    setNumber('')
    setSeats(4)
    setIsActive(true)
    setIsAdding(false)
    setEditingTable(null)
  }

  const handleEditClick = (table: RestaurantTable) => {
    setNumber(table.number || table.table_number || '')
    setSeats(table.seats)
    setIsActive(table.is_active ?? true)
    setEditingTable(table)
    setIsAdding(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost(endpoints.adminTables, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tables-list'] }); queryClient.invalidateQueries({ queryKey: ['tables'] }); resetForm() },
    onError: (err: any) => alert('สร้างโต๊ะไม่สำเร็จ: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data)))
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number, payload: any }) => apiPatch(endpoints.adminTableDetail(data.id), data.payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tables-list'] }); queryClient.invalidateQueries({ queryKey: ['tables'] }); resetForm() },
    onError: (err: any) => alert('แก้ไขไม่สำเร็จ: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data)))
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(endpoints.adminTableDetail(id)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tables-list'] }); queryClient.invalidateQueries({ queryKey: ['tables'] }) }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!number) return alert('กรุณากรอกเลขโต๊ะ')
    if (seats <= 0) return alert('จำนวนที่นั่งต้องมากกว่า 0')
    const payload: any = { number, seats, is_active: isActive }
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const downloadQR = (tableNumber: string) => {
    if (!qrRef.current) return
    const svgData = new XMLSerializer().serializeToString(qrRef.current)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width + 40
      canvas.height = img.height + 80
      if (!ctx) return
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 20, 20)
      ctx.fillStyle = 'black'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`โต๊ะ ${tableNumber}`, canvas.width / 2, canvas.height - 20)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR_Table_${tableNumber}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // ── Reports state ──────────────────────────────────────
  const [shiftDate, setShiftDate] = useState(() => todayISO())
  const [feedbackDate, setFeedbackDate] = useState(() => todayISO())

  const { data: shiftLogs = [], isLoading: shiftLoading } = useQuery<any[]>({
    queryKey: ['admin-shift-logs', shiftDate],
    queryFn:  () => apiGet<any[]>(endpoints.adminShiftLogs, { date: shiftDate }),
    enabled:  activeTab === 'reports',
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
  const authToken = localStorage.getItem('tablecall_token') ?? ''

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/staff/dashboard')}
          className="p-2 bg-gray-200 rounded-full hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-kanit font-semibold text-xl">จัดการ (Admin)</h1>
      </div>

      {/* 3-Tab Switcher */}
      <div className="flex gap-1.5 mb-6 bg-white0 p-1.5 rounded-2xl border border-gray-100">
        <button
          onClick={() => navigate('/staff/manage')}
          className="flex-1 py-2 font-kanit text-xs rounded-xl text-gray-600 hover:bg-white transition-colors"
        >
          พนักงาน
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={clsx(
            'flex-1 py-2 font-kanit text-xs rounded-xl transition-colors',
            activeTab === 'tables'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-gray-600 hover:bg-white'
          )}
        >
          โต๊ะอาหาร
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={clsx(
            'flex-1 py-2 font-kanit text-xs rounded-xl transition-colors',
            activeTab === 'reports'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-600 hover:bg-white'
          )}
        >
          รายงาน
        </button>
      </div>

      {/* ── TAB: โต๊ะอาหาร ────────────────────────────── */}
      {activeTab === 'tables' && (
        <>
          {isLoading ? (
            <p className="text-center text-gray-500 font-sarabun mt-10">กำลังโหลด...</p>
          ) : isAdding ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="glass-card p-5 rounded-3xl flex flex-col gap-4">
                <h2 className="font-kanit font-semibold text-lg border-b border-gray-200 pb-3">
                  {editingTable ? 'แก้ไขข้อมูลโต๊ะ' : 'เพิ่มโต๊ะใหม่'}
                </h2>

                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-gray-600 font-sarabun ml-1">หมายเลขโต๊ะ</label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="เช่น A1, 01"
                      className="bg-black/30 border border-gray-200 rounded-xl px-4 py-3 font-kanit text-gray-900 outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-1/3">
                    <label className="text-xs text-gray-600 font-sarabun ml-1">ที่นั่ง</label>
                    <input
                      type="number"
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                      min={1}
                      className="bg-black/30 border border-gray-200 rounded-xl px-4 py-3 font-kanit text-gray-900 outline-none focus:border-amber-500/50 text-center"
                    />
                  </div>
                </div>

                {editingTable && (
                  <label className="flex items-center gap-3 mt-2 p-3 bg-black/20 rounded-xl border border-gray-100 cursor-pointer">
                    <div className={clsx('w-10 h-6 rounded-full transition-colors relative', isActive ? 'bg-green-500' : 'bg-zinc-600')}>
                      <div className={clsx('absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform', isActive ? 'translate-x-4' : 'translate-x-0')} />
                    </div>
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="hidden" />
                    <span className="font-sarabun text-sm text-gray-700">
                      {isActive ? 'โต๊ะเปิดใช้งานอยู่' : 'ระงับการใช้งานโต๊ะ'}
                    </span>
                  </label>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-4 bg-gray-200 text-gray-900 rounded-2xl font-kanit transition-colors hover:bg-zinc-700 active:scale-[0.98]">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-[2] py-4 bg-amber-500 text-black rounded-2xl font-kanit font-semibold transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'กำลังบันทึก...' : editingTable ? 'บันทึกการแก้ไข' : 'สร้างโต๊ะ'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl font-kanit font-semibold transition-all hover:bg-amber-500/20 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                เพิ่มโต๊ะใหม่
              </button>

              <div className="grid grid-cols-2 gap-3">
                {tables.map(table => (
                  <div
                    key={table.id}
                    className={clsx('glass-card p-4 rounded-2xl flex flex-col gap-3 transition-all', !table.is_active && 'opacity-50 grayscale')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-kanit font-bold text-2xl text-gray-900 leading-none">
                          {table.number || table.table_number}
                        </h3>
                        <p className="font-sarabun text-xs text-gray-500 mt-1">{table.seats} ที่นั่ง</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleEditClick(table)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {table.is_active && (
                          <button
                            onClick={() => {
                              if (confirm(`ต้องการลบโต๊ะ ${table.number || table.table_number} หรือไม่?`)) {
                                deleteMutation.mutate(table.id)
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowQR(table)}
                      className="w-full py-2 bg-gray-200 rounded-xl text-gray-700 font-sarabun text-sm flex items-center justify-center gap-1.5 hover:bg-zinc-700 transition-colors mt-auto"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      คิวอาร์โค้ด
                    </button>
                  </div>
                ))}
              </div>

              {tables.length === 0 && (
                <div className="text-center py-10 font-sarabun text-gray-500">ยังไม่มีข้อมูลโต๊ะ</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── TAB: รายงาน / ดาวน์โหลดข้อมูล ───────────── */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-4">

          {/* Card: บันทึกเข้า-ออกงาน */}
          <div className="glass-card border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 flex items-center justify-center text-xl">🕐</div>
              <div>
                <p className="font-kanit font-bold text-gray-900 text-base">บันทึกเข้า-ออกงานพนักงาน</p>
                <p className="font-sarabun text-gray-500 text-xs">ชื่อพนักงาน / เวลาเข้า-ออก / ระยะเวลา</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 font-kanit text-gray-900 text-sm outline-none focus:border-blue-500/50"
              />
              <a
                href={`${BASE_URL}/v1/staff/admin/shift-logs/export/?date=${shiftDate}&token=${authToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-blue-500/15 border border-blue-500/40 text-blue-400 rounded-xl font-kanit font-semibold text-sm hover:bg-blue-500/25 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                โหลด Excel
              </a>
            </div>
          </div>

          {/* Card: ความพึงพอใจ */}
          <div className="glass-card border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-xl">⭐</div>
              <div>
                <p className="font-kanit font-bold text-gray-900 text-base">ความพึงพอใจลูกค้า</p>
                <p className="font-sarabun text-gray-500 text-xs">คะแนนดาว 1–5 พร้อมข้อเสนอแนะ</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={feedbackDate}
                onChange={(e) => setFeedbackDate(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 font-kanit text-gray-900 text-sm outline-none focus:border-emerald-500/50"
              />
              <a
                href={`${BASE_URL}/v1/tables/admin/feedback/export/?date=${feedbackDate}&token=${authToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-xl font-kanit font-semibold text-sm hover:bg-emerald-500/25 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                โหลด Excel
              </a>
            </div>
          </div>

          {/* สถานะพนักงานวันที่เลือก */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="font-kanit font-semibold text-gray-600 text-sm">👥 สถานะพนักงาน ({shiftDate})</p>
              <span className="font-sarabun text-gray-400 text-xs">
                {shiftLogs.filter((log: any, index: number, self: any[]) => self.findIndex(l => l.staff_id === log.staff_id) === index).length} คน
              </span>
            </div>
            {shiftLoading ? (
              <div className="flex flex-col gap-2">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-200 animate-pulse" />)}
              </div>
            ) : shiftLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-sarabun text-gray-400 text-sm">ไม่มีข้อมูลการเข้างานในวันที่เลือก</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {shiftLogs.filter((log: any, index: number, self: any[]) => self.findIndex(l => l.staff_id === log.staff_id) === index).map((log: any) => <ShiftLogRow key={log.id} log={log} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card p-6 rounded-3xl w-full max-w-sm flex flex-col items-center">
            <h3 className="font-kanit font-bold text-xl text-gray-900 mb-1">
              โต๊ะ {showQR.number || showQR.table_number}
            </h3>
            <p className="font-sarabun text-xs text-gray-600 mb-6 text-center">
              สแกนคิวอาร์โค้ดนี้เพื่อเรียกพนักงาน<br/>หรือขอเช็คบิล
            </p>

            <div className="bg-white p-4 rounded-2xl mb-6 shadow-xl">
              <QRCodeSVG
                value={`${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/table/${showQR.qr_token}`}
                size={220}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                ref={qrRef}
              />
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowQR(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-900 rounded-xl font-kanit transition-colors hover:bg-zinc-700"
              >
                ปิด
              </button>
              <button
                onClick={() => downloadQR(showQR.number || showQR.table_number || '')}
                className="flex-1 py-3 bg-amber-500 text-black font-semibold rounded-xl font-kanit transition-colors hover:bg-amber-400 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                บันทึกรูป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

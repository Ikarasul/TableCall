import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete, endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Staff } from '@/types'
import clsx from 'clsx'

export default function ManageStaff() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentStaff = useAuthStore((s) => s.staff)

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

  const { data: staffs = [], isLoading } = useQuery<Staff[]>({
    queryKey: ['admin-staff-list'],
    queryFn: () => apiGet(endpoints.adminStaffAll),
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  // Form state
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👤')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff'>('staff')
  const [isActive, setIsActive] = useState(true)

  const resetForm = () => {
    setCode('')
    setName('')
    setEmoji('👤')
    setPassword('')
    setRole('staff')
    setIsActive(true)
    setIsAdding(false)
    setEditingStaff(null)
  }

  const handleEditClick = (staff: Staff) => {
    setCode(staff.code || '')
    setName(staff.name)
    setEmoji(staff.emoji || staff.avatar_emoji || '👤') // handle both possible field names
    setRole(staff.role as 'admin' | 'staff')
    setIsActive(staff.is_active)
    setPassword('') // keep empty unless changing
    setEditingStaff(staff)
    setIsAdding(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost(endpoints.adminStaffCreate, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] })
      resetForm()
    },
    onError: (err: any) => {
      alert('สร้างพนักงานไม่สำเร็จ: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data)))
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number, payload: any }) => apiPatch(endpoints.adminStaffDetail(data.id), data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] })
      resetForm()
    },
    onError: (err: any) => {
      alert('แก้ไขไม่สำเร็จ: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data)))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(endpoints.adminStaffDetail(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) return alert('กรุณากรอกรหัสและชื่อพนักงาน')

    const payload: any = { code, name, avatar_emoji: emoji, role, is_active: isActive }
    if (password) payload.password = password // Only send password if filled

    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, payload })
    } else {
      if (!password) return alert('กรุณากำหนดรหัสผ่านสำหรับพนักงานใหม่')
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/staff/dashboard')}
          className="p-2 bg-gray-200 rounded-full hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-kanit font-semibold text-xl">จัดการข้อมูลร้าน (Admin)</h1>
      </div>

      {/* 3-Tab Switcher */}
      <div className="flex gap-1.5 mb-6 bg-white0 p-1.5 rounded-2xl border border-gray-100">
        <button 
          className="flex-1 py-2 font-kanit text-xs rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30"
        >
          พนักงาน
        </button>
        <button 
          onClick={() => navigate('/staff/tables?tab=tables')}
          className="flex-1 py-2 font-kanit text-xs rounded-xl text-gray-600 hover:bg-white transition-colors"
        >
          โต๊ะอาหาร
        </button>
        <button 
          onClick={() => navigate('/staff/tables?tab=reports')}
          className="flex-1 py-2 font-kanit text-xs rounded-xl text-gray-600 hover:bg-white transition-colors"
        >
          รายงาน
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 font-sarabun mt-10">กำลังโหลด...</p>
      ) : isAdding ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="glass-card p-5 rounded-3xl flex flex-col gap-4">
            <h2 className="font-kanit font-semibold text-lg border-b border-gray-200 pb-3">
              {editingStaff ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
            </h2>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600 font-sarabun ml-1">รหัสพนักงาน (Login Code)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น S001"
                className="bg-black/30 border border-gray-200 rounded-xl px-4 py-3 font-sarabun text-gray-900 outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600 font-sarabun ml-1">ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                lang="th"
                inputMode="text"
                className="bg-black/30 border border-gray-200 rounded-xl px-4 py-3 font-sarabun text-gray-900 outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1 w-1/3">
                <label className="text-xs text-gray-600 font-sarabun ml-1">Emoji (ไอคอน)</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="bg-black/30 border border-gray-200 rounded-xl px-4 py-3 font-sarabun text-gray-900 outline-none focus:border-amber-500/50 text-center text-xl"
                />
              </div>
              <div className="flex flex-col gap-1 w-2/3">
                <label className="text-xs text-gray-600 font-sarabun ml-1">
                  {editingStaff ? 'รหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/30 border border-gray-200 rounded-xl px-4 py-3 font-sarabun text-gray-900 outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs text-gray-600 font-sarabun ml-1">ระดับสิทธิ์ (Role)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={clsx(
                    'flex-1 py-3 rounded-xl font-kanit text-sm transition-colors border',
                    role === 'staff' 
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-black/30 border-gray-200 text-gray-600 hover:bg-white'
                  )}
                >
                  พนักงาน (Staff)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={clsx(
                    'flex-1 py-3 rounded-xl font-kanit text-sm transition-colors border',
                    role === 'admin' 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-black/30 border-gray-200 text-gray-600 hover:bg-white'
                  )}
                >
                  ผู้ดูแล (Admin)
                </button>
              </div>
            </div>

            {editingStaff && (
              <label className="flex items-center gap-3 mt-4 p-3 bg-black/20 rounded-xl border border-gray-100 cursor-pointer">
                <div className={clsx(
                  "w-10 h-6 rounded-full transition-colors relative",
                  isActive ? "bg-green-500" : "bg-zinc-600"
                )}>
                  <div className={clsx(
                    "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                    isActive ? "translate-x-4" : "translate-x-0"
                  )} />
                </div>
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)} 
                  className="hidden" 
                />
                <span className="font-sarabun text-sm text-gray-700">
                  {isActive ? 'บัญชีเปิดใช้งาน' : 'บัญชีถูกระงับ'}
                </span>
              </label>
            )}

          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-4 bg-gray-200 text-gray-900 rounded-2xl font-kanit transition-colors hover:bg-zinc-700 active:scale-[0.98]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-[2] py-4 bg-amber-500 text-black rounded-2xl font-kanit font-semibold transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? 'กำลังบันทึก...' 
                : editingStaff ? 'บันทึกการแก้ไข' : 'สร้างพนักงาน'}
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
            เพิ่มพนักงานใหม่
          </button>

          <div className="flex flex-col gap-3">
            {staffs.map(staff => (
              <div 
                key={staff.id} 
                className={clsx(
                  "glass-card p-4 rounded-2xl flex items-center gap-4 transition-all",
                  !staff.is_active && "opacity-50 grayscale"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-black/40 border border-gray-200 flex items-center justify-center text-2xl shadow-inner">
                  {staff.avatar_emoji || staff.emoji || '👤'}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-kanit font-medium text-gray-900">{staff.name}</h3>
                    {staff.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-md font-sarabun uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="font-sarabun text-xs text-gray-500 mt-0.5">
                    Code: {staff.code || '-'} 
                    {!staff.is_active && <span className="ml-2 text-red-400 font-bold">(ถูกระงับ)</span>}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(staff)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-colors hover:bg-blue-500/20"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {staff.is_active && staff.id !== currentStaff?.id && (
                    <button
                      onClick={() => {
                        if (confirm(`ต้องการระงับบัญชี ${staff.name} ใช่หรือไม่?`)) {
                          deleteMutation.mutate(staff.id)
                        }
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 transition-colors hover:bg-red-500/20"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {staffs.length === 0 && (
              <div className="text-center py-10 font-sarabun text-gray-500">
                ยังไม่มีข้อมูลพนักงาน
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

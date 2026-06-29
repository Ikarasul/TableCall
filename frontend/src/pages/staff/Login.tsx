import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'
import type { Staff } from '@/types'

export default function Login() {
  const navigate = useNavigate()
  const loginAction = useAuthStore((s: any) => s.login)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [lockedMsg, setLockedMsg] = useState('')

  const { data: staffs, isLoading } = useQuery<Staff[]>({
    queryKey: ['staff-list'],
    queryFn: () => apiGet(endpoints.staffList),
  })

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiPost<any>(endpoints.staffLogin, { code, password })
    },
    onSuccess: (data) => {
      loginAction(data.access_token, data.staff)
      navigate('/staff/dashboard', { replace: true })
    },
    onError: (error: any) => {
      const data = error.response?.data
      if (data?.locked) {
        setLockedMsg(data.detail)
        setErrorMsg('')
      } else {
        setErrorMsg(data?.detail || 'เข้าสู่ระบบไม่สำเร็จ')
        setLockedMsg('')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !password) {
      setErrorMsg('กรุณาเลือกชื่อพนักงานและกรอกรหัสผ่าน')
      return
    }
    setErrorMsg('')
    setLockedMsg('')
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4 animate-bounce-in">🔔</div>
          <h1 className="font-kanit font-bold text-4xl text-gray-900">
            Table<span className="text-amber-400">Call</span>
          </h1>
          <p className="font-sarabun text-gray-600 mt-2 text-sm">
            เข้าสู่ระบบสำหรับพนักงาน
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-5">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center font-sarabun animate-shake">
              {errorMsg}
            </div>
          )}
          {lockedMsg && (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 text-sm p-3 rounded-lg text-center font-sarabun">
              {lockedMsg}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-kanit text-gray-700 text-sm ml-1">ชื่อพนักงาน</label>
            <div className="relative">
              <select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
                className={clsx(
                  'w-full bg-gray-200/50 border border-gray-200 rounded-xl px-4 py-3',
                  'font-sarabun text-gray-900',
                  'focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none',
                  isLoading && 'opacity-50 cursor-wait'
                )}
              >
                <option value="" disabled>-- เลือกชื่อของคุณ --</option>
                {staffs?.map((staff) => (
                  <option key={staff.id} value={staff.code}>
                    {staff.emoji || staff.avatar_emoji || '👤'} {staff.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-kanit text-gray-700 text-sm ml-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              className={clsx(
                'w-full bg-gray-200/50 border border-gray-200 rounded-xl px-4 py-3',
                'font-sarabun text-gray-900 placeholder-zinc-500',
                'focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all'
              )}
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className={clsx(
              'btn-amber w-full py-3.5 mt-2 text-lg',
              loginMutation.isPending && 'opacity-70 cursor-not-allowed'
            )}
          >
            {loginMutation.isPending ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}

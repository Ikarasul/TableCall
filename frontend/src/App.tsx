import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import ProtectedRoute from '@/components/ui/ProtectedRoute'

// Staff pages
import Login            from '@/pages/staff/Login'
import Dashboard        from '@/pages/staff/Dashboard'
import ManageStaff      from '@/pages/staff/ManageStaff'
import ManageTables     from '@/pages/staff/ManageTables'

// Customer pages
import TableLanding     from '@/pages/customer/TableLanding'
import CustomerActions  from '@/pages/customer/CustomerActions'

// Notification pages
import NotificationList from '@/pages/notifications/NotificationList'
import MyProfile        from '@/pages/notifications/MyProfile'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleBackButton = async (event: any) => {
      // ถ้ายืนอยู่หน้า Dashboard หรือ Login ให้ปิดแอปปกติ (หรือทำตาม default)
      if (location.pathname === '/staff/dashboard' || location.pathname === '/staff/login') {
        if (!event.canGoBack) {
          CapacitorApp.exitApp()
        } else {
          window.history.back()
        }
        return
      }
      
      // ถ้าอยู่หน้าอื่นของ Staff ให้กลับไป Dashboard
      if (location.pathname.startsWith('/staff/')) {
        navigate('/staff/dashboard', { replace: true })
        return
      }

      // ถ้าเป็นหน้าอื่นๆ (เช่นลูกค้า) ให้ย้อนกลับธรรมดา
      if (event.canGoBack) {
        window.history.back()
      } else {
        CapacitorApp.exitApp()
      }
    }

    const listener = CapacitorApp.addListener('backButton', handleBackButton)

    return () => {
      listener.then(l => l.remove())
    }
  }, [location.pathname, navigate])

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/staff/login" replace />} />

      {/* ── Staff Auth ────────────────────────────────── */}
      <Route path="/staff/login"           element={<Login />} />

      {/* ── Staff Protected ───────────────────────────── */}
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/notifications"
        element={
          <ProtectedRoute>
            <NotificationList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/me"
        element={
          <ProtectedRoute>
            <MyProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/manage"
        element={
          <ProtectedRoute>
            <ManageStaff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/tables"
        element={
          <ProtectedRoute>
            <ManageTables />
          </ProtectedRoute>
        }
      />

      {/* ── Customer (public) ─────────────────────────── */}
      <Route path="/table/:qrToken"          element={<TableLanding />} />
      <Route path="/table/:qrToken/actions"  element={<CustomerActions />} />

      {/* ── 404 fallback ──────────────────────────────── */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-8">
            <div className="text-8xl">🔍</div>
            <div className="text-center">
              <h1 className="font-kanit font-bold text-3xl text-gray-900">404</h1>
              <p className="font-sarabun text-gray-600 mt-2">ไม่พบหน้าที่คุณต้องการ</p>
            </div>
            <a
              href="/staff/login"
              className="btn-amber px-6 py-3 text-base no-underline"
            >
              กลับหน้าแรก
            </a>
          </div>
        }
      />
    </Routes>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
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

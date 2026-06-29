import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import useFCM from '@/hooks/useFCM'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location        = useLocation()

  // Initialize FCM for logged-in staff
  useFCM()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/staff/login"
        state={{ from: location }}
        replace
      />
    )
  }

  return <>{children}</>
}

import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'

// ── Base URL ───────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

// ── Axios instance ─────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

// ── Request interceptor: attach JWT ───────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('tablecall_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ── Response interceptor: handle 401 ──────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Clear auth state on 401
      localStorage.removeItem('tablecall_token')
      localStorage.removeItem('tablecall_staff')

      // Redirect to login (avoid import loop with router)
      if (!window.location.pathname.includes('/staff/login')) {
        window.location.href = '/staff/login'
      }
    }

    return Promise.reject(error)
  },
)

// ── Typed helpers ──────────────────────────────────────────
export const apiGet = <T>(url: string, params?: Record<string, unknown>) =>
  api.get<T>(url, { params }).then((r) => r.data)

export const apiPost = <T>(url: string, data?: unknown) =>
  api.post<T>(url, data).then((r) => r.data)

export const apiPatch = <T>(url: string, data?: unknown) =>
  api.patch<T>(url, data).then((r) => r.data)

export const apiDelete = <T>(url: string) =>
  api.delete<T>(url).then((r) => r.data)

// ── API endpoints ──────────────────────────────────────────
export const endpoints = {
  // Auth
  staffList:          '/v1/staff/',
  staffLogin:         '/v1/staff/login/',
  staffClockOut:      '/v1/staff/clock-out/',
  staffMe:            '/v1/staff/me/',
  staffStats:         '/v1/staff/me/stats/',

  // Admin Staff Management
  adminStaffCreate:   '/v1/staff/admin/',
  adminStaffAll:      '/v1/staff/admin/all/',
  adminStaffDetail:   (id: number) => `/v1/staff/admin/${id}/`,

  tables:             '/v1/tables/',
  tableByToken:       (token: string) => `/v1/tables/${token}/`,
  adminTables:        '/v1/tables/admin/',
  adminTableDetail:   (id: number) => `/v1/tables/admin/${id}/`,
  adminReorderTables: '/v1/tables/admin/reorder/',

  // Notifications
  notifications:      '/v1/notifications/',
  notificationHandle: (id: number) => `/v1/notifications/${id}/handle/`,
  notificationCreate: '/v1/notifications/',

  // Customer
  customerAction:     (token: string) => `/v1/tables/${token}/notify/`,
  customerRecent:     (token: string) => `/v1/tables/${token}/`, // Frontend will extract recent_notifications
  customerFeedback:   (token: string) => `/v1/tables/${token}/feedback/`,
  // Admin – Shift Logs
  adminShiftLogs:       '/v1/staff/admin/shift-logs/',
  adminShiftLogsExport: '/v1/staff/admin/shift-logs/export/',
}

export default api

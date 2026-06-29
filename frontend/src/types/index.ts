// ============================================================
// TableCall – Shared TypeScript Types
// ============================================================

// ── Auth / Staff ──────────────────────────────────────────

export interface Staff {
  id: number
  code?: string
  name: string
  emoji?: string
  avatar_emoji?: string
  phone?: string
  role: 'staff' | 'admin'
  is_active: boolean
  created_at: string
}

export interface StaffProfile extends Staff {
  shift_log?: ShiftLog
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  staff: Staff
  shift_log: ShiftLog
}

// ── Shift / Work Session ───────────────────────────────────

export interface ShiftLog {
  id: number
  staff: number            // staff id (primary key)
  staff_name?: string
  clock_in: string         // ISO date-time
  clock_out?: string | null
  duration_minutes?: number | null
  is_active_shift?: boolean
}

// ── Restaurant Tables ──────────────────────────────────────

export type TableStatus = 'idle' | 'calling' | 'bill'

export interface RestaurantTable {
  id: number
  table_number: string   // e.g. "A1", "12"
  number?: string        // Used by AdminTableSerializer
  label?: string         // human-readable e.g. "โต๊ะ 1"
  seats: number
  zone?: string          // "A", "B", etc.
  qr_token: string
  status: TableStatus
  pending_count: number
  is_active?: boolean    // For admin view
}

// ── Notifications ──────────────────────────────────────────

export type NotificationType = 'call_staff' | 'request_bill'

export type NotificationStatus = 'pending' | 'handled' | 'cancelled'

export interface Notification {
  id: number
  table_id: number
  table_number: string
  table_label?: string
  table_emoji?: string
  type: NotificationType
  status: NotificationStatus
  created_at: string
  handled_at?: string | null
  handled_by?: number | null
  handled_by_name?: string | null
}

export interface NotificationCreatePayload {
  qr_token: string
  type: NotificationType
}

export interface NotificationHandlePayload {
  notification_id: number
}

// ── WebSocket Messages ─────────────────────────────────────

export type WsEventType =
  | 'notification.created'
  | 'notification.handled'
  | 'notification.cancelled'
  | 'table.status_changed'
  | 'staff.logged_in'
  | 'ping'
  | 'pong'

export interface WsMessage<T = unknown> {
  event: WsEventType
  data: T
  timestamp: string
}

export interface WsNotificationCreatedData {
  notification: Notification
}

export interface WsNotificationHandledData {
  notification: Notification
  staff_name: string
}

export interface WsTableStatusChangedData {
  table_id: number
  table_number: string
  status: TableStatus
  pending_count: number
}

// ── Toast ──────────────────────────────────────────────────

export type ToastVariant = 'calling' | 'bill' | 'success' | 'error' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  body?: string
  emoji?: string
  duration?: number        // ms, default 5000
  createdAt: number        // Date.now()
  exiting?: boolean
}

// ── API Generics ───────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ApiError {
  detail: string
  code?: string
}

// ── Customer Facing ────────────────────────────────────────

export interface TableInfo {
  id: number
  table_number: string
  number?: string
  label?: string
  seats: number
  zone?: string
  restaurant_name: string
  restaurant_logo?: string
}

export interface CustomerActionResult {
  notification_id: number
  type: NotificationType
  created_at: string
  cooldown_until: string   // ISO date-time
  cooldown_seconds: number
}

export interface RecentRequest {
  id: number
  type: NotificationType
  status: NotificationStatus
  created_at: string
}

// ── Statistics (for MyProfile) ─────────────────────────────

export interface StaffStats {
  staff_id?: number
  staff_name?: string
  total_handled_today: number
  total_handled_shift: number
  handled_count?: number
  pending_count: number
  shift_duration_seconds?: number
  shift_duration_minutes?: number | null
  shift_start?: string | null
  is_clocked_in?: boolean
}

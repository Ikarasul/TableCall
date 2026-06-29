import type { WsMessage, WsEventType } from '@/types'

// ── Types ──────────────────────────────────────────────────
type MessageHandler = (msg: WsMessage) => void
type StatusHandler = (status: WsStatus) => void

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// ── Constants ──────────────────────────────────────────────
const BACKOFF_BASE_MS    = 1_000
const BACKOFF_MAX_MS     = 30_000
const PING_INTERVAL_MS   = 25_000
const CLOSE_NORMAL       = 1000
const CLOSE_GOING_AWAY   = 1001

// ── WebSocket Manager ──────────────────────────────────────
class WsClient {
  private ws:              WebSocket | null = null
  private token:           string | null    = null
  private retryCount:      number           = 0
  private retryTimer:      ReturnType<typeof setTimeout> | null = null
  private pingTimer:       ReturnType<typeof setInterval> | null = null
  private intentionalClose = false
  private status:          WsStatus = 'disconnected'

  // Handler registries
  private messageHandlers: Set<MessageHandler> = new Set()
  private statusHandlers:  Set<StatusHandler>  = new Set()

  // ── Public API ───────────────────────────────────────────

  connect(token: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return // already connected
    }
    this.token = token
    this.intentionalClose = false
    this._connect()
  }

  disconnect(): void {
    this.intentionalClose = true
    this._clearTimers()
    if (this.ws) {
      this.ws.close(CLOSE_NORMAL, 'client disconnect')
      this.ws = null
    }
    this._setStatus('disconnected')
    this.retryCount = 0
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    // Immediately fire current status
    handler(this.status)
    return () => this.statusHandlers.delete(handler)
  }

  getStatus(): WsStatus {
    return this.status
  }

  send(event: WsEventType, data?: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // ใช้ 'type' เพื่อให้ตรงกับที่ backend consumer อ่าน
      this.ws.send(JSON.stringify({ type: event, data, timestamp: new Date().toISOString() }))
    }
  }

  // ── Private ──────────────────────────────────────────────

  private _connect(): void {
    if (!this.token) return

    let wsBase = import.meta.env.VITE_WS_URL
      ?? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host
    
    // Ensure no double trailing slash
    wsBase = wsBase.replace(/\/+$/, '')
    
    // If VITE_WS_URL already includes /ws, just append /notifications/
    // Otherwise append /ws/notifications/
    const path = wsBase.endsWith('/ws') ? '/notifications/' : '/ws/notifications/'
    const url = `${wsBase}${path}?token=${encodeURIComponent(this.token)}`

    this._setStatus('connecting')

    try {
      this.ws = new WebSocket(url)
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
      this._scheduleRetry()
      return
    }

    this.ws.onopen = () => {
      console.log('[WS] Connected')
      this.retryCount = 0
      this._setStatus('connected')
      this._startPing()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage
        // Handle pong silently — server ส่งกลับด้วย key 'type'
        if ((msg as any).type === 'pong') return
        this.messageHandlers.forEach((h) => h(msg))
      } catch {
        console.warn('[WS] Failed to parse message:', event.data)
      }
    }

    this.ws.onerror = (event) => {
      console.error('[WS] Error:', event)
      this._setStatus('error')
    }

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`[WS] Closed: code=${event.code} reason=${event.reason}`)
      this._clearPing()

      if (this.intentionalClose || event.code === CLOSE_NORMAL || event.code === CLOSE_GOING_AWAY) {
        this._setStatus('disconnected')
        return
      }

      this._setStatus('disconnected')
      this._scheduleRetry()
    }
  }

  private _scheduleRetry(): void {
    if (this.intentionalClose) return

    this.retryCount++
    const delay = Math.min(
      BACKOFF_BASE_MS * Math.pow(2, this.retryCount - 1),
      BACKOFF_MAX_MS,
    )

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.retryCount})`)

    this.retryTimer = setTimeout(() => {
      if (!this.intentionalClose) {
        this._connect()
      }
    }, delay)
  }

  private _startPing(): void {
    this._clearPing()
    this.pingTimer = setInterval(() => {
      this.send('ping')
    }, PING_INTERVAL_MS)
  }

  private _clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private _clearTimers(): void {
    this._clearPing()
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private _setStatus(status: WsStatus): void {
    this.status = status
    this.statusHandlers.forEach((h) => h(status))
  }
}

// ── Singleton export ───────────────────────────────────────
export const wsClient = new WsClient()
export default wsClient

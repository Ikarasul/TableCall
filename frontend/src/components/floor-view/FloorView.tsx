import { useNavigate } from 'react-router-dom'
import type { RestaurantTable, TableStatus } from '@/types'
import { useNotificationStore } from '@/store/notificationStore'
import clsx from 'clsx'
import TableCard from './TableCard'

interface FloorViewProps {
  tables: RestaurantTable[]
  loading?: boolean
}

const STATUS_ORDER: Record<TableStatus, number> = {
  calling: 0,
  bill:    1,
  idle:    2,
}

export default function FloorView({ tables, loading = false }: FloorViewProps) {
  const navigate           = useNavigate()
  const pendingByTable     = useNotificationStore((s) => s.pendingByTable)

  // Merge real-time pending status into tables
  const enrichedTables = tables.map((table) => {
    const pending = pendingByTable[table.id] ?? []
    if (pending.length === 0) return table

    // Determine status from pending notifications
    const hasBill    = pending.some((n) => n.type === 'request_bill')
    const hasCalling = pending.some((n) => n.type === 'call_staff')

    let status: TableStatus = table.status
    if (hasCalling) status = 'calling'
    else if (hasBill) status = 'bill'

    return { ...table, status, pending_count: pending.length }
  })

  // Sort: calling → bill → idle, then by table_number
  const sorted = [...enrichedTables].sort((a, b) => {
    const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (orderDiff !== 0) return orderDiff
    return a.table_number.localeCompare(b.table_number, 'th', { numeric: true })
  })

  const handleTableClick = (table: RestaurantTable) => {
    navigate('/staff/notifications', { state: { filterTableId: table.id } })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-gray-200 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    )
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="text-5xl">🪑</span>
        <p className="font-kanit text-gray-500 text-lg">ยังไม่มีโต๊ะในระบบ</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
          <span className="font-sarabun text-gray-500 text-xs">ว่าง</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-sarabun text-amber-400 text-xs">เรียกพนักงาน</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-sarabun text-emerald-400 text-xs">เช็คบิล</span>
        </div>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onClick={() => handleTableClick(table)}
          />
        ))}
      </div>
    </div>
  )
}

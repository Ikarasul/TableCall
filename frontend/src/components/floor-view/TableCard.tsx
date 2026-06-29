import type { RestaurantTable, TableStatus } from '@/types'
import clsx from 'clsx'

interface TableCardProps {
  table:   RestaurantTable
  onClick: () => void
}

const statusConfig: Record<TableStatus, {
  bg:      string
  border:  string
  pulse:   string
  icon:    string
  label:   string
  text:    string
  badge:   string
}> = {
  idle: {
    bg:     'bg-gray-200/80',
    border: 'border-zinc-700/50',
    pulse:  '',
    icon:   '🪑',
    label:  'ว่าง',
    text:   'text-gray-500',
    badge:  '',
  },
  calling: {
    bg:     'bg-amber-950/60',
    border: 'border-amber-500/60',
    pulse:  'animate-pulse-amber',
    icon:   '🔔',
    label:  'เรียกพนักงาน',
    text:   'text-amber-400',
    badge:  'bg-amber-500 text-black',
  },
  bill: {
    bg:     'bg-emerald-950/60',
    border: 'border-emerald-500/60',
    pulse:  'animate-pulse-green',
    icon:   '💳',
    label:  'เช็คบิล',
    text:   'text-emerald-400',
    badge:  'bg-emerald-500 text-gray-900',
  },
}

export default function TableCard({ table, onClick }: TableCardProps) {
  const cfg = statusConfig[table.status]
  const hasPending = table.pending_count > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center justify-between',
        'w-full h-32 rounded-2xl p-3',
        'border transition-all duration-300',
        'no-tap-highlight active:scale-95',
        cfg.bg,
        cfg.border,
        cfg.pulse,
        hasPending && 'cursor-pointer',
        !hasPending && 'cursor-default opacity-90 hover:opacity-100',
      )}
      aria-label={`โต๊ะ ${table.table_number} สถานะ: ${cfg.label}`}
    >
      {/* Pending badge */}
      {hasPending && (
        <span
          className={clsx(
            'absolute -top-1.5 -right-1.5 z-10',
            'min-w-[22px] h-[22px] px-1.5',
            'flex items-center justify-center rounded-full',
            'font-kanit font-bold text-xs',
            'animate-bounce-in',
            cfg.badge,
          )}
        >
          {table.pending_count}
        </span>
      )}

      {/* Top section: Status icon */}
      <div className="flex flex-col items-center gap-1 flex-1 justify-center">
        <span className="text-3xl leading-none">{cfg.icon}</span>
        <span
          className={clsx(
            'font-sarabun text-[10px] font-medium leading-none mt-0.5',
            cfg.text,
          )}
        >
          {cfg.label}
        </span>
      </div>

      {/* Bottom: Table number + seats */}
      <div className="w-full">
        <div className="flex items-end justify-between w-full">
          <div className="text-left">
            <p className="font-kanit font-bold text-gray-900 text-lg leading-none">
              {table.table_number}
            </p>
            {table.label && (
              <p className="font-sarabun text-gray-500 text-[10px] leading-tight truncate max-w-[70px]">
                {table.label}
              </p>
            )}
          </div>

          {/* Seat count */}
          <div className="flex items-center gap-0.5">
            <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
            </svg>
            <span className="font-sarabun text-gray-500 text-[10px]">{table.seats}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

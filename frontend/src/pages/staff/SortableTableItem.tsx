import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RestaurantTable } from '@/types'
import clsx from 'clsx'

interface Props {
  table: RestaurantTable
  onEdit: (table: RestaurantTable) => void
  onDelete: (id: number, number: string) => void
  onShowQR: (table: RestaurantTable) => void
}

export function SortableTableItem({ table, onEdit, onDelete, onShowQR }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: table.id.toString() })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'glass-card p-4 rounded-2xl flex flex-col gap-3 transition-colors',
        !table.is_active && 'opacity-50 grayscale',
        isDragging && 'opacity-70 shadow-2xl scale-105 border-amber-500/50'
      )}
    >
      <div className="flex justify-between items-start">
        {/* Drag handle */}
        <div 
          className="flex items-center justify-center p-2 -ml-2 -mt-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 touch-none"
          {...attributes}
          {...listeners}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        
        <div className="flex-1 text-center pr-2">
          <h3 className="font-kanit font-bold text-2xl text-gray-900 leading-none">
            {table.number || table.table_number}
          </h3>
          <p className="font-sarabun text-xs text-gray-500 mt-1">{table.seats} ที่นั่ง</p>
        </div>
        
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onEdit(table)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          {table.is_active && (
            <button
              onClick={() => onDelete(table.id, table.number || table.table_number || '')}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => onShowQR(table)}
        className="w-full py-2 bg-gray-200 rounded-xl text-gray-700 font-sarabun text-sm flex items-center justify-center gap-1.5 hover:bg-zinc-700 transition-colors mt-auto"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        คิวอาร์โค้ด
      </button>
    </div>
  )
}

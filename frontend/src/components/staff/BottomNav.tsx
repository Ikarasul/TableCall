import { useNavigate, useLocation } from 'react-router-dom'
import { useNotificationStore } from '@/store/notificationStore'
import clsx from 'clsx'

interface NavItem {
  path:    string
  icon:    React.ReactNode
  label:   string
  badge?:  number
}

function HomeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

export default function BottomNav() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const pendingCount  = useNotificationStore((s) => s.pendingCount)

  const navItems: NavItem[] = [
    {
      path:  '/staff/dashboard',
      icon:  <HomeIcon />,
      label: 'หน้าหลัก',
    },
    {
      path:  '/staff/notifications',
      icon:  <BellIcon />,
      label: 'แจ้งเตือน',
      badge: pendingCount,
    },
    {
      path:  '/staff/me',
      icon:  <UserIcon />,
      label: 'โปรไฟล์',
    },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* Backdrop blur bar */}
      <div className="bg-gray-50/90 backdrop-blur-xl border-t border-gray-200">
        <div className="flex items-stretch max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center gap-1',
                  'py-3 px-2 transition-all duration-200',
                  'no-tap-highlight active:scale-95',
                  active
                    ? 'text-amber-400'
                    : 'text-gray-500 hover:text-gray-700',
                )}
                aria-label={item.label}
              >
                {/* Icon + badge wrapper */}
                <div className="relative">
                  <div
                    className={clsx(
                      'transition-transform duration-200',
                      active && 'scale-110',
                    )}
                  >
                    {item.icon}
                  </div>

                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={clsx(
                        'absolute -top-1.5 -right-1.5',
                        'min-w-[18px] h-[18px] px-1',
                        'flex items-center justify-center',
                        'bg-amber-500 text-black rounded-full',
                        'font-kanit font-bold text-[10px] leading-none',
                        'animate-bounce-in',
                      )}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={clsx(
                    'font-sarabun text-[10px] leading-none transition-colors',
                    active ? 'text-amber-400' : 'text-gray-500',
                  )}
                >
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {active && (
                  <div className="w-1 h-1 rounded-full bg-amber-400 absolute bottom-1" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

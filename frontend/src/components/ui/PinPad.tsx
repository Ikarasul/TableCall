import { useState, useCallback } from 'react'
import clsx from 'clsx'

interface PinPadProps {
  onComplete:  (pin: string) => void
  disabled?:   boolean
  error?:      boolean
  maxLength?:  number
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'OK', '0', '⌫']

export default function PinPad({
  onComplete,
  disabled  = false,
  error     = false,
  maxLength = 12,
}: PinPadProps) {
  const [pin, setPin] = useState<string>('')
  const [shaking, setShaking] = useState(false)

  const triggerShake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 600)
  }, [])

  // Auto-shake when error changes to true
  if (error && !shaking && pin.length > 0) {
    // Handled by parent via error prop – reset pin
  }

  const handleKey = useCallback((key: string) => {
    if (disabled) return

    if (key === 'OK') {
      if (pin.length >= 6) {
        onComplete(pin)
        // Reset after short delay to allow animation
        setTimeout(() => setPin(''), 300)
      } else {
        triggerShake()
      }
      return
    }

    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1))
      return
    }

    if (pin.length >= maxLength) return

    const newPin = pin + key
    setPin(newPin)
  }, [pin, disabled, maxLength, onComplete, triggerShake])

  return (
    <div className="flex flex-col items-center gap-8 select-none">
      {/* PIN dots display */}
      <div
        className={clsx(
          'flex gap-2 items-center flex-wrap justify-center max-w-[260px]',
          (error || shaking) && 'animate-shake',
        )}
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'w-4 h-4 rounded-full transition-all duration-200',
              i < pin.length
                ? error
                  ? 'bg-red-500 scale-110'
                  : 'bg-amber-400 scale-110 shadow-glow-amber'
                : 'bg-zinc-700 border border-zinc-600',
            )}
          />
        ))}
      </div>

      {/* Numpad grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[340px] px-4">
        {KEYS.map((key, idx) => {
          const isEmpty    = key === ''
          const isBackspace = key === '⌫'

          if (isEmpty) {
            return <div key={idx} />
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleKey(key)}
              disabled={disabled}
              className={clsx(
                'h-20 rounded-2xl font-kanit font-semibold flex items-center justify-center',
                'transition-all duration-150 active:scale-90',
                'no-tap-highlight touch-none select-none',
                disabled && 'opacity-40 cursor-not-allowed',
                isBackspace
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-gray-700'
                  : 'bg-gray-200 hover:bg-zinc-700 active:bg-zinc-600 text-gray-900 text-3xl',
                // Amber glow on press for number keys
                !isBackspace && !disabled && 'hover:shadow-glow-amber/30',
              )}
              aria-label={isBackspace ? 'ลบ' : `ตัวเลข ${key}`}
            >
              {isBackspace ? (
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z"
                  />
                </svg>
              ) : (
                key
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

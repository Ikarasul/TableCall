/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand amber/warm
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // App surface colors
        surface: {
          DEFAULT: '#1a1a1a',
          50:  '#2a2a2a',
          100: '#252525',
          200: '#1f1f1f',
          300: '#1a1a1a',
          400: '#141414',
          500: '#0f0f0f',
        },
        // Status colors
        status: {
          idle:    '#3f3f46',
          calling: '#f59e0b',
          bill:    '#10b981',
          danger:  '#ef4444',
        },
      },
      fontFamily: {
        kanit:  ['Kanit', 'sans-serif'],
        sarabun: ['Sarabun', 'sans-serif'],
        sans:   ['Sarabun', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'pulse-slow':    'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-amber':   'pulseAmber 2s ease-in-out infinite',
        'pulse-green':   'pulseGreen 2s ease-in-out infinite',
        'shake':         'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'slide-out-right':'slideOutRight 0.3s ease-in forwards',
        'fade-in':       'fadeIn 0.2s ease-out',
        'fade-out':      'fadeOut 0.2s ease-in forwards',
        'scale-in':      'scaleIn 0.15s ease-out',
        'bounce-in':     'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        pulseAmber: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.4)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(245, 158, 11, 0)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(16, 185, 129, 0)' },
        },
        shake: {
          '10%, 90%':  { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%':  { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%':  { transform: 'translate3d(4px, 0, 0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)',    opacity: '1' },
          to:   { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        bounceIn: {
          from: { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          to:   { transform: 'scale(1)',   opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red':   '0 0 20px rgba(239, 68, 68, 0.3)',
        'glass':      '0 8px 32px rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
}

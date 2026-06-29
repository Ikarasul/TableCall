// Global AudioContext singleton
let globalAudioCtx: AudioContext | null = null

// Initialize or resume AudioContext on user interaction
const unlockAudio = () => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) return

  if (!globalAudioCtx) {
    globalAudioCtx = new AudioContextClass()
  }

  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume()
  }
}

// Attach to common user interactions to unlock audio
if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudio, { once: true })
  window.addEventListener('touchstart', unlockAudio, { once: true })
  window.addEventListener('keydown', unlockAudio, { once: true })
}

export const playNotificationSound = () => {
  try {
    // 1. Try to vibrate on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // 2. Play Web Audio API sound
    if (!globalAudioCtx) {
      unlockAudio()
    }
    
    const ctx = globalAudioCtx
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = 'sine'
    // Play a pleasant "ding" sound
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1) // A6
    
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {
    console.error('Failed to play notification sound', e)
  }
}

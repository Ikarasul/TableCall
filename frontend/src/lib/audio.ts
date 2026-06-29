export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
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

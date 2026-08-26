// Duration Wave's zero alarm (PRD §5.1) — synthesized via Web Audio so no
// audio asset needs to ship with the app. Three short beeps.
export function playAlarmSound() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  const ctx = new Ctx()
  const beepAt = (startOffset: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime + startOffset)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + startOffset)
    osc.stop(ctx.currentTime + startOffset + 0.25)
  }
  beepAt(0)
  beepAt(0.35)
  beepAt(0.7)
}

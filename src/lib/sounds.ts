// Tiny synthesized sounds (no audio files). Safe to call before a user gesture: it just no-ops.

import type { Judgment } from '../analysis/judge'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const c = audio()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, c.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

export function playJudgment(j: Judgment): void {
  switch (j) {
    case 'brilliant':
      tone(660, 0, 0.12)
      tone(880, 0.1, 0.12)
      tone(1320, 0.2, 0.25)
      break
    case 'great':
      tone(740, 0, 0.12)
      tone(988, 0.11, 0.22)
      break
    case 'best':
      tone(880, 0, 0.14)
      break
    case 'blunder':
      tone(160, 0, 0.3, 'sawtooth', 0.08)
      tone(120, 0.12, 0.35, 'sawtooth', 0.08)
      break
    case 'mistake':
    case 'miss':
      tone(220, 0, 0.25, 'triangle', 0.1)
      break
    case 'inaccuracy':
      tone(330, 0, 0.15, 'triangle', 0.08)
      break
    default:
      break
  }
}

export function playFanfare(): void {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]
  notes.forEach((f, i) => tone(f, i * 0.13, i === notes.length - 1 ? 0.6 : 0.16, 'triangle', 0.14))
  tone(262, 0, 0.9, 'sine', 0.06)
}

export function playMove(capture: boolean): void {
  if (capture) tone(180, 0, 0.08, 'square', 0.06)
  else tone(420, 0, 0.05, 'triangle', 0.05)
}

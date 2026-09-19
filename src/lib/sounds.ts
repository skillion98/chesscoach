// Synthesized sound effects with a small room reverb: wooden piece clicks, applause, chimes.
// No audio files; everything is generated with the Web Audio API. Safe before a user gesture (no-ops).

import type { Judgment } from '../analysis/judge'

type Ctx = AudioContext | OfflineAudioContext

let live: AudioContext | null = null
let liveBus: { dry: GainNode; wet: GainNode } | null = null

function audio(): AudioContext | null {
  try {
    if (!live) {
      live = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      liveBus = makeBus(live)
    }
    if (live.state === 'suspended') void live.resume()
    return live
  } catch {
    return null
  }
}

/** Dry path plus a convolver reverb (exponentially decaying noise impulse) for a little room. */
function makeBus(ctx: Ctx): { dry: GainNode; wet: GainNode } {
  const dry = ctx.createGain()
  dry.gain.value = 1
  dry.connect(ctx.destination)
  const conv = ctx.createConvolver()
  const seconds = 1.1
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6.5) * (1 - Math.exp(-t * 400))
    }
  }
  conv.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.22
  wet.connect(conv)
  conv.connect(ctx.destination)
  return { dry, wet }
}

function noiseBuffer(ctx: Ctx, seconds: number): AudioBuffer {
  const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

function out(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, node: AudioNode, wetAmount = 1) {
  node.connect(bus.dry)
  if (wetAmount > 0) {
    const g = ctx.createGain()
    g.gain.value = wetAmount
    node.connect(g)
    g.connect(bus.wet)
  }
}

/** One piece landing on a wooden board. */
function knock(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, t: number, opts: { gain?: number; pitch?: number; hard?: number } = {}) {
  const gain = opts.gain ?? 0.65
  const pitch = opts.pitch ?? 1
  const hard = opts.hard ?? 1
  // the click: a very short band-passed noise burst
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx, 0.06)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2600 * pitch
  bp.Q.value = 0.9
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0, t)
  ng.gain.linearRampToValueAtTime(0.55 * gain * hard, t + 0.002)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.045)
  n.connect(bp)
  bp.connect(ng)
  out(ctx, bus, ng, 0.8)
  n.start(t)
  n.stop(t + 0.08)
  // the wooden body: a low damped tone that drops in pitch
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(210 * pitch, t)
  o.frequency.exponentialRampToValueAtTime(95 * pitch, t + 0.09)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0, t)
  og.gain.linearRampToValueAtTime(0.5 * gain, t + 0.003)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  o.connect(og)
  out(ctx, bus, og, 0.5)
  o.start(t)
  o.stop(t + 0.15)
  // a hint of the board resonating
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.value = 640 * pitch
  const g2 = ctx.createGain()
  g2.gain.setValueAtTime(0, t)
  g2.gain.linearRampToValueAtTime(0.08 * gain, t + 0.002)
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
  o2.connect(g2)
  out(ctx, bus, g2, 0.6)
  o2.start(t)
  o2.stop(t + 0.1)
}

export interface MoveSound {
  capture?: boolean
  check?: boolean
  castle?: boolean
}

function scheduleMove(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, t: number, m: MoveSound) {
  const jitter = 0.94 + Math.random() * 0.12
  if (m.castle) {
    knock(ctx, bus, t, { pitch: jitter, gain: 0.6 })
    knock(ctx, bus, t + 0.11, { pitch: jitter * 0.92, gain: 0.55 })
  } else if (m.capture) {
    // the captured piece is knocked aside, then ours lands
    knock(ctx, bus, t, { pitch: jitter * 1.15, gain: 0.45, hard: 1.2 })
    knock(ctx, bus, t + 0.055, { pitch: jitter * 0.9, gain: 0.75 })
  } else {
    knock(ctx, bus, t, { pitch: jitter })
  }
  if (m.check) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = 1480
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t + 0.06)
    g.gain.linearRampToValueAtTime(0.09, t + 0.07)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    o.connect(g)
    out(ctx, bus, g, 1.2)
    o.start(t + 0.06)
    o.stop(t + 0.4)
  }
}

/** Applause: hundreds of randomized micro-claps with a swell, under a crowd murmur. */
function scheduleApplause(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, t0: number, seconds = 4.2) {
  const clapBuf = noiseBuffer(ctx, 0.03)
  const envelope = (t: number) => {
    // rise over 0.5s, hold, fade over the last 1.5s
    const up = Math.min(1, t / 0.5)
    const down = t > seconds - 1.5 ? Math.max(0, (seconds - t) / 1.5) : 1
    return up * down
  }
  let t = 0
  while (t < seconds) {
    const e = envelope(t)
    // clap density ~ 45 per second at full swell
    const n = ctx.createBufferSource()
    n.buffer = clapBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1200 + Math.random() * 2600
    bp.Q.value = 1.5 + Math.random() * 2
    const g = ctx.createGain()
    const peak = (0.3 + Math.random() * 0.35) * e
    g.gain.setValueAtTime(0, t0 + t)
    g.gain.linearRampToValueAtTime(peak, t0 + t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + t + 0.02 + Math.random() * 0.03)
    n.connect(bp)
    bp.connect(g)
    out(ctx, bus, g, 1.6)
    n.start(t0 + t)
    n.stop(t0 + t + 0.06)
    t += 0.012 + Math.random() * 0.03 * (1.6 - e)
  }
  // crowd murmur: low-passed noise following the same envelope
  const m = ctx.createBufferSource()
  m.buffer = noiseBuffer(ctx, seconds)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  const mg = ctx.createGain()
  mg.gain.setValueAtTime(0, t0)
  mg.gain.linearRampToValueAtTime(0.14, t0 + 0.6)
  mg.gain.setValueAtTime(0.14, t0 + seconds - 1.5)
  mg.gain.linearRampToValueAtTime(0, t0 + seconds)
  m.connect(lp)
  lp.connect(mg)
  out(ctx, bus, mg, 1.4)
  m.start(t0)
  m.stop(t0 + seconds + 0.1)
}

function tone(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.16) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  o.connect(g)
  out(ctx, bus, g, 0.9)
  o.start(start)
  o.stop(start + dur + 0.05)
}

function scheduleFanfare(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, t0: number) {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]
  notes.forEach((f, i) => tone(ctx, bus, f, t0 + i * 0.13, i === notes.length - 1 ? 0.7 : 0.16, 'triangle', 0.16))
  tone(ctx, bus, 262, t0, 1.0, 'sine', 0.07)
}

function scheduleJudgment(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, t: number, j: Judgment) {
  switch (j) {
    case 'brilliant':
      tone(ctx, bus, 660, t, 0.12)
      tone(ctx, bus, 880, t + 0.1, 0.12)
      tone(ctx, bus, 1320, t + 0.2, 0.3)
      break
    case 'great':
      tone(ctx, bus, 740, t, 0.12)
      tone(ctx, bus, 988, t + 0.11, 0.25)
      break
    case 'best':
      tone(ctx, bus, 880, t, 0.14, 'sine', 0.08)
      break
    case 'blunder':
      tone(ctx, bus, 150, t, 0.35, 'sawtooth', 0.09)
      tone(ctx, bus, 110, t + 0.14, 0.4, 'sawtooth', 0.09)
      break
    case 'mistake':
    case 'miss':
      tone(ctx, bus, 220, t, 0.28, 'triangle', 0.08)
      break
    case 'inaccuracy':
      tone(ctx, bus, 330, t, 0.16, 'triangle', 0.06)
      break
    default:
      break
  }
}

function scheduleLoss(ctx: Ctx, bus: { dry: GainNode; wet: GainNode }, t: number) {
  tone(ctx, bus, 392, t, 0.35, 'triangle', 0.12)
  tone(ctx, bus, 330, t + 0.3, 0.45, 'triangle', 0.12)
  tone(ctx, bus, 262, t + 0.6, 0.8, 'triangle', 0.1)
}

// ---------------- live API ----------------

export function playMove(m: MoveSound | boolean): void {
  const c = audio()
  if (!c || !liveBus) return
  const opts: MoveSound = typeof m === 'boolean' ? { capture: m } : m
  scheduleMove(c, liveBus, c.currentTime, opts)
}

export function playJudgment(j: Judgment): void {
  const c = audio()
  if (!c || !liveBus) return
  scheduleJudgment(c, liveBus, c.currentTime, j)
}

/** Win: applause with a short fanfare on top. */
export function playWin(): void {
  const c = audio()
  if (!c || !liveBus) return
  scheduleApplause(c, liveBus, c.currentTime)
  scheduleFanfare(c, liveBus, c.currentTime + 0.35)
}

export function playLoss(): void {
  const c = audio()
  if (!c || !liveBus) return
  scheduleLoss(c, liveBus, c.currentTime)
}

export function playFanfare(): void {
  playWin()
}

/** Render a sound to a WAV blob (for previews and tests). */
export type PreviewKind = 'move' | 'capture' | 'castle' | 'check' | 'win' | 'loss' | 'brilliant' | 'blunder'
export async function renderPreview(kind: PreviewKind, sampleRate = 44100, channels = 2): Promise<Blob> {
  const seconds = kind === 'win' ? 6 : kind === 'loss' ? 2 : 1.4
  const ctx = new OfflineAudioContext(channels, Math.floor(sampleRate * seconds), sampleRate)
  const bus = makeBus(ctx)
  const t = 0.05
  if (kind === 'move') scheduleMove(ctx, bus, t, {})
  else if (kind === 'capture') scheduleMove(ctx, bus, t, { capture: true })
  else if (kind === 'castle') scheduleMove(ctx, bus, t, { castle: true })
  else if (kind === 'check') scheduleMove(ctx, bus, t, { check: true })
  else if (kind === 'win') {
    scheduleApplause(ctx, bus, t)
    scheduleFanfare(ctx, bus, t + 0.35)
  } else if (kind === 'loss') scheduleLoss(ctx, bus, t)
  else scheduleJudgment(ctx, bus, t, kind)
  const buf = await ctx.startRendering()
  return wav(buf)
}

function wav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels
  const len = buf.length
  const data = new ArrayBuffer(44 + len * ch * 2)
  const v = new DataView(data)
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + len * ch * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, ch, true)
  v.setUint32(24, buf.sampleRate, true)
  v.setUint32(28, buf.sampleRate * ch * 2, true)
  v.setUint16(32, ch * 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, len * ch * 2, true)
  let o = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++, o += 2) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]))
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }
  return new Blob([data], { type: 'audio/wav' })
}

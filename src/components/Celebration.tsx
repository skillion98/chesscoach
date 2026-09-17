import { useEffect, useRef } from 'react'

interface Props {
  /** total show length in ms */
  duration?: number
  onDone?: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  kind: 'spark' | 'confetti' | 'tape'
  w: number
  h: number
  rot: number
  vr: number
}

const COLORS = ['#f7c631', '#ff7769', '#26c2a3', '#5b8def', '#ffffff', '#d4a24c', '#fa412d', '#81b64c']

/** Fireworks, confetti, and ticker tape on a full-screen canvas. Tap to dismiss. */
export default function Celebration({ duration = 5200, onDone }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      const t = window.setTimeout(() => doneRef.current?.(), 1200)
      return () => window.clearTimeout(t)
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const parts: Particle[] = []
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)]

    const burst = (x: number, y: number) => {
      const color = pick()
      const n = 70
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05)
        const sp = rand(1.5, 5.5)
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, maxLife: rand(50, 90), color: Math.random() < 0.8 ? color : '#fff', kind: 'spark', w: 2.2, h: 2.2, rot: 0, vr: 0 })
      }
    }
    const confetti = (count: number) => {
      for (let i = 0; i < count; i++) {
        const tape = Math.random() < 0.3
        parts.push({
          x: rand(0, W),
          y: rand(-40, -10),
          vx: rand(-0.6, 0.6),
          vy: rand(1.2, 2.8),
          life: 0,
          maxLife: rand(220, 320),
          color: pick(),
          kind: tape ? 'tape' : 'confetti',
          w: tape ? 4 : rand(6, 10),
          h: tape ? rand(28, 60) : rand(6, 10),
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.12, 0.12),
        })
      }
    }

    const start = performance.now()
    let last = start
    let raf = 0
    let nextBurst = 0
    let nextConfetti = 0
    const tick = (now: number) => {
      const t = now - start
      const dt = Math.min(2, (now - last) / 16.67)
      last = now
      if (t < duration - 1500) {
        if (now >= nextBurst) {
          burst(rand(W * 0.15, W * 0.85), rand(H * 0.12, H * 0.45))
          nextBurst = now + rand(260, 620)
        }
        if (now >= nextConfetti) {
          confetti(14)
          nextConfetti = now + 120
        }
      }
      ctx.clearRect(0, 0, W, H)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.life += dt
        if (p.kind === 'spark') {
          p.vy += 0.05 * dt
          p.vx *= 0.985
          p.vy *= 0.985
        } else {
          p.vx += Math.sin((p.life + p.rot * 10) / 14) * 0.03 * dt
          p.rot += p.vr * dt
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        const k = 1 - p.life / p.maxLife
        if (k <= 0 || p.y > H + 60) {
          parts.splice(i, 1)
          continue
        }
        ctx.globalAlpha = p.kind === 'spark' ? Math.max(0, k) : Math.min(1, k * 3)
        ctx.fillStyle = p.color
        if (p.kind === 'spark') {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.w, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
      }
      ctx.globalAlpha = 1
      if (t < duration || parts.length > 0) raf = requestAnimationFrame(tick)
      else doneRef.current?.()
    }
    raf = requestAnimationFrame(tick)
    const stop = window.setTimeout(() => doneRef.current?.(), duration + 2500)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(stop)
    }
  }, [duration])

  return <canvas ref={ref} className="celebration" onClick={() => doneRef.current?.()} aria-hidden="true" />
}

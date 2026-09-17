import { useRef } from 'react'
import type { Judgment, Side } from '../analysis/analyze'

interface Props {
  /** white-perspective evals for positions 0..n */
  evals: number[]
  /** currently shown position index */
  ply: number
  perspective: Side
  marks: { ply: number; judgment: Judgment; mine: boolean }[]
  onSelect: (ply: number) => void
}

const W = 320
const H = 72
const CAP = 500

export default function EvalGraph({ evals, ply, perspective, marks, onSelect }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const n = evals.length
  if (n < 2) return null
  const sign = perspective === 'w' ? 1 : -1
  const x = (i: number) => (i / (n - 1)) * W
  const y = (cp: number) => {
    const v = Math.max(-CAP, Math.min(CAP, cp * sign))
    return H / 2 - (v / CAP) * (H / 2 - 4)
  }
  const pts = evals.map((e, i) => `${x(i).toFixed(1)},${y(e).toFixed(1)}`)
  const area = `M0,${H / 2} L${pts.join(' L')} L${W},${H / 2} Z`
  const line = `M${pts.join(' L')}`

  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    onSelect(Math.round(frac * (n - 1)))
  }

  return (
    <svg
      ref={ref}
      className="evalgraph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onPointerDown={(e) => {
        pick(e.clientX)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (e.buttons) pick(e.clientX)
      }}
      role="img"
      aria-label="Evaluation over the game"
    >
      <defs>
        <clipPath id="eg-top">
          <rect x="0" y="0" width={W} height={H / 2} />
        </clipPath>
        <clipPath id="eg-bottom">
          <rect x="0" y={H / 2} width={W} height={H / 2} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} className="eg-bg" />
      <path d={area} className="eg-area-good" clipPath="url(#eg-top)" />
      <path d={area} className="eg-area-bad" clipPath="url(#eg-bottom)" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="eg-mid" />
      <path d={line} className="eg-line" />
      {marks.map((m) => (
        <circle
          key={m.ply}
          cx={x(m.ply)}
          cy={y(evals[m.ply])}
          r={m.mine ? 3.2 : 2.2}
          className={`eg-mark ${m.judgment}${m.mine ? ' mine' : ''}`}
        />
      ))}
      <line x1={x(ply)} y1="0" x2={x(ply)} y2={H} className="eg-cursor" />
    </svg>
  )
}

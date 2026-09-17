import type { Axis } from '../coach/assess'

interface Props {
  axes: Axis[]
  size?: number
}

/** Six-axis radar. Axes without data are drawn hollow at the center. */
export default function Radar({ axes, size = 300 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const n = axes.length
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, v: number): [number, number] => [cx + r * v * Math.cos(angle(i)), cy + r * v * Math.sin(angle(i))]
  const ring = (v: number) =>
    axes
      .map((_, i) => pt(i, v))
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')
  const shape = axes
    .map((a, i) => pt(i, a.score === null ? 0 : a.score / 100))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const hasAny = axes.some((a) => a.score !== null)

  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Skill radar">
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ring(v)} className="radar-ring" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="radar-spoke" />
      })}
      {hasAny && <polygon points={shape} className="radar-shape" />}
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.score === null ? 0 : a.score / 100)
        return <circle key={a.key} cx={x} cy={y} r={a.score === null ? 3 : 4.5} className={'radar-dot' + (a.score === null ? ' empty' : '')} />
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1.24)
        const anchor = Math.abs(Math.cos(angle(i))) < 0.2 ? 'middle' : Math.cos(angle(i)) > 0 ? 'start' : 'end'
        return (
          <g key={a.key}>
            <text x={x} y={y - 4} textAnchor={anchor} className="radar-label">
              {a.label}
            </text>
            <text x={x} y={y + 12} textAnchor={anchor} className={'radar-value' + (a.score === null ? ' muted' : '')}>
              {a.score === null ? '–' : a.score}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

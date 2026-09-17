import { useEffect, useRef } from 'react'

interface Props {
  moves: string[]
  /** number of plies currently shown on the board */
  ply?: number
  onSelect?: (ply: number) => void
}

export default function MoveList({ moves, ply, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const current = ply ?? moves.length

  useEffect(() => {
    const active = ref.current?.querySelector('.move.active')
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current, moves.length])

  const rows: { n: number; w?: string; b?: string; wi: number; bi: number }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: moves[i], b: moves[i + 1], wi: i + 1, bi: i + 2 })
  }

  return (
    <div className="movelist" ref={ref}>
      {rows.length === 0 && <span className="muted">No moves yet</span>}
      {rows.map((r) => (
        <span key={r.n} className="move-row">
          <span className="move-num">{r.n}.</span>
          <button
            type="button"
            className={'move' + (current === r.wi ? ' active' : '')}
            onClick={() => onSelect?.(r.wi)}
          >
            {r.w}
          </button>
          {r.b && (
            <button
              type="button"
              className={'move' + (current === r.bi ? ' active' : '')}
              onClick={() => onSelect?.(r.bi)}
            >
              {r.b}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

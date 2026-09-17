import { useEffect, useRef } from 'react'

export interface MoveMark {
  symbol: string
  cls: string
}

interface Props {
  moves: string[]
  /** number of plies currently shown on the board */
  ply?: number
  onSelect?: (ply: number) => void
  /** annotations keyed by 1-based ply */
  marks?: Record<number, MoveMark>
}

/** One horizontal, swipeable line of moves. Scrolls itself, never the page. */
export default function MoveList({ moves, ply, onSelect, marks }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const current = ply ?? moves.length

  useEffect(() => {
    const box = ref.current
    const active = box?.querySelector<HTMLElement>('.move.active') ?? box?.querySelector<HTMLElement>('.move-row:last-child')
    if (!box || !active) return
    const target = active.offsetLeft - box.clientWidth / 2 + active.offsetWidth / 2
    box.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [current, moves.length])

  const rows: { n: number; w?: string; b?: string; wi: number; bi: number }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: moves[i], b: moves[i + 1], wi: i + 1, bi: i + 2 })
  }

  const btn = (san: string, p: number) => {
    const mk = marks?.[p]
    return (
      <button
        type="button"
        className={'move' + (current === p ? ' active' : '') + (mk ? ' ' + mk.cls : '')}
        onClick={() => onSelect?.(p)}
      >
        {san}
        {mk?.symbol}
      </button>
    )
  }

  return (
    <div className="movelist" ref={ref}>
      {rows.length === 0 && <span className="muted">No moves yet</span>}
      {rows.map((r) => (
        <span key={r.n} className="move-row">
          <span className="move-num">{r.n}.</span>
          {r.w && btn(r.w, r.wi)}
          {r.b && btn(r.b, r.bi)}
        </span>
      ))}
    </div>
  )
}

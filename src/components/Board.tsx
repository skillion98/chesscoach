import { useEffect, useRef } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'

export type CgColor = 'white' | 'black'

export interface BoardProps {
  fen: string
  orientation: CgColor
  turnColor: CgColor
  dests?: Map<Key, Key[]>
  movableColor?: CgColor
  lastMove?: Key[]
  check?: boolean
  viewOnly?: boolean
  shapes?: DrawShape[]
  onMove?: (from: Key, to: Key) => void
}

const NO_SHAPES: DrawShape[] = []

export default function Board(props: BoardProps) {
  const el = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  const onMoveRef = useRef(props.onMove)
  onMoveRef.current = props.onMove

  const { fen, orientation, turnColor, dests, movableColor, lastMove, check, viewOnly, shapes } = props

  const buildConfig = (): Config => ({
    fen,
    orientation,
    turnColor,
    lastMove,
    check: check ?? false,
    viewOnly: viewOnly ?? false,
    coordinates: true,
    animation: { enabled: true, duration: 180 },
    movable: {
      free: false,
      color: viewOnly ? undefined : movableColor,
      dests: dests ?? new Map(),
      showDests: true,
      events: { after: (orig, dest) => onMoveRef.current?.(orig, dest) },
    },
    premovable: { enabled: false },
    draggable: { enabled: true, showGhost: true },
    selectable: { enabled: true },
    highlight: { lastMove: true, check: true },
    drawable: { enabled: false, visible: true, autoShapes: shapes ?? NO_SHAPES },
  })

  useEffect(() => {
    if (!el.current) return
    api.current = Chessground(el.current, buildConfig())
    return () => {
      api.current?.destroy()
      api.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.current?.set(buildConfig())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, orientation, turnColor, dests, movableColor, lastMove, check, viewOnly, shapes])

  return (
    <div className="board">
      <div ref={el} className="board-host" />
    </div>
  )
}

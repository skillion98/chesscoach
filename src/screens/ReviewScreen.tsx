import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '../components/Board'
import MoveList from '../components/MoveList'
import { cgColor } from '../game/chessUtil'
import { db, type GameRecord } from '../lib/db'
import { opponentLabel } from './GamesScreen'

interface Props {
  id: number
}

export default function ReviewScreen({ id }: Props) {
  const [game, setGame] = useState<GameRecord | null | undefined>(undefined)
  const [ply, setPly] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    db.games.get(id).then((g) => {
      setGame(g ?? null)
      setPly(g?.moves.length ?? 0)
    })
  }, [id])

  const pos = useMemo(() => {
    const c = new Chess()
    let last: Key[] | undefined
    if (game) {
      for (let i = 0; i < ply && i < game.moves.length; i++) {
        const m = c.move(game.moves[i])
        last = [m.from as Key, m.to as Key]
      }
    }
    return { fen: c.fen(), turn: c.turn(), check: c.inCheck(), last }
  }, [game, ply])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setPly((p) => Math.min(game?.moves.length ?? 0, p + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game])

  if (game === undefined) return <div className="screen muted">Loading…</div>
  if (game === null) return <div className="screen muted">Game not found.</div>

  const total = game.moves.length
  const orientation = cgColor(flipped ? (game.playerColor === 'w' ? 'b' : 'w') : game.playerColor)

  return (
    <div className="screen play">
      <div className="play-bar">
        <div>
          <div className="bar-title">
            {game.playerColor === 'w' ? 'White' : 'Black'} vs {opponentLabel(game)}
          </div>
          <div className="muted small">
            {game.result} · {game.termination}
            {game.rated === false ? ' · unrated' : ''}
          </div>
        </div>
        <div className="bar-right">
          <div className="bar-title">{game.ratingAfter}</div>
          <div className="muted small">{new Date(game.playedAt).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="board-wrap">
        <Board
          fen={pos.fen}
          orientation={orientation}
          turnColor={cgColor(pos.turn)}
          lastMove={pos.last}
          check={pos.check}
          viewOnly
        />
      </div>
      <MoveList moves={game.moves} ply={ply} onSelect={setPly} />
      <div className="btn-row">
        <button type="button" onClick={() => setPly(0)} disabled={ply === 0}>⏮</button>
        <button type="button" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0}>◀</button>
        <button type="button" onClick={() => setPly((p) => Math.min(total, p + 1))} disabled={ply === total}>▶</button>
        <button type="button" onClick={() => setPly(total)} disabled={ply === total}>⏭</button>
        <button type="button" onClick={() => setFlipped((f) => !f)}>Flip</button>
      </div>
    </div>
  )
}

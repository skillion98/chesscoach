import { useEffect, useState } from 'react'
import { db, type GameRecord } from '../lib/db'
import { bandFor } from '../game/levels'
import { navigate } from '../lib/router'

function outcomeLabel(g: GameRecord): { text: string; cls: string } {
  if (g.result === '1/2-1/2') return { text: 'Draw', cls: 'draw' }
  const won = (g.result === '1-0') === (g.playerColor === 'w')
  return won ? { text: 'Win', cls: 'win' } : { text: 'Loss', cls: 'loss' }
}

export function opponentLabel(g: GameRecord): string {
  return `${bandFor(g.opponentElo).glyph} ${g.opponentElo}`
}

export default function GamesScreen() {
  const [games, setGames] = useState<GameRecord[] | null>(null)

  useEffect(() => {
    db.games.orderBy('playedAt').reverse().toArray().then(setGames)
  }, [])

  if (!games) return <div className="screen muted">Loading…</div>

  return (
    <div className="screen">
      {games.length === 0 && <p className="muted">No games yet. Play one and it will show up here.</p>}
      <ul className="game-list">
        {games.map((g) => {
          const o = outcomeLabel(g)
          const delta = g.ratingAfter - g.ratingBefore
          return (
            <li key={g.id}>
              <button type="button" className="game-row" onClick={() => navigate(`/games/${g.id}`)}>
                <span className={'badge ' + o.cls}>{o.text}</span>
                <span className="game-main">
                  <span>
                    {g.playerColor === 'w' ? 'White' : 'Black'} vs {opponentLabel(g)}
                  </span>
                  <span className="muted small">
                    {new Date(g.playedAt).toLocaleDateString()} · {g.termination} · {Math.ceil(g.moves.length / 2)} moves
                  </span>
                  {g.opening && <span className="muted small">{g.opening.name}</span>}
                </span>
                {g.rated === false ? (
                  <span className="tag">Unrated</span>
                ) : (
                  <span className={'delta ' + (delta >= 0 ? 'up' : 'down')}>
                    {delta >= 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

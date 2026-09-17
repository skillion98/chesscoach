import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '../components/Board'
import MoveList from '../components/MoveList'
import { getEngine } from '../engine/stockfish'
import { LEVELS, getLevel, type Level } from '../game/levels'
import { chooseMove } from '../game/choose'
import { cgColor, computeDests, gameStatus, isPromotion, legalUci, uciToMove, type Status } from '../game/chessUtil'
import { updateRating } from '../game/rating'
import { db, getSetting, saveProfile, setSetting, type Color, type GameRecord, type Profile } from '../lib/db'
import { navigate } from '../lib/router'

type Phase = 'setup' | 'playing' | 'over'
type ColorChoice = 'w' | 'b' | 'random'

interface Props {
  profile: Profile
  onProfile: (p: Profile) => void
}

interface Outcome {
  status: Status
  ratingBefore: number
  ratingAfter: number
  gameId: number
}

const MIN_THINK_MS = 450

export default function PlayScreen({ profile, onProfile }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [levelId, setLevelId] = useState(5)
  const [colorChoice, setColorChoice] = useState<ColorChoice>('w')

  const chessRef = useRef(new Chess())
  const tokenRef = useRef(0)
  const levelRef = useRef<Level>(getLevel(5))
  const playerColorRef = useRef<Color>('w')
  const profileRef = useRef(profile)
  profileRef.current = profile

  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [level, setLevel] = useState<Level>(getLevel(5))
  const [fen, setFen] = useState(chessRef.current.fen())
  const [moves, setMoves] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<Key[] | undefined>()
  const [thinking, setThinking] = useState(false)
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [engineReady, setEngineReady] = useState(false)

  useEffect(() => {
    getEngine()
      .whenReady()
      .then(() => setEngineReady(true))
    getSetting<number>('lastLevel', 5).then(setLevelId)
    getSetting<ColorChoice>('lastColor', 'w').then(setColorChoice)
  }, [])

  const sync = useCallback(() => {
    const c = chessRef.current
    setFen(c.fen())
    setMoves(c.history())
    const h = c.history({ verbose: true })
    const last = h[h.length - 1]
    setLastMove(last ? [last.from as Key, last.to as Key] : undefined)
  }, [])

  const finish = useCallback(
    async (status: Status) => {
      const pc = playerColorRef.current
      const lv = levelRef.current
      const prof = profileRef.current
      const score: 0 | 0.5 | 1 =
        status.result === '1/2-1/2' ? 0.5 : (status.result === '1-0') === (pc === 'w') ? 1 : 0
      const before = prof.rating
      const after = updateRating(before, lv.elo, score, prof.gamesPlayed)
      const rec: GameRecord = {
        playedAt: Date.now(),
        playerColor: pc,
        levelId: lv.id,
        result: status.result,
        termination: status.termination,
        moves: chessRef.current.history(),
        finalFen: chessRef.current.fen(),
        ratingBefore: before,
        ratingAfter: after,
      }
      const gameId = (await db.games.add(rec)) as number
      const next: Profile = {
        rating: after,
        gamesPlayed: prof.gamesPlayed + 1,
        peakRating: Math.max(prof.peakRating, after),
      }
      await saveProfile(next)
      onProfile(next)
      setThinking(false)
      setOutcome({ status, ratingBefore: before, ratingAfter: after, gameId })
      setPhase('over')
    },
    [onProfile],
  )

  const engineTurn = useCallback(async () => {
    const token = tokenRef.current
    const c = chessRef.current
    const lv = levelRef.current
    setThinking(true)
    const started = performance.now()
    let uci = ''
    try {
      const res = await getEngine().search(c.fen(), { movetime: lv.movetime, multipv: lv.multipv })
      uci = chooseMove(res.lines, res.bestMove, legalUci(c), lv)
    } catch {
      uci = legalUci(c)[0] ?? ''
    }
    const elapsed = performance.now() - started
    if (elapsed < MIN_THINK_MS) await new Promise((r) => setTimeout(r, MIN_THINK_MS - elapsed))
    if (token !== tokenRef.current) return
    setThinking(false)
    try {
      c.move(uciToMove(uci))
    } catch {
      const fallback = legalUci(c)[0]
      if (fallback) c.move(uciToMove(fallback))
    }
    sync()
    const st = gameStatus(c)
    if (st.over) void finish(st)
  }, [sync, finish])

  const startGame = useCallback(async () => {
    const lv = getLevel(levelId)
    const pc: Color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    tokenRef.current++
    chessRef.current = new Chess()
    levelRef.current = lv
    playerColorRef.current = pc
    setLevel(lv)
    setPlayerColor(pc)
    setFlipped(false)
    setOutcome(null)
    setPromo(null)
    sync()
    setPhase('playing')
    void setSetting('lastLevel', levelId)
    void setSetting('lastColor', colorChoice)
    const eng = getEngine()
    await eng.newGame()
    await eng.setOptions({ 'Skill Level': lv.skill })
    if (pc === 'b') void engineTurn()
  }, [levelId, colorChoice, sync, engineTurn])

  const playerMove = useCallback(
    (from: Key, to: Key, promotion?: string) => {
      const c = chessRef.current
      try {
        c.move({ from, to, promotion })
      } catch {
        sync()
        return
      }
      setPromo(null)
      sync()
      const st = gameStatus(c)
      if (st.over) {
        void finish(st)
        return
      }
      void engineTurn()
    },
    [sync, finish, engineTurn],
  )

  const onBoardMove = useCallback(
    (from: Key, to: Key) => {
      if (isPromotion(chessRef.current, from, to)) {
        setPromo({ from, to })
        return
      }
      playerMove(from, to)
    },
    [playerMove],
  )

  const resign = useCallback(() => {
    if (!window.confirm('Resign this game?')) return
    tokenRef.current++
    getEngine().stop()
    const pc = playerColorRef.current
    void finish({ over: true, result: pc === 'w' ? '0-1' : '1-0', termination: 'Resignation' })
  }, [finish])

  const abandon = useCallback(() => {
    if (phase === 'playing' && moves.length > 0 && !window.confirm('Leave this game? It will not be saved.')) return
    tokenRef.current++
    getEngine().stop()
    setPhase('setup')
    setOutcome(null)
  }, [phase, moves.length])

  const turn = chessRef.current.turn()
  const dests = useMemo(() => computeDests(chessRef.current), [fen]) // eslint-disable-line react-hooks/exhaustive-deps
  const inCheck = chessRef.current.inCheck()
  const orientation = cgColor(flipped ? (playerColor === 'w' ? 'b' : 'w') : playerColor)
  const canMove = phase === 'playing' && !thinking && turn === playerColor && !promo

  if (phase === 'setup') {
    return (
      <div className="screen">
        <h2>New game</h2>
        <section className="card">
          <h3>Opponent</h3>
          <div className="level-list">
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l.id}
                className={'level' + (l.id === levelId ? ' selected' : '')}
                onClick={() => setLevelId(l.id)}
              >
                <span className="level-name">
                  {l.id}. {l.name}
                </span>
                <span className="level-elo">~{l.elo}</span>
                <span className="level-blurb">{l.blurb}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="card">
          <h3>Your color</h3>
          <div className="seg">
            {(['w', 'random', 'b'] as ColorChoice[]).map((c) => (
              <button
                type="button"
                key={c}
                className={'seg-btn' + (colorChoice === c ? ' selected' : '')}
                onClick={() => setColorChoice(c)}
              >
                {c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}
              </button>
            ))}
          </div>
        </section>
        <button type="button" className="primary big" onClick={() => void startGame()} disabled={!engineReady}>
          {engineReady ? 'Start game' : 'Loading engine…'}
        </button>
        <p className="muted small">
          Your rating: <strong>{profile.rating}</strong> · {profile.gamesPlayed} games
        </p>
      </div>
    )
  }

  const promoPieces: { p: string; glyph: string }[] =
    playerColor === 'w'
      ? [
          { p: 'q', glyph: '♕' },
          { p: 'r', glyph: '♖' },
          { p: 'b', glyph: '♗' },
          { p: 'n', glyph: '♘' },
        ]
      : [
          { p: 'q', glyph: '♛' },
          { p: 'r', glyph: '♜' },
          { p: 'b', glyph: '♝' },
          { p: 'n', glyph: '♞' },
        ]

  const youWon = outcome && ((outcome.status.result === '1-0') === (playerColor === 'w')) && outcome.status.result !== '1/2-1/2'
  const delta = outcome ? outcome.ratingAfter - outcome.ratingBefore : 0

  return (
    <div className="screen play">
      <div className="play-bar">
        <div>
          <div className="bar-title">
            {level.name} <span className="muted">~{level.elo}</span>
          </div>
          <div className="muted small">{thinking ? 'Thinking…' : phase === 'over' ? 'Game over' : 'Your move'}</div>
        </div>
        <div className="bar-right">
          <div className="bar-title">{profile.rating}</div>
          <div className="muted small">you ({playerColor === 'w' ? 'White' : 'Black'})</div>
        </div>
      </div>

      <div className="board-wrap">
        <Board
          fen={fen}
          orientation={orientation}
          turnColor={cgColor(turn)}
          dests={dests}
          movableColor={canMove ? cgColor(playerColor) : undefined}
          lastMove={lastMove}
          check={inCheck}
          viewOnly={phase !== 'playing'}
          onMove={onBoardMove}
        />
        {promo && (
          <div className="promo">
            {promoPieces.map((pp) => (
              <button type="button" key={pp.p} onClick={() => playerMove(promo.from, promo.to, pp.p)}>
                {pp.glyph}
              </button>
            ))}
            <button type="button" className="cancel" onClick={() => { setPromo(null); sync() }}>
              ✕
            </button>
          </div>
        )}
      </div>

      <MoveList moves={moves} />

      {phase === 'playing' && (
        <div className="btn-row">
          <button type="button" onClick={() => setFlipped((f) => !f)}>Flip</button>
          <button type="button" onClick={resign} disabled={moves.length === 0}>Resign</button>
          <button type="button" onClick={abandon}>Quit</button>
        </div>
      )}

      {phase === 'over' && outcome && (
        <div className="card result">
          <h3>{outcome.status.result === '1/2-1/2' ? 'Draw' : youWon ? 'You won' : 'You lost'}</h3>
          <p className="muted">{outcome.status.termination}</p>
          <p>
            Rating {outcome.ratingBefore} → <strong>{outcome.ratingAfter}</strong>{' '}
            <span className={delta >= 0 ? 'up' : 'down'}>({delta >= 0 ? '+' : ''}{delta})</span>
          </p>
          <div className="btn-row">
            <button type="button" className="primary" onClick={() => void startGame()}>Rematch</button>
            <button type="button" onClick={() => setPhase('setup')}>Change level</button>
            <button type="button" onClick={() => navigate(`/games/${outcome.gameId}`)}>Review</button>
          </div>
        </div>
      )}
    </div>
  )
}

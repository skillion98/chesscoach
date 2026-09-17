import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import Avatar from '../components/Avatar'
import Board from '../components/Board'
import Icon from '../components/Icons'
import MoveList from '../components/MoveList'
import { getEngine } from '../engine/stockfish'
import { ELO_STEP, MAX_ELO, MIN_ELO, bandFor, clampElo, strengthFor, type Strength } from '../game/levels'
import { chooseMove } from '../game/choose'
import { computeHint, type Hint } from '../game/explain'
import { PERSONALITIES, choosePersonalityMove, personalityById, personalityStrength, type Personality } from '../game/personalities'
import { cgColor, computeDests, gameStatus, isPromotion, legalUci, uciToMove, type Status } from '../game/chessUtil'
import { updateRating } from '../game/rating'
import { db, getSetting, saveProfile, setSetting, type Color, type GameRecord, type Profile } from '../lib/db'
import { identifyOpening, recordGameAdherence } from '../openings/stats'
import { navigate } from '../lib/router'

type Phase = 'setup' | 'playing' | 'over'
type ColorChoice = 'w' | 'b' | 'random'
type Mode = 'personality' | 'custom'

interface Props {
  profile: Profile
  onProfile: (p: Profile) => void
}

interface Outcome {
  status: Status
  rated: boolean
  ratingBefore: number
  ratingAfter: number
  gameId: number
}

const MIN_THINK_MS = 450

function nearestPersonality(rating: number): Personality {
  return PERSONALITIES.reduce((a, b) => (Math.abs(b.elo - rating) < Math.abs(a.elo - rating) ? b : a))
}

export default function PlayScreen({ profile, onProfile }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<Mode>('personality')
  const [elo, setElo] = useState(() => clampElo(profile.rating))
  const [personalityId, setPersonalityId] = useState(() => nearestPersonality(profile.rating).id)
  const [colorChoice, setColorChoice] = useState<ColorChoice>('w')

  const chessRef = useRef(new Chess())
  const tokenRef = useRef(0)
  const strengthRef = useRef<Strength>(strengthFor(elo))
  const personalityRef = useRef<Personality | null>(null)
  const playerColorRef = useRef<Color>('w')
  const profileRef = useRef(profile)
  profileRef.current = profile
  const hintUsedRef = useRef(false)

  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [strength, setStrength] = useState<Strength>(strengthRef.current)
  const [opponent, setOpponent] = useState<Personality | null>(null)
  const [fen, setFen] = useState(chessRef.current.fen())
  const [moves, setMoves] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<Key[] | undefined>()
  const [thinking, setThinking] = useState(false)
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [hint, setHint] = useState<Hint | null>(null)
  const [hinting, setHinting] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)

  useEffect(() => {
    getEngine()
      .whenReady()
      .then(() => setEngineReady(true))
    getSetting<number | null>('lastElo', null).then((v) => {
      if (v !== null) setElo(clampElo(v))
    })
    getSetting<ColorChoice>('lastColor', 'w').then(setColorChoice)
    getSetting<Mode>('opponentMode', 'personality').then(setMode)
    getSetting<string | null>('lastPersonality', null).then((v) => {
      if (v && personalityById(v)) setPersonalityId(v)
    })
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
      const st = strengthRef.current
      const prof = profileRef.current
      const rated = !hintUsedRef.current
      const score: 0 | 0.5 | 1 =
        status.result === '1/2-1/2' ? 0.5 : (status.result === '1-0') === (pc === 'w') ? 1 : 0
      const before = prof.rating
      const after = rated ? updateRating(before, st.elo, score, prof.gamesPlayed) : before
      const rec: GameRecord = {
        playedAt: Date.now(),
        playerColor: pc,
        opponentElo: st.elo,
        opponentId: personalityRef.current?.id,
        rated,
        result: status.result,
        termination: status.termination,
        moves: chessRef.current.history(),
        finalFen: chessRef.current.fen(),
        ratingBefore: before,
        ratingAfter: after,
      }
      const gameId = (await db.games.add(rec)) as number
      void recordGameAdherence(gameId, rec.playedAt, rec.moves, pc).catch(() => undefined)
      void identifyOpening(rec.moves)
        .then((op) => op && db.games.update(gameId, { opening: op }))
        .catch(() => undefined)
      if (rated) {
        const next: Profile = {
          rating: after,
          gamesPlayed: prof.gamesPlayed + 1,
          peakRating: Math.max(prof.peakRating, after),
        }
        await saveProfile(next)
        onProfile(next)
      }
      setThinking(false)
      setHint(null)
      setOutcome({ status, rated, ratingBefore: before, ratingAfter: after, gameId })
      setPhase('over')
    },
    [onProfile],
  )

  const engineTurn = useCallback(async () => {
    const token = tokenRef.current
    const c = chessRef.current
    const st = strengthRef.current
    const p = personalityRef.current
    setThinking(true)
    const started = performance.now()
    let uci = ''
    try {
      const res = await getEngine().search(c.fen(), { movetime: st.movetime, multipv: st.multipv })
      uci = p ? choosePersonalityMove(c, res.lines, legalUci(c), p, st) : chooseMove(res.lines, res.bestMove, legalUci(c), st)
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
    const stt = gameStatus(c)
    if (stt.over) void finish(stt)
  }, [sync, finish])

  const startGame = useCallback(async () => {
    const p = mode === 'personality' ? (personalityById(personalityId) ?? null) : null
    const st = p ? personalityStrength(p, strengthFor) : strengthFor(elo)
    const pc: Color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    tokenRef.current++
    chessRef.current = new Chess()
    strengthRef.current = st
    personalityRef.current = p
    playerColorRef.current = pc
    hintUsedRef.current = false
    setHintUsed(false)
    setHint(null)
    setStrength(st)
    setOpponent(p)
    setPlayerColor(pc)
    setFlipped(false)
    setOutcome(null)
    setPromo(null)
    sync()
    setPhase('playing')
    void setSetting('lastElo', elo)
    void setSetting('lastColor', colorChoice)
    void setSetting('opponentMode', mode)
    if (p) void setSetting('lastPersonality', p.id)
    const eng = getEngine()
    await eng.newGame()
    await eng.setOptions({ 'Skill Level': st.skill })
    if (pc === 'b') void engineTurn()
  }, [mode, personalityId, elo, colorChoice, sync, engineTurn])

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
      setHint(null)
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

  const askHint = useCallback(async () => {
    if (!hintUsedRef.current) {
      if (!window.confirm('Using a hint makes this game unrated. Continue?')) return
      hintUsedRef.current = true
      setHintUsed(true)
    }
    const token = tokenRef.current
    setHinting(true)
    const eng = getEngine()
    try {
      await eng.setOptions({ 'Skill Level': 20 })
      const h = await computeHint(chessRef.current, eng)
      if (token === tokenRef.current) setHint(h)
    } catch {
      /* ignore */
    } finally {
      await eng.setOptions({ 'Skill Level': strengthRef.current.skill })
      if (token === tokenRef.current) setHinting(false)
    }
  }, [])

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
    setHint(null)
    setPhase('setup')
    setOutcome(null)
  }, [phase, moves.length])

  const turn = chessRef.current.turn()
  const dests = useMemo(() => computeDests(chessRef.current), [fen]) // eslint-disable-line react-hooks/exhaustive-deps
  const inCheck = chessRef.current.inCheck()
  const orientation = cgColor(flipped ? (playerColor === 'w' ? 'b' : 'w') : playerColor)
  const canMove = phase === 'playing' && !thinking && turn === playerColor && !promo
  const shapes = useMemo<DrawShape[]>(
    () => (hint ? [{ orig: hint.from as Key, dest: hint.to as Key, brush: 'green' }] : []),
    [hint],
  )

  if (phase === 'setup') {
    const band = bandFor(elo)
    const pct = ((elo - MIN_ELO) / (MAX_ELO - MIN_ELO)) * 100
    const sel = personalityById(personalityId) ?? PERSONALITIES[4]
    return (
      <div className="screen setup">
        <div className="seg">
          {(['personality', 'custom'] as Mode[]).map((m) => (
            <button
              type="button"
              key={m}
              className={'seg-btn' + (mode === m ? ' selected' : '')}
              onClick={() => {
                setMode(m)
                void setSetting('opponentMode', m)
              }}
            >
              {m === 'personality' ? 'Opponents' : 'Custom strength'}
            </button>
          ))}
        </div>

        {mode === 'personality' ? (
          <>
            <div className="persona-row">
              {PERSONALITIES.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={'persona-card' + (p.id === personalityId ? ' selected' : '')}
                  onClick={() => setPersonalityId(p.id)}
                >
                  <Avatar hue={p.hue} glyph={p.glyph} size={52} />
                  <span className="persona-name">{p.name}</span>
                  <span className="persona-elo">{p.elo}</span>
                </button>
              ))}
            </div>
            <div className="persona-detail card">
              <div className="persona-head">
                <Avatar hue={sel.hue} glyph={sel.glyph} size={64} />
                <div>
                  <div className="persona-title">{sel.name}</div>
                  <div className="muted small">
                    {sel.elo} · {sel.tagline}
                  </div>
                  <div className="chips left">
                    {sel.style.map((s) => (
                      <span className="chip" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p>{sel.bio}</p>
              <p className="persona-weak">
                <Icon name="target" size={16} /> {sel.weaknessText}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="opp-visual">
              <span className="opp-glyph" aria-hidden="true">
                {band.glyph}
              </span>
              <div className="opp-elo">{elo}</div>
              <div className="opp-band">{band.name}</div>
              <div className="muted small">{band.blurb}</div>
            </div>
            <input
              className="slider"
              type="range"
              min={MIN_ELO}
              max={MAX_ELO}
              step={ELO_STEP}
              value={elo}
              style={{ ['--pct' as string]: `${pct}%` }}
              onChange={(e) => setElo(Number(e.target.value))}
              aria-label="Opponent strength"
            />
            <div className="slider-labels muted small">
              <span>{MIN_ELO}</span>
              <button type="button" className="link small" onClick={() => setElo(clampElo(profile.rating))}>
                match my rating ({clampElo(profile.rating)})
              </button>
              <span>{MAX_ELO}</span>
            </div>
          </>
        )}

        <div className="color-pick">
          {(['w', 'random', 'b'] as ColorChoice[]).map((c) => (
            <button
              type="button"
              key={c}
              className={'color-btn' + (colorChoice === c ? ' selected' : '') + (c === 'b' ? ' black' : '')}
              onClick={() => setColorChoice(c)}
              aria-label={c === 'w' ? 'Play White' : c === 'b' ? 'Play Black' : 'Random color'}
            >
              <span className="color-glyph">{c === 'w' ? '♔' : c === 'b' ? '♚' : '♔♚'}</span>
              <span className="color-label">{c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}</span>
            </button>
          ))}
        </div>

        <button type="button" className="primary big" onClick={() => void startGame()} disabled={!engineReady}>
          {engineReady ? (mode === 'personality' ? `Play ${sel.name}` : 'Start game') : 'Loading engine…'}
        </button>
        <p className="muted small center">
          <Icon name="bulb" size={14} /> Hints are available during play. Using one makes the game unrated.
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

  const youWon =
    outcome && outcome.status.result !== '1/2-1/2' && (outcome.status.result === '1-0') === (playerColor === 'w')
  const delta = outcome ? outcome.ratingAfter - outcome.ratingBefore : 0

  return (
    <div className="screen play">
      <div className="play-bar">
        <div className="bar-left">
          {opponent ? <Avatar hue={opponent.hue} glyph={opponent.glyph} size={36} /> : <span className="opp-mini">{strength.glyph}</span>}
          <div>
            <div className="bar-title">
              {opponent ? opponent.name : strength.band} <span className="muted">{strength.elo}</span>
            </div>
            <div className="muted small">
              {thinking ? 'Thinking…' : phase === 'over' ? 'Game over' : hinting ? 'Finding a hint…' : 'Your move'}
            </div>
          </div>
        </div>
        <div className="bar-right">
          <div className="bar-title">{hintUsed ? <span className="tag">Unrated</span> : profile.rating}</div>
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
          shapes={shapes}
          onMove={onBoardMove}
        />
        {promo && (
          <div className="promo">
            {promoPieces.map((pp) => (
              <button type="button" key={pp.p} onClick={() => playerMove(promo.from, promo.to, pp.p)}>
                {pp.glyph}
              </button>
            ))}
            <button
              type="button"
              className="cancel"
              onClick={() => {
                setPromo(null)
                sync()
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <MoveList moves={moves} />

      {hint && phase === 'playing' && (
        <div className="hint-card">
          <div className="hint-head">
            <Icon name="bulb" size={18} />
            <span className="hint-move">{hint.san}</span>
            <button type="button" className="hint-close" onClick={() => setHint(null)} aria-label="Dismiss hint">
              ✕
            </button>
          </div>
          <p>{hint.idea}</p>
        </div>
      )}

      {phase === 'playing' && (
        <div className="btn-row">
          <button type="button" className="with-icon" onClick={() => void askHint()} disabled={!canMove || hinting}>
            <Icon name="bulb" size={18} /> Hint
          </button>
          <button type="button" onClick={() => setFlipped((f) => !f)}>Flip</button>
          <button type="button" className="with-icon" onClick={resign} disabled={moves.length === 0}>
            <Icon name="flag" size={18} /> Resign
          </button>
          <button type="button" onClick={abandon}>Quit</button>
        </div>
      )}

      {phase === 'over' && outcome && (
        <div className="card result">
          <h3>{outcome.status.result === '1/2-1/2' ? 'Draw' : youWon ? 'You won' : 'You lost'}</h3>
          <p className="muted">
            {outcome.status.termination}
            {opponent ? ` · vs ${opponent.name}` : ''}
          </p>
          {outcome.rated ? (
            <p>
              Rating {outcome.ratingBefore} → <strong>{outcome.ratingAfter}</strong>{' '}
              <span className={delta >= 0 ? 'up' : 'down'}>
                ({delta >= 0 ? '+' : ''}
                {delta})
              </span>
            </p>
          ) : (
            <p className="muted">Unrated game (a hint was used). Rating stays at {outcome.ratingBefore}.</p>
          )}
          <div className="btn-row">
            <button type="button" className="primary" onClick={() => void startGame()}>Rematch</button>
            <button type="button" onClick={() => setPhase('setup')}>Change opponent</button>
            <button type="button" className="with-icon" onClick={() => navigate(`/games/${outcome.gameId}/analyze`)}>
              <Icon name="search" size={18} /> Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

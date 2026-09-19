import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import Board from '../components/Board'
import Icon from '../components/Icons'
import { cgColor, computeDests, isPromotion } from '../game/chessUtil'
import { getSetting, setSetting } from '../lib/db'
import {
  THEMES,
  getPuzzleProfile,
  pickPuzzle,
  recordPuzzle,
  seenPuzzleIds,
  themeByKey,
  type Puzzle,
  type PuzzleProfile,
} from '../puzzles/puzzles'
import { XP_AWARDS, addXp } from '../lib/xp'

type Status = 'loading' | 'intro' | 'solving' | 'done' | 'empty'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const THEME_LABEL: Record<string, string> = {
  mateIn1: 'mate in 1',
  mateIn2: 'mate in 2',
  mateIn3: 'mate in 3',
  backRankMate: 'back rank mate',
  smotheredMate: 'smothered mate',
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered attack',
  hangingPiece: 'hanging piece',
  capturingDefender: 'capture the defender',
  deflection: 'deflection',
  attraction: 'attraction',
  sacrifice: 'sacrifice',
  defensiveMove: 'defensive move',
  quietMove: 'quiet move',
  zugzwang: 'zugzwang',
  endgame: 'endgame',
  rookEndgame: 'rook endgame',
  pawnEndgame: 'pawn endgame',
  queenEndgame: 'queen endgame',
  knightEndgame: 'knight endgame',
  bishopEndgame: 'bishop endgame',
  promotion: 'promotion',
  advancedPawn: 'advanced pawn',
  middlegame: 'middlegame',
  opening: 'opening',
  crushing: 'crushing',
  advantage: 'advantage',
  equality: 'equality',
  short: 'short',
  long: 'long',
  veryLong: 'very long',
  oneMove: 'one move',
  kingsideAttack: 'kingside attack',
  queensideAttack: 'queenside attack',
  exposedKing: 'exposed king',
  trappedPiece: 'trapped piece',
  intermezzo: 'in-between move',
  xRayAttack: 'x-ray',
  doubleCheck: 'double check',
  clearance: 'clearance',
  interference: 'interference',
  castling: 'castling',
  enPassant: 'en passant',
  master: 'master game',
  masterVsMaster: 'master vs master',
  superGM: 'super GM game',
}

function themeLabel(t: string): string {
  return THEME_LABEL[t] ?? t.replace(/([A-Z])/g, ' $1').toLowerCase()
}

export default function PuzzleScreen() {
  const [themeKey, setThemeKey] = useState('mixed')
  const [profile, setProfile] = useState<PuzzleProfile | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [fen, setFen] = useState(new Chess().fen())
  const [lastMove, setLastMove] = useState<Key[] | undefined>()
  const [step, setStep] = useState(0)
  const [failed, setFailed] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; kind: 'ok' | 'bad' | 'info' }>({ text: '', kind: 'info' })
  const [shapes, setShapes] = useState<DrawShape[]>([])
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [solvedIt, setSolvedIt] = useState(false)
  const chessRef = useRef(new Chess())
  const tokenRef = useRef(0)
  const seenRef = useRef<Set<string>>(new Set())

  const side = useMemo(() => {
    if (!puzzle) return 'w' as const
    const c = new Chess(puzzle.fen)
    return c.turn() === 'w' ? ('b' as const) : ('w' as const)
  }, [puzzle])

  const sync = useCallback(() => {
    const c = chessRef.current
    setFen(c.fen())
    const h = c.history({ verbose: true })
    const last = h[h.length - 1]
    setLastMove(last ? [last.from as Key, last.to as Key] : undefined)
  }, [])

  const loadNext = useCallback(
    async (key: string) => {
      const token = ++tokenRef.current
      setStatus('loading')
      setShapes([])
      setPromo(null)
      setDelta(null)
      setFailed(false)
      setHintUsed(false)
      setSolvedIt(false)
      setFeedback({ text: '', kind: 'info' })
      const prof = profile ?? (await getPuzzleProfile())
      if (!profile) setProfile(prof)
      if (seenRef.current.size === 0) seenRef.current = await seenPuzzleIds()
      let p: Puzzle | null = null
      try {
        p = await pickPuzzle(prof.rating, key, seenRef.current)
      } catch {
        p = null
      }
      if (token !== tokenRef.current) return
      if (!p) {
        setStatus('empty')
        return
      }
      setPuzzle(p)
      chessRef.current = new Chess(p.fen)
      sync()
      setStep(0)
      setStatus('intro')
      await sleep(700)
      if (token !== tokenRef.current) return
      chessRef.current.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4), promotion: p.moves[0].slice(4) || undefined })
      sync()
      setStep(1)
      setStatus('solving')
      setFeedback({ text: `${chessRef.current.turn() === 'w' ? 'White' : 'Black'} to move. Find the best move.`, kind: 'info' })
    },
    [profile, sync],
  )

  useEffect(() => {
    getSetting<string>('puzzleTheme', 'mixed').then((k) => {
      setThemeKey(k)
      void loadNext(k)
    })
    return () => {
      tokenRef.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = useCallback(
    async (solved: boolean) => {
      if (!puzzle) return
      setStatus('done')
      setSolvedIt(solved)
      seenRef.current.add(puzzle.id)
      const r = await recordPuzzle(puzzle, solved, hintUsed, themeKey)
      setProfile(r.profile)
      setDelta(r.after - r.before)
      void addXp(solved ? XP_AWARDS.puzzleSolved : XP_AWARDS.puzzleFailed, solved ? 'Solved a puzzle' : 'Tried a puzzle')
    },
    [puzzle, hintUsed, themeKey],
  )

  const playMove = useCallback(
    async (from: Key, to: Key, promotion?: string) => {
      if (!puzzle || status !== 'solving') return
      const c = chessRef.current
      const expected = puzzle.moves[step]
      let m
      try {
        m = c.move({ from, to, promotion })
      } catch {
        return
      }
      const uci = m.from + m.to + (m.promotion ?? '')
      setPromo(null)
      const ok = uci === expected || c.isCheckmate()
      if (!ok) {
        c.undo()
        sync()
        if (!failed) setFailed(true)
        setFeedback({ text: `${m.san} is not it. Try again.`, kind: 'bad' })
        return
      }
      sync()
      setShapes([])
      const next = step + 1
      if (next >= puzzle.moves.length) {
        setFeedback({ text: failed ? 'Solved, with a slip along the way.' : 'Correct. Puzzle solved.', kind: 'ok' })
        await finish(!failed)
        return
      }
      setFeedback({ text: 'Good. Keep going.', kind: 'ok' })
      const token = tokenRef.current
      await sleep(400)
      if (token !== tokenRef.current) return
      const reply = puzzle.moves[next]
      c.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply.slice(4) || undefined })
      sync()
      setStep(next + 1)
      if (next + 1 >= puzzle.moves.length) {
        await finish(!failed)
      } else {
        setFeedback({ text: 'Your move.', kind: 'info' })
      }
    },
    [puzzle, status, step, failed, sync, finish],
  )

  const onBoardMove = useCallback(
    (from: Key, to: Key) => {
      if (isPromotion(chessRef.current, from, to)) {
        setPromo({ from, to })
        return
      }
      void playMove(from, to)
    },
    [playMove],
  )

  const hint = useCallback(() => {
    if (!puzzle || status !== 'solving') return
    setHintUsed(true)
    setFailed(true)
    const mv = puzzle.moves[step]
    setShapes([{ orig: mv.slice(0, 2) as Key, brush: 'yellow' }])
    setFeedback({ text: 'This piece moves. Hints count as a miss.', kind: 'info' })
  }, [puzzle, status, step])

  const showSolution = useCallback(async () => {
    if (!puzzle || status !== 'solving') return
    setFailed(true)
    const token = tokenRef.current
    const c = chessRef.current
    for (let i = step; i < puzzle.moves.length; i++) {
      const mv = puzzle.moves[i]
      c.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv.slice(4) || undefined })
      sync()
      await sleep(500)
      if (token !== tokenRef.current) return
    }
    setFeedback({ text: 'That was the solution.', kind: 'info' })
    await finish(false)
  }, [puzzle, status, step, sync, finish])

  const chooseTheme = (k: string) => {
    setThemeKey(k)
    void setSetting('puzzleTheme', k)
    void loadNext(k)
  }

  const turn = chessRef.current.turn()
  const canMove = status === 'solving' && turn === side && !promo
  const dests = useMemo(() => (canMove ? computeDests(chessRef.current) : undefined), [fen, canMove]) // eslint-disable-line react-hooks/exhaustive-deps
  const promoPieces = side === 'w' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞']

  return (
    <div className="screen play puzzles">
      <div className="theme-row">
        {THEMES.map((t) => (
          <button
            type="button"
            key={t.key}
            className={'chip-btn' + (t.key === themeKey ? ' selected' : '')}
            onClick={() => chooseTheme(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="play-bar">
        <div>
          <div className="bar-title">{themeByKey(themeKey).label}</div>
          <div className="muted small">
            {puzzle ? `puzzle ${puzzle.rating}` : ''}
            {profile && profile.streak >= 3 ? ` · streak ${profile.streak}` : ''}
          </div>
        </div>
        <div className="bar-right">
          <div className="bar-title">{profile?.rating ?? '…'}</div>
          <div className="muted small">puzzle rating</div>
        </div>
      </div>

      <div className="board-wrap">
        <Board
          fen={fen}
          orientation={cgColor(side)}
          turnColor={cgColor(turn)}
          dests={dests}
          movableColor={canMove ? cgColor(side) : undefined}
          lastMove={lastMove}
          check={chessRef.current.inCheck()}
          viewOnly={status !== 'solving'}
          shapes={shapes}
          onMove={onBoardMove}
        />
        {promo && (
          <div className="promo">
            {['q', 'r', 'b', 'n'].map((p, i) => (
              <button type="button" key={p} onClick={() => void playMove(promo.from, promo.to, p)}>
                {promoPieces[i]}
              </button>
            ))}
          </div>
        )}
        {status === 'loading' && <div className="board-overlay muted">Loading puzzle…</div>}
        {status === 'empty' && <div className="board-overlay muted">No puzzles available offline yet. Connect once to fetch them.</div>}
      </div>

      <div className={'caption feedback ' + feedback.kind}>
        <span className={'side-dot ' + (side === 'w' ? 'white' : 'black')} aria-hidden="true" />
        {feedback.text || (status === 'intro' ? 'Watch the opponent’s move…' : ' ')}
      </div>

      {status === 'solving' && (
        <div className="btn-row">
          <button type="button" className="with-icon" onClick={hint} disabled={hintUsed}>
            <Icon name="bulb" size={18} /> Hint
          </button>
          <button type="button" onClick={() => void showSolution()}>Solution</button>
          <button type="button" onClick={() => void loadNext(themeKey)}>Skip</button>
        </div>
      )}

      {status === 'done' && puzzle && (
        <div className={'card result ' + (solvedIt ? 'ok' : 'bad')}>
          <h3>{solvedIt ? 'Solved' : 'Missed'}</h3>
          <p>
            Puzzle rating {puzzle.rating} ·{' '}
            {delta !== null && (
              <span className={delta >= 0 ? 'up' : 'down'}>
                {delta >= 0 ? '+' : ''}
                {delta}
              </span>
            )}
          </p>
          <div className="chips">
            {puzzle.themes
              .filter((t) => !['short', 'long', 'veryLong', 'oneMove', 'crushing', 'advantage', 'equality', 'master', 'masterVsMaster', 'superGM'].includes(t))
              .slice(0, 5)
              .map((t) => (
                <span className="chip" key={t}>
                  {themeLabel(t)}
                </span>
              ))}
          </div>
          <div className="btn-row">
            <button type="button" className="primary big" onClick={() => void loadNext(themeKey)}>
              Next puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

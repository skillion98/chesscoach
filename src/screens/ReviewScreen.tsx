import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import Board from '../components/Board'
import EvalGraph from '../components/EvalGraph'
import Icon from '../components/Icons'
import MoveList, { type MoveMark } from '../components/MoveList'
import MoveBadge from '../components/MoveBadge'
import { JUDGMENT_META, isError } from '../analysis/judge'
import {
  analyzeGame,
  formatEval,
  judgmentWord,
  moveLabel,
  tagText,
  winChance,
  type GameAnalysis,
  type Phase,
  type PlyAnalysis,
} from '../analysis/analyze'
import { getEngine } from '../engine/stockfish'
import { cgColor } from '../game/chessUtil'
import { db, type GameRecord } from '../lib/db'
import { opponentLabel } from './GamesScreen'
import { buildRecap, type Recap } from '../analysis/recap'
import { matchCourse } from '../openings/stats'
import { speechAvailable } from '../lib/speech'
import { narrate, prepareNarration, stopNarration } from '../lib/narration'

interface Props {
  id: number
  autoAnalyze?: boolean
}

const SYMBOL: Record<string, MoveMark> = {
  brilliant: { symbol: '!!', cls: 'j-brilliant' },
  great: { symbol: '!', cls: 'j-great' },
  blunder: { symbol: '??', cls: 'j-blunder' },
  mistake: { symbol: '?', cls: 'j-mistake' },
  miss: { symbol: '✗', cls: 'j-miss' },
  inaccuracy: { symbol: '?!', cls: 'j-inacc' },
}

const PHASES: Phase[] = ['opening', 'middlegame', 'endgame']

export default function ReviewScreen({ id, autoAnalyze }: Props) {
  const [game, setGame] = useState<GameRecord | null | undefined>(undefined)
  const [ply, setPly] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [showBest, setShowBest] = useState(false)
  const [recap, setRecap] = useState<Recap | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const cancelRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    db.games.get(id).then((g) => {
      setGame(g ?? null)
      setAnalysis(g?.analysis ?? null)
      setPly(g?.analysis ? 0 : (g?.moves.length ?? 0))
    })
  }, [id])

  const runAnalysis = useCallback(async () => {
    if (!game || progress !== null) return
    cancelRef.current = false
    setProgress(0)
    try {
      const a = await analyzeGame(game.moves, getEngine(), {
        playerColor: game.playerColor,
        onProgress: (d, t) => setProgress(Math.round((d / t) * 100)),
        isCancelled: () => cancelRef.current,
      })
      await db.games.update(id, { analysis: a })
      setAnalysis(a)
      setPly(0)
    } catch {
      /* cancelled or engine error */
    } finally {
      setProgress(null)
    }
  }, [game, id, progress])

  useEffect(() => {
    if (autoAnalyze && game && !game.analysis && !startedRef.current) {
      startedRef.current = true
      void runAnalysis()
    }
  }, [autoAnalyze, game, runAnalysis])

  useEffect(() => {
    if (!game || !analysis) {
      setRecap(null)
      return
    }
    try {
      const r = buildRecap(game, analysis, matchCourse(game.moves, game.playerColor))
      setRecap(r)
      // get the natural-voice audio ready in the background so Listen is instant
      void prepareNarration(r.wentWell + ' ' + r.improve)
    } catch {
      setRecap(null)
    }
  }, [game, analysis])

  useEffect(
    () => () => {
      cancelRef.current = true
      getEngine().stop()
      stopNarration()
    },
    [],
  )

  const positions = useMemo(() => {
    const c = new Chess()
    const out: { fen: string; turn: 'w' | 'b'; check: boolean; last?: Key[] }[] = [
      { fen: c.fen(), turn: 'w', check: false },
    ]
    if (game) {
      for (const san of game.moves) {
        const m = c.move(san)
        out.push({ fen: c.fen(), turn: c.turn(), check: c.inCheck(), last: [m.from as Key, m.to as Key] })
      }
    }
    return out
  }, [game])

  const total = game?.moves.length ?? 0
  const go = useCallback(
    (p: number) => {
      setPly(Math.max(0, Math.min(total, p)))
      setShowBest(false)
    },
    [total],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(ply - 1)
      if (e.key === 'ArrowRight') go(ply + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ply, go])

  if (game === undefined) return <div className="screen muted">Loading…</div>
  if (game === null) return <div className="screen muted">Game not found.</div>

  const me = game.playerColor
  const current: PlyAnalysis | undefined = analysis && ply > 0 ? analysis.plies[ply - 1] : undefined
  const isErr = !!current && isError(current.judgment)
  const viewPly = showBest && isErr ? ply - 1 : ply
  const pos = positions[viewPly]
  const orientation = cgColor(flipped ? (me === 'w' ? 'b' : 'w') : me)

  const shapes: DrawShape[] =
    showBest && isErr && current
      ? [
          { orig: current.uci.slice(0, 2) as Key, dest: current.uci.slice(2, 4) as Key, brush: 'red' },
          { orig: current.bestUci.slice(0, 2) as Key, dest: current.bestUci.slice(2, 4) as Key, brush: 'green' },
        ]
      : []

  const marks: Record<number, MoveMark> = {}
  if (analysis) {
    for (const p of analysis.plies) {
      const s = SYMBOL[p.judgment]
      if (s) marks[p.ply] = s
    }
  }

  const evalNow = analysis ? analysis.evals[viewPly] : 0
  const mateNow = analysis ? analysis.mates[viewPly] : null
  const whiteShare = analysis ? 50 + 50 * winChance(evalNow) : 50
  const mine = analysis ? (me === 'w' ? analysis.white : analysis.black) : null
  const theirs = analysis ? (me === 'w' ? analysis.black : analysis.white) : null

  return (
    <div className="screen play">
      <div className="play-bar">
        <div>
          <div className="bar-title">
            {me === 'w' ? 'White' : 'Black'} vs {opponentLabel(game)}
          </div>
          <div className="muted small">
            {game.result} · {game.termination}
            {game.rated === false ? ' · unrated' : ''}
          </div>
        </div>
        <div className="bar-right">
          {analysis ? (
            <>
              <div className="bar-title">{formatEval(evalNow, mateNow, me)}</div>
              <div className="muted small">eval for you</div>
            </>
          ) : (
            <>
              <div className="bar-title">{game.ratingAfter}</div>
              <div className="muted small">{new Date(game.playedAt).toLocaleDateString()}</div>
            </>
          )}
        </div>
      </div>

      {analysis && (
        <div className="evalbar" aria-hidden="true">
          <div className="evalbar-white" style={{ width: `${whiteShare}%` }} />
        </div>
      )}

      <div className="board-wrap">
        <Board
          fen={pos.fen}
          orientation={orientation}
          turnColor={cgColor(pos.turn)}
          lastMove={pos.last}
          check={pos.check}
          shapes={shapes}
          viewOnly
        />
        {current && viewPly === ply && (
          <MoveBadge square={current.uci.slice(2, 4)} orientation={orientation} judgment={current.judgment} nonce={ply} />
        )}
      </div>

      <MoveList moves={game.moves} ply={ply} onSelect={go} marks={marks} />

      {analysis && (
        <EvalGraph
          evals={analysis.evals}
          ply={viewPly}
          perspective={me}
          marks={analysis.plies
            .filter((p) => isError(p.judgment) || p.judgment === 'brilliant' || p.judgment === 'great')
            .map((p) => ({ ply: p.ply, judgment: p.judgment, mine: p.mover === me }))}
          onSelect={go}
        />
      )}

      <div className="btn-row">
        <button type="button" onClick={() => go(0)} disabled={ply === 0}>⏮</button>
        <button type="button" onClick={() => go(ply - 1)} disabled={ply === 0}>◀</button>
        <button type="button" onClick={() => go(ply + 1)} disabled={ply === total}>▶</button>
        <button type="button" onClick={() => go(total)} disabled={ply === total}>⏭</button>
        <button type="button" onClick={() => setFlipped((f) => !f)}>Flip</button>
      </div>

      {current && (
        <div className={'moment-card ' + current.judgment}>
          <div className="moment-head">
            <span className="moment-move">{moveLabel(current.ply, current.san)}</span>
            <span className="tag" style={{ background: JUDGMENT_META[current.judgment].color, color: '#1b1b1f' }}>
              {JUDGMENT_META[current.judgment].symbol} {judgmentWord(current.judgment)}
            </span>
            {current.cpLoss > 0 && <span className="muted small">−{(current.cpLoss / 100).toFixed(1)}</span>}
            <span className="muted small moment-phase">{current.phase}</span>
          </div>
          {isErr ? (
            <>
              <p>
                {tagText(current)} Best was <strong>{current.bestSan}</strong>
                {current.bestLine.length > 1 && <span className="muted"> ({current.bestLine.join(' ')})</span>}.
              </p>
              {analysis?.keyMoments.find((k) => k.ply === current.ply) && (
                <p className="moment-explain">{analysis.keyMoments.find((k) => k.ply === current.ply)!.text.split('Better was')[1]?.replace(/^[^:]*:\s*/, '')}</p>
              )}
              <button type="button" className="link small" onClick={() => setShowBest((s) => !s)}>
                {showBest ? 'Show the position after the move' : 'Show best move on the board'}
              </button>
            </>
          ) : (
            current.judgment !== 'best' &&
            current.bestSan && (
              <p className="muted small">
                Fine. The engine slightly prefers {current.bestSan}.
              </p>
            )
          )}
        </div>
      )}

      {!analysis && (
        <div className="card analyze-card">
          {progress === null ? (
            <button type="button" className="primary big with-icon" onClick={() => void runAnalysis()}>
              <Icon name="search" size={20} /> Analyze this game
            </button>
          ) : (
            <>
              <div className="muted small">Analyzing… {progress}%</div>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </>
          )}
        </div>
      )}

      {analysis && mine && theirs && (
        <section className="summary">
          {recap && (
            <div className="card recap">
              <div className="recap-head">
                <Icon name="coach" size={20} />
                <span>Coach's recap</span>
                {speechAvailable() && (
                  <button
                    type="button"
                    className="icon-only small-btn"
                    aria-label={speaking ? 'Stop' : 'Listen'}
                    onClick={async () => {
                      if (speaking) {
                        stopNarration()
                        setSpeaking(false)
                        setVoiceStatus('')
                        return
                      }
                      setSpeaking(true)
                      await narrate(recap.wentWell + ' ' + recap.improve, undefined, false, setVoiceStatus)
                      setSpeaking(false)
                      setVoiceStatus('')
                    }}
                  >
                    <Icon name={speaking ? 'pause' : 'sound'} size={18} />
                  </button>
                )}
              </div>
              {voiceStatus && <p className="muted small">{voiceStatus}</p>}
              <p>{recap.wentWell}</p>
              <p>{recap.improve}</p>
            </div>
          )}
          <div className="acc-row">
            <div className="acc me">
              <div className="acc-num">{mine.accuracy}%</div>
              <div className="muted small">your accuracy</div>
            </div>
            <div className="acc">
              <div className="acc-num muted">{theirs.accuracy}%</div>
              <div className="muted small">opponent</div>
            </div>
          </div>
          <div className="chips">
            {mine.brilliant > 0 && <span className="chip" style={{ color: JUDGMENT_META.brilliant.color }}>{mine.brilliant} brilliant</span>}
            {mine.great > 0 && <span className="chip" style={{ color: JUDGMENT_META.great.color }}>{mine.great} great</span>}
            <span className="chip j-blunder">{mine.blunders} blunder{mine.blunders === 1 ? '' : 's'}</span>
            <span className="chip j-mistake">{mine.mistakes} mistake{mine.mistakes === 1 ? '' : 's'}</span>
            <span className="chip j-inacc">{mine.inaccuracies} inaccurac{mine.inaccuracies === 1 ? 'y' : 'ies'}</span>
          </div>
          <div className="phases">
            {PHASES.map((ph) => {
              const s = mine.byPhase[ph]
              const w = s.moves ? Math.min(100, s.avgCpLoss) : 0
              return (
                <div className="phase-row" key={ph}>
                  <span className="phase-name">{ph}</span>
                  <span className="phase-bar">
                    <span className={'phase-fill' + (w > 60 ? ' bad' : w > 30 ? ' mid' : '')} style={{ width: `${w}%` }} />
                  </span>
                  <span className="phase-val muted small">{s.moves ? `${s.avgCpLoss} cp/move` : '—'}</span>
                </div>
              )
            })}
          </div>
          {analysis.keyMoments.length > 0 && (
            <div className="moments">
              <h3>Key moments</h3>
              {analysis.keyMoments.map((k) => (
                <button
                  type="button"
                  key={k.ply}
                  className="moment"
                  onClick={() => {
                    setPly(k.ply)
                    setShowBest(true)
                  }}
                >
                  {k.text}
                </button>
              ))}
            </div>
          )}
          {analysis.keyMoments.length === 0 && <p className="muted small center">No serious mistakes on your side. Clean game.</p>}
          <button type="button" className="link small" onClick={() => void runAnalysis()} disabled={progress !== null}>
            Re-analyze
          </button>
        </section>
      )}
    </div>
  )
}

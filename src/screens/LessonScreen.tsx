import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import Board from '../components/Board'
import Icon from '../components/Icons'
import MoveList from '../components/MoveList'
import { cgColor, computeDests } from '../game/chessUtil'
import { courseBySlug, parseChapter, moveText } from '../openings/model'
import { recordResult } from '../openings/stats'
import { narrate, stopNarration } from '../lib/narration'
import { getSetting, setSetting } from '../lib/db'
import { XP_AWARDS, addXp } from '../lib/xp'
import { playMove } from '../lib/sounds'
import { navigate } from '../lib/router'

interface Props {
  slug: string
  idx: number
  mode: 'learn' | 'drill'
  startPly?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function LessonScreen({ slug, idx, mode, startPly }: Props) {
  const course = courseBySlug(slug)
  const ch = useMemo(() => (course ? parseChapter(course, idx) : null), [course, idx])
  const side = course?.side ?? 'w'

  const [ply, setPly] = useState(0)
  const [caption, setCaption] = useState('')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [done, setDone] = useState(false)
  const tokenRef = useRef(0)

  // drill state
  const [wrong, setWrong] = useState(0)
  const [misses, setMisses] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ text: string; kind: 'ok' | 'bad' | 'info' } | null>(null)
  const [reveal, setReveal] = useState(false)
  const [finished, setFinished] = useState(false)
  const [busy, setBusy] = useState(false)
  const missedNodes = useRef(new Set<number>())

  const soundsRef = useRef(true)
  const lastPlyRef = useRef(0)
  useEffect(() => {
    getSetting<boolean>('sounds', true).then((v) => (soundsRef.current = v))
  }, [])
  useEffect(() => {
    if (!ch) return
    const prev = lastPlyRef.current
    lastPlyRef.current = ply
    if (ply === prev + 1 && soundsRef.current) {
      const san = ch.sans[ply - 1] ?? ''
      playMove({ capture: san.includes('x'), check: san.includes('+') || san.includes('#'), castle: san.startsWith('O-O') })
    }
  }, [ply, ch])

  useEffect(() => {
    getSetting<boolean>('muted', false).then(setMuted)
    return () => {
      tokenRef.current++
      stopNarration()
    }
  }, [])

  const say = useCallback(
    async (text: string, token: number, key?: string) => {
      setCaption(text)
      await narrate(text, key, muted)
      return token === tokenRef.current
    },
    [muted],
  )

  // ---------- learn mode ----------
  const runLesson = useCallback(
    async (from: number) => {
      if (!ch) return
      const token = ++tokenRef.current
      setPlaying(true)
      setDone(false)
      if (from === 0) {
        setPly(0)
        if (!(await say(ch.intro, token, `${slug}/${idx}/intro`))) return
      }
      for (let p = from; p < ch.sans.length; p++) {
        if (token !== tokenRef.current) return
        setPly(p + 1)
        const note = ch.notes.get(p + 1)
        if (note) {
          if (!(await say(note, token, `${slug}/${idx}/${p + 1}`))) return
          await sleep(350)
        } else {
          await sleep(850)
        }
      }
      if (token !== tokenRef.current) return
      setPlaying(false)
      setDone(true)
      void addXp(XP_AWARDS.lesson, 'Finished a lesson')
      await say('That is the line. Now drill it: play the moves yourself.', token, 'common/drill')
    },
    [ch, say],
  )

  const pause = useCallback(() => {
    tokenRef.current++
    stopNarration()
    setPlaying(false)
  }, [])

  const step = useCallback(
    (delta: number) => {
      if (!ch) return
      pause()
      const next = Math.max(0, Math.min(ch.sans.length, ply + delta))
      setPly(next)
      setCaption(next > 0 ? (ch.notes.get(next) ?? '') : ch.intro)
    },
    [ch, ply, pause],
  )

  // ---------- drill mode ----------
  const playOpponentMoves = useCallback(
    async (fromPly: number, token: number): Promise<number> => {
      if (!ch) return fromPly
      let p = fromPly
      while (p < ch.sans.length && (p % 2 === 0 ? 'w' : 'b') !== side) {
        await sleep(450)
        if (token !== tokenRef.current) return p
        p++
        setPly(p)
      }
      return p
    },
    [ch, side],
  )

  const startDrill = useCallback(async () => {
    if (!ch) return
    const token = ++tokenRef.current
    stopNarration()
    const from = startPly ? Math.max(0, Math.min(ch.sans.length, startPly - 1)) : 0
    setPly(from)
    setWrong(0)
    setMisses(0)
    setCorrectCount(0)
    setFeedback(null)
    setReveal(false)
    setFinished(false)
    missedNodes.current = new Set()
    setBusy(true)
    const p = await playOpponentMoves(from, token)
    if (token !== tokenRef.current) return
    setBusy(false)
    if (p >= ch.sans.length) setFinished(true)
    else setFeedback({ text: from > 0 ? `Continue from here: what comes after ${moveText(ch.sans, p)}?` : 'Your move. Play the line.', kind: 'info' })
  }, [ch, startPly, playOpponentMoves])

  useEffect(() => {
    if (mode === 'drill') void startDrill()
    else {
      setPly(0)
      setCaption(ch?.intro ?? '')
      setDone(false)
      setPlaying(false)
    }
  }, [mode, startDrill, ch])

  const onDrillMove = useCallback(
    async (from: Key, to: Key) => {
      if (!ch || finished || busy) return
      const expected = ch.ucis[ply]
      const pos = new Chess(ch.fens[ply])
      let played
      try {
        played = pos.move({ from, to, promotion: 'q' })
      } catch {
        return
      }
      const uci = played.from + played.to + (played.promotion ?? '')
      const node = ply + 1
      if (uci === expected) {
        if (!missedNodes.current.has(node)) {
          await recordResult(slug, idx, node, true)
          setCorrectCount((c) => c + 1)
        }
        setWrong(0)
        setReveal(false)
        setFeedback({ text: 'Correct.', kind: 'ok' })
        const token = ++tokenRef.current
        setBusy(true)
        setPly(ply + 1)
        const p = await playOpponentMoves(ply + 1, token)
        if (token !== tokenRef.current) return
        setBusy(false)
        if (p >= ch.sans.length) {
          setFinished(true)
          setFeedback(null)
          void addXp(
            XP_AWARDS.drill + (missedNodes.current.size === 0 ? XP_AWARDS.drillPerfect : 0),
            missedNodes.current.size === 0 ? 'Perfect drill' : 'Finished a drill',
          )
        } else {
          const note = ch.notes.get(p)
          setFeedback({ text: note ? note : 'Your move.', kind: 'info' })
        }
      } else {
        const n = wrong + 1
        setWrong(n)
        if (!missedNodes.current.has(node)) {
          missedNodes.current.add(node)
          setMisses((m) => m + 1)
          await recordResult(slug, idx, node, false, played.san)
        }
        // force the board back to the position
        setPly((p) => p)
        if (n >= 2) {
          setReveal(true)
          setFeedback({ text: `The line goes ${ch.sans[ply]}. Play it to continue.`, kind: 'bad' })
        } else {
          setFeedback({ text: `Not ${played.san}. Try again.`, kind: 'bad' })
        }
      }
    },
    [ch, finished, busy, ply, wrong, slug, idx, playOpponentMoves],
  )

  if (!course || !ch) return <div className="screen muted">Chapter not found.</div>

  const fen = ch.fens[ply]
  const pos = new Chess(fen)
  const turn = pos.turn()
  const last = ply > 0 ? ([ch.ucis[ply - 1].slice(0, 2), ch.ucis[ply - 1].slice(2, 4)] as Key[]) : undefined
  const playerTurn = mode === 'drill' && !finished && !busy && turn === side && ply < ch.sans.length
  const dests = playerTurn ? computeDests(pos) : undefined
  const shapes: DrawShape[] =
    reveal && ply < ch.sans.length
      ? [{ orig: ch.ucis[ply].slice(0, 2) as Key, dest: ch.ucis[ply].slice(2, 4) as Key, brush: 'green' }]
      : []
  const total = ch.playerPlies.filter((p) => !startPly || p >= startPly).length
  const nextIdx = idx + 1 < course.chapters.length ? idx + 1 : null

  return (
    <div className="screen play lesson">
      <div className="play-bar">
        <div>
          <div className="bar-title">{ch.name}</div>
          <div className="muted small">
            {course.title} · {mode === 'learn' ? 'lesson' : 'drill'}
          </div>
        </div>
        <div className="bar-right">
          {mode === 'drill' ? (
            <>
              <div className="bar-title">
                {correctCount}/{total}
              </div>
              <div className="muted small">{misses} miss{misses === 1 ? '' : 'es'}</div>
            </>
          ) : (
            <>
              <div className="bar-title">
                {ply}/{ch.sans.length}
              </div>
              <div className="muted small">moves</div>
            </>
          )}
        </div>
      </div>

      <div className="board-wrap">
        <Board
          fen={fen}
          orientation={cgColor(side)}
          turnColor={cgColor(turn)}
          lastMove={last}
          check={pos.inCheck()}
          dests={dests}
          movableColor={playerTurn ? cgColor(side) : undefined}
          viewOnly={mode !== 'drill'}
          shapes={shapes}
          onMove={(f, t) => void onDrillMove(f, t)}
        />
      </div>

      <MoveList moves={ch.sans.slice(0, mode === 'learn' ? ply : ply)} ply={ply} onSelect={mode === 'learn' ? (p) => step(p - ply) : undefined} />

      {mode === 'learn' && (
        <>
          <div className={'caption' + (playing ? ' live' : '')}>{caption || ch.intro}</div>
          <div className="btn-row">
            <button type="button" onClick={() => step(-1)} disabled={ply === 0} aria-label="Previous move">◀</button>
            {playing ? (
              <button type="button" className="primary with-icon" onClick={pause}>
                <Icon name="pause" size={18} /> Pause
              </button>
            ) : (
              <button type="button" className="primary with-icon" onClick={() => void runLesson(ply >= ch.sans.length ? 0 : ply)}>
                <Icon name="play" size={18} /> {ply === 0 ? 'Play lesson' : ply >= ch.sans.length ? 'Replay' : 'Resume'}
              </button>
            )}
            <button type="button" onClick={() => step(1)} disabled={ply >= ch.sans.length} aria-label="Next move">▶</button>
            <button
              type="button"
              className="icon-only"
              aria-label={muted ? 'Unmute' : 'Mute'}
              onClick={() => {
                const m = !muted
                setMuted(m)
                void setSetting('muted', m)
                if (m) stopNarration()
              }}
            >
              <Icon name={muted ? 'mute' : 'sound'} size={20} />
            </button>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className={'with-icon' + (done ? ' primary' : '')}
              onClick={() => navigate(`/openings/${slug}/${idx}/drill`)}
            >
              <Icon name="target" size={18} /> Drill this line
            </button>
          </div>
        </>
      )}

      {mode === 'drill' && !finished && (
        <>
          <div className={'caption feedback ' + (feedback?.kind ?? 'info')}>{feedback?.text ?? ''}</div>
          <div className="btn-row">
            <button type="button" onClick={() => setReveal(true)} disabled={!playerTurn || reveal}>
              Show me
            </button>
            <button type="button" className="with-icon" onClick={() => void startDrill()}>
              <Icon name="restart" size={18} /> Restart
            </button>
            <button type="button" onClick={() => navigate(`/openings/${slug}/${idx}/learn`)}>
              Lesson
            </button>
          </div>
        </>
      )}

      {mode === 'drill' && finished && (
        <div className="card result">
          <h3>{misses === 0 ? 'Perfect line' : misses === 1 ? 'One slip' : `${misses} misses`}</h3>
          <p className="muted">
            {correctCount} of {total} moves right the first time.
            {misses > 0 ? ' The missed moves are now due for review tomorrow.' : ' This line is due again in a few days.'}
          </p>
          <div className="btn-row">
            <button type="button" className="primary with-icon" onClick={() => void startDrill()}>
              <Icon name="restart" size={18} /> Again
            </button>
            {nextIdx !== null && (
              <button type="button" onClick={() => navigate(`/openings/${slug}/${nextIdx}/drill`)}>
                Next chapter
              </button>
            )}
            <button type="button" onClick={() => navigate(`/openings/${slug}`)}>Back</button>
          </div>
        </div>
      )}
    </div>
  )
}

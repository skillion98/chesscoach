// Full-game engine analysis: per-move evaluation, judgments, phase and mistake tags,
// per-side summaries, and explained key moments for the player.

import { Chess, type Move } from 'chess.js'
import type { Engine } from '../engine/stockfish'
import { NAME, explainMove, findMove, isGoodCapture, nonPawnMaterial } from '../game/explain'
import { moveFeatures } from '../game/features'
import { isBookPrefix } from '../openings/stats'
import { JUDGMENT_META, baseJudgment, isError, refineJudgment, winChance, type Judgment } from './judge'

export { winChance, type Judgment }

export type Side = 'w' | 'b'
export type Phase = 'opening' | 'middlegame' | 'endgame'
export type MistakeTag = 'hung-material' | 'missed-tactic' | 'missed-mate' | 'allowed-mate' | 'positional'

export interface PlyAnalysis {
  /** 1-based */
  ply: number
  mover: Side
  san: string
  uci: string
  /** centipawns, white perspective; mates folded in as +-(10000 - n) */
  evalBefore: number
  evalAfter: number
  mateBefore: number | null
  mateAfter: number | null
  bestUci: string
  bestSan: string
  /** SAN continuation of the best line, up to 6 plies */
  bestLine: string[]
  /** centipawns lost from the mover's perspective, capped at 1000 */
  cpLoss: number
  accuracy: number
  judgment: Judgment
  phase: Phase
  tag?: MistakeTag
  /** SAN of the opponent reply that punishes a hung piece */
  punish?: string
}

export interface PhaseSummary {
  moves: number
  avgCpLoss: number
  errors: number
}

export interface SideSummary {
  moves: number
  accuracy: number
  avgCpLoss: number
  blunders: number
  mistakes: number
  inaccuracies: number
  brilliant: number
  great: number
  book: number
  byPhase: Record<Phase, PhaseSummary>
}

export interface KeyMoment {
  ply: number
  text: string
}

export interface GameAnalysis {
  version: 1
  analyzedAt: number
  movetime: number
  /** white-perspective eval for each position 0..n */
  evals: number[]
  mates: (number | null)[]
  plies: PlyAnalysis[]
  white: SideSummary
  black: SideSummary
  keyMoments: KeyMoment[]
}

export interface AnalyzeOptions {
  movetime?: number
  playerColor: Side
  onProgress?: (done: number, total: number) => void
  isCancelled?: () => boolean
}

export const MATE_CP = 10000

export function moveAccuracy(wcBefore: number, wcAfter: number): number {
  const before = 50 + 50 * wcBefore
  const after = 50 + 50 * wcAfter
  if (after >= before) return 100
  const a = 103.1668 * Math.exp(-0.04354 * (before - after)) - 3.1669
  return Math.max(0, Math.min(100, a))
}

export function phaseOf(chess: Chess, ply: number): Phase {
  if (nonPawnMaterial(chess) <= 26) return 'endgame'
  if (ply <= 24) return 'opening'
  return 'middlegame'
}

/** Format a white-perspective eval for display, optionally from a given side's view. */
export function formatEval(cp: number, mate: number | null, perspective: Side = 'w'): string {
  const sign = perspective === 'w' ? 1 : -1
  if (mate !== null) {
    const m = mate * sign
    return m === 0 ? '#' : m > 0 ? `M${m}` : `-M${-m}`
  }
  const v = (cp * sign) / 100
  return (v > 0 ? '+' : '') + v.toFixed(1)
}

function sanLine(fen: string, uciMoves: string[], max = 6): string[] {
  const c = new Chess(fen)
  const out: string[] = []
  for (const u of uciMoves.slice(0, max)) {
    const m = findMove(c, u)
    if (!m) break
    c.move(m)
    out.push(m.san)
  }
  return out
}

const TAG_TEXT: Record<MistakeTag, (p: PlyAnalysis) => string> = {
  'hung-material': (p) => `This left material hanging to ${p.punish}.`,
  'missed-tactic': (p) => `There was a tactic on the board: ${p.bestSan} wins material.`,
  'missed-mate': () => 'A forced mate was available and slipped away.',
  'allowed-mate': () => 'This allowed a forced mate.',
  positional: (p) =>
    p.phase === 'opening'
      ? 'A slow move in the opening; development and the center come first.'
      : p.phase === 'endgame'
        ? 'Endgame technique: the engine wants a more precise plan here.'
        : 'No tactic, just a drift: the position got worse slowly.',
}

export function tagText(p: PlyAnalysis): string {
  return p.tag ? TAG_TEXT[p.tag](p) : ''
}

export function judgmentWord(j: Judgment): string {
  return JUDGMENT_META[j].word
}

export function moveLabel(ply: number, san: string): string {
  const n = Math.ceil(ply / 2)
  return ply % 2 === 1 ? `${n}. ${san}` : `${n}... ${san}`
}

function emptyPhase(): PhaseSummary {
  return { moves: 0, avgCpLoss: 0, errors: 0 }
}

function summarize(plies: PlyAnalysis[], side: Side): SideSummary {
  const mine = plies.filter((p) => p.mover === side)
  const byPhase: Record<Phase, PhaseSummary> = { opening: emptyPhase(), middlegame: emptyPhase(), endgame: emptyPhase() }
  const phaseLoss: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 }
  let loss = 0
  let acc = 0
  const s: SideSummary = { moves: mine.length, accuracy: 0, avgCpLoss: 0, blunders: 0, mistakes: 0, inaccuracies: 0, brilliant: 0, great: 0, book: 0, byPhase }
  for (const p of mine) {
    loss += p.cpLoss
    acc += p.accuracy
    byPhase[p.phase].moves++
    phaseLoss[p.phase] += p.cpLoss
    if (p.judgment === 'blunder') s.blunders++
    if (p.judgment === 'mistake') s.mistakes++
    if (p.judgment === 'inaccuracy' || p.judgment === 'miss') s.inaccuracies++
    if (p.judgment === 'brilliant') s.brilliant++
    if (p.judgment === 'great') s.great++
    if (p.judgment === 'book') s.book++
    if (isError(p.judgment)) byPhase[p.phase].errors++
  }
  s.accuracy = mine.length ? Math.round((acc / mine.length) * 10) / 10 : 0
  s.avgCpLoss = mine.length ? Math.round(loss / mine.length) : 0
  for (const ph of ['opening', 'middlegame', 'endgame'] as Phase[]) {
    byPhase[ph].avgCpLoss = byPhase[ph].moves ? Math.round(phaseLoss[ph] / byPhase[ph].moves) : 0
  }
  return s
}

export async function analyzeGame(moves: string[], engine: Engine, opts: AnalyzeOptions): Promise<GameAnalysis> {
  const movetime = opts.movetime ?? 300
  const cancelled = () => opts.isCancelled?.() === true
  const total = moves.length + 1 + 3
  let done = 0
  const progress = () => opts.onProgress?.(done, total)

  await engine.setOptions({ 'Skill Level': 20 })

  // Replay the game and evaluate every position.
  const chess = new Chess()
  const fens: string[] = [chess.fen()]
  const played: Move[] = []
  for (const san of moves) {
    const m = chess.move(san)
    played.push(m)
    fens.push(chess.fen())
  }

  const evals: number[] = []
  const mates: (number | null)[] = []
  const bestUcis: string[] = []
  const bestLines: string[][] = []
  const gaps: (number | null)[] = []

  for (let i = 0; i < fens.length; i++) {
    if (cancelled()) throw new Error('cancelled')
    const pos = new Chess(fens[i])
    const turn = pos.turn()
    const sign = turn === 'w' ? 1 : -1
    if (pos.isGameOver()) {
      if (pos.isCheckmate()) {
        evals.push(-MATE_CP * sign)
        mates.push(0)
      } else {
        evals.push(0)
        mates.push(null)
      }
      bestUcis.push('')
      bestLines.push([])
      gaps.push(null)
    } else {
      const r = await engine.search(fens[i], { movetime, multipv: 2 })
      const line = r.lines[0]
      const second = r.lines[1]
      gaps.push(line && second ? line.cp - second.cp : null)
      const cp = line ? line.cp : 0
      evals.push(cp * sign)
      mates.push(line && line.mate !== null ? line.mate * sign : null)
      bestUcis.push(line?.move ?? r.bestMove)
      bestLines.push(line?.pv ?? [])
    }
    done++
    progress()
  }

  // Judge each move.
  const plies: PlyAnalysis[] = []
  const sansSoFar: string[] = []
  let inBook = true
  for (let i = 0; i < played.length; i++) {
    const m = played[i]
    const mover: Side = i % 2 === 0 ? 'w' : 'b'
    const sign = mover === 'w' ? 1 : -1
    const before = new Chess(fens[i])
    const uci = m.from + m.to + (m.promotion ?? '')
    const bestUci = bestUcis[i]
    const playedBest = uci === bestUci
    const mBefore = evals[i] * sign
    const mAfter = evals[i + 1] * sign
    const cpLoss = playedBest ? 0 : Math.max(0, Math.min(1000, mBefore - mAfter))
    const wcB = winChance(mBefore)
    const wcA = playedBest ? wcB : winChance(mAfter)
    const base = baseJudgment(wcB, wcA, playedBest)
    const bestMove = findMove(before, bestUci)
    sansSoFar.push(m.san)
    if (inBook) inBook = await isBookPrefix(sansSoFar)
    const feats = moveFeatures(before, m)
    const prev = plies[i - 1]
    let judgment: Judgment = base
    const p: PlyAnalysis = {
      ply: i + 1,
      mover,
      san: m.san,
      uci,
      evalBefore: evals[i],
      evalAfter: evals[i + 1],
      mateBefore: mates[i],
      mateAfter: mates[i + 1],
      bestUci,
      bestSan: bestMove?.san ?? '',
      bestLine: sanLine(fens[i], bestLines[i]),
      cpLoss,
      accuracy: Math.round(moveAccuracy(wcB, wcA) * 10) / 10,
      judgment,
      phase: phaseOf(before, i + 1),
    }

    if (isError(base)) {
      const mateB = mates[i] !== null ? mates[i]! * sign : null
      const mateA = mates[i + 1] !== null ? mates[i + 1]! * sign : null
      const after = new Chess(fens[i + 1])
      const reply = bestUcis[i + 1] ? findMove(after, bestUcis[i + 1]) : undefined
      if (mateB !== null && mateB > 0 && (mateA === null || mateA <= 0)) {
        p.tag = 'missed-mate'
      } else if (mateA !== null && mateA < 0 && !(mateB !== null && mateB < 0)) {
        p.tag = 'allowed-mate'
      } else if (reply && isGoodCapture(after, reply)) {
        p.tag = 'hung-material'
        p.punish = reply.san
      } else if (bestMove && bestMove.captured && isGoodCapture(before, bestMove)) {
        p.tag = 'missed-tactic'
      } else {
        p.tag = 'positional'
      }
    }
    judgment = refineJudgment({
      base,
      playedBest,
      cpLoss,
      moverBefore: mBefore,
      moverAfter: mAfter,
      gap: gaps[i],
      sacrifice: feats.sacrifice,
      prevOpponentErred: !!prev && (prev.judgment === 'mistake' || prev.judgment === 'blunder'),
      book: inBook,
      missedWin: p.tag === 'missed-mate' || p.tag === 'missed-tactic',
    })
    p.judgment = judgment
    plies.push(p)
  }

  // Key moments for the player: worst three errors, explained.
  const errors = plies
    .filter((p) => p.mover === opts.playerColor && p.tag)
    .sort((a, b) => b.cpLoss - a.cpLoss)
    .slice(0, 3)
    .sort((a, b) => a.ply - b.ply)
  const keyMoments: KeyMoment[] = []
  for (const p of errors) {
    if (cancelled()) throw new Error('cancelled')
    const before = new Chess(fens[p.ply - 1])
    const bestMove = findMove(before, p.bestUci)
    let idea = ''
    if (bestMove) {
      const sign = p.mover === 'w' ? 1 : -1
      try {
        idea = await explainMove(before, bestMove, engine, {
          cp: p.evalBefore * sign,
          mate: p.mateBefore !== null ? p.mateBefore * sign : null,
        })
      } catch {
        idea = ''
      }
    }
    const loss = p.cpLoss >= 1000 ? 'the game' : `${(p.cpLoss / 100).toFixed(1)} pawns`
    const lost = p.judgment === 'inaccuracy' ? `cost about ${loss}` : `lost about ${loss}`
    const captured = bestMove?.captured ? ` the ${NAME[bestMove.captured]}` : ''
    void captured
    keyMoments.push({
      ply: p.ply,
      text: `${moveLabel(p.ply, p.san)} ${lost}. ${tagText(p)} Better was ${p.bestSan}${idea ? ': ' + idea : '.'}`,
    })
    done++
    progress()
  }
  done = total
  progress()

  return {
    version: 1,
    analyzedAt: Date.now(),
    movetime,
    evals,
    mates,
    plies,
    white: summarize(plies, 'w'),
    black: summarize(plies, 'b'),
    keyMoments,
  }
}

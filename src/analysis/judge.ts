// Move judgments shared by game analysis and live play feedback.

export type Judgment = 'brilliant' | 'great' | 'best' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder'

/** Lichess-style winning chances in [-1, 1] from a centipawn eval. */
export function winChance(cp: number): number {
  const c = Math.max(-1000, Math.min(1000, cp))
  return 2 / (1 + Math.exp(-0.00368208 * c)) - 1
}

export function baseJudgment(wcBefore: number, wcAfter: number, playedBest: boolean): Judgment {
  const drop = wcBefore - wcAfter
  if (drop >= 0.3) return 'blunder'
  if (drop >= 0.2) return 'mistake'
  if (drop >= 0.1) return 'inaccuracy'
  return playedBest ? 'best' : 'good'
}

export interface RefineInput {
  base: Judgment
  playedBest: boolean
  cpLoss: number
  /** mover-perspective eval before and after, centipawns */
  moverBefore: number
  moverAfter: number
  /** centipawns between the best and second-best move, if known */
  gap: number | null
  sacrifice: boolean
  /** the opponent's previous move was a mistake or blunder */
  prevOpponentErred: boolean
  book: boolean
  missedWin: boolean
}

export function refineJudgment(i: RefineInput): Judgment {
  if (i.book && i.cpLoss < 50) return 'book'
  if (i.base === 'best' || (i.base === 'good' && i.cpLoss <= 15)) {
    if (i.sacrifice && i.moverBefore < 400 && i.moverAfter > -60) return 'brilliant'
    if (i.playedBest && i.gap !== null && i.gap >= 120 && i.moverBefore > -200) return 'great'
    if (i.playedBest && i.prevOpponentErred && i.moverAfter >= 50) return 'great'
  }
  if ((i.base === 'inaccuracy' || i.base === 'mistake') && i.missedWin) return 'miss'
  return i.base
}

export const JUDGMENT_META: Record<Judgment, { word: string; symbol: string; color: string }> = {
  brilliant: { word: 'Brilliant', symbol: '!!', color: '#26c2a3' },
  great: { word: 'Great', symbol: '!', color: '#5b8def' },
  best: { word: 'Best', symbol: '★', color: '#81b64c' },
  good: { word: 'Good', symbol: '✓', color: '#95b776' },
  book: { word: 'Book', symbol: '📖', color: '#a88865' },
  inaccuracy: { word: 'Inaccuracy', symbol: '?!', color: '#f7c631' },
  mistake: { word: 'Mistake', symbol: '?', color: '#ffa459' },
  miss: { word: 'Miss', symbol: '✗', color: '#ff7769' },
  blunder: { word: 'Blunder', symbol: '??', color: '#fa412d' },
}

export function isError(j: Judgment): boolean {
  return j === 'inaccuracy' || j === 'mistake' || j === 'miss' || j === 'blunder'
}

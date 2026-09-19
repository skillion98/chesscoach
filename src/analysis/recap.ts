// The coach's recap: two short paragraphs written from the analysis, in a coach's voice.

import { Chess } from 'chess.js'
import type { GameRecord } from '../lib/db'
import { moveFeatures } from '../game/features'
import { VALUE } from '../game/explain'
import type { CourseMatch } from '../openings/stats'
import { isError } from './judge'
import { moveLabel, tagText, type GameAnalysis, type PlyAnalysis } from './analyze'
import { gamePatternNotes } from '../coach/patterns'

export interface Recap {
  wentWell: string
  improve: string
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const n = (k: number, one: string, many = one + 's') => `${k} ${k === 1 ? one : many}`
const moveNo = (ply: number) => Math.ceil(ply / 2)

export function buildRecap(game: GameRecord, a: GameAnalysis, course: CourseMatch | null): Recap {
  const me = game.playerColor
  const mine = a.plies.filter((p) => p.mover === me)
  const theirs = a.plies.filter((p) => p.mover !== me)
  const won = game.result !== '1/2-1/2' && (game.result === '1-0') === (me === 'w')
  const drew = game.result === '1/2-1/2'
  const sign = me === 'w' ? 1 : -1

  const phase = (ph: PlyAnalysis['phase']) => mine.filter((p) => p.phase === ph)
  const errs = (ps: PlyAnalysis[]) => ps.filter((p) => isError(p.judgment))
  const opening = phase('opening')
  const middle = phase('middlegame')
  const ending = phase('endgame')
  const openingErrs = errs(opening)
  const middleErrs = errs(middle)
  const endErrs = errs(ending)
  const allErrs = errs(mine)
  const blunders = mine.filter((p) => p.judgment === 'blunder')
  const stars = mine.filter((p) => p.judgment === 'brilliant' || p.judgment === 'great')
  const worst = [...allErrs].sort((x, y) => y.cpLoss - x.cpLoss)[0]

  // material lead over the game, from my perspective
  const c = new Chess()
  const lead: number[] = [0]
  const trades: number[] = []
  for (let i = 0; i < game.moves.length; i++) {
    const before = new Chess(c.fen())
    const m = c.move(game.moves[i])
    let mat = 0
    for (const row of c.board()) for (const cell of row) if (cell && cell.type !== 'k') mat += (cell.color === me ? 1 : -1) * VALUE[cell.type]
    lead.push(mat)
    if (m.color === me && moveFeatures(before, m).trade) trades.push(i + 1)
  }
  const firstLeadPly = lead.findIndex((l, i) => i > 0 && l >= 2)
  const tradesAfterLead = firstLeadPly > 0 ? trades.filter((t) => t > firstLeadPly).length : 0
  const finalEval = a.evals[a.evals.length - 1] * sign

  const patterns = gamePatternNotes(game)

  // --- paragraph 1: what went well ---
  const good: string[] = []
  if (course && course.matched >= 6) {
    good.push(
      `You followed the ${course.title} (${course.chapterName}) for ${moveNo(course.matched)} moves` +
        (course.deviation ? `, then left the line on move ${moveNo(course.deviation.ply)} with ${course.deviation.played} instead of ${course.deviation.expected}.` : ' without a slip.'),
    )
  } else if (game.opening) {
    good.push(
      openingErrs.length === 0
        ? `You handled the ${game.opening.name} accurately: no errors in the opening.`
        : `The opening was the ${game.opening.name}; you were ${n(openingErrs.length, 'error')} in it, so the position was already harder than it needed to be.`,
    )
  } else if (opening.length && openingErrs.length === 0) {
    good.push('Your opening moves were all sound.')
  }
  if (stars.length) {
    const s = stars[0]
    good.push(`${moveLabel(s.ply, s.san)} was ${s.judgment === 'brilliant' ? 'brilliant, a real sacrifice that worked' : 'a great find, the only move that kept things together'}.`)
  }
  if (middle.length >= 6 && middleErrs.length === 0) good.push(`Your middlegame was clean: ${n(middle.length, 'move')} without a mistake.`)
  else if (middle.length >= 6 && mean(middle.map((p) => p.accuracy)) >= 85) good.push('Most of your middlegame play was accurate.')
  if (won && firstLeadPly > 0) {
    good.push(
      tradesAfterLead >= 2
        ? `Once you were ahead on material around move ${moveNo(firstLeadPly)}, you traded ${n(tradesAfterLead, 'time')} and simplified, which is exactly how to convert an advantage.`
        : `You were ahead on material from move ${moveNo(firstLeadPly)} and carried it home.`,
    )
  }
  if (ending.length >= 6 && endErrs.length === 0) good.push('The endgame technique was precise.')
  if (won) {
    const theirWorst = [...errs(theirs)].sort((x, y) => y.cpLoss - x.cpLoss)[0]
    if (theirWorst) {
      const punished = a.plies[theirWorst.ply]
      good.push(
        `Your opponent's ${theirWorst.san} on move ${moveNo(theirWorst.ply)} handed you the game` +
          (punished && punished.mover === me && (punished.judgment === 'best' || punished.judgment === 'great' || punished.judgment === 'brilliant') ? ', and you found the punishment straight away.' : '.'),
      )
    }
  }
  if (patterns.good[0]) good.push(patterns.good[0])
  if (good.length === 0) good.push(won ? 'You won, and the engine agrees it was earned.' : drew ? 'You held the balance for most of the game.' : 'There were solid stretches in this game.')

  // --- paragraph 2: what to work on ---
  const fix: string[] = []
  if (patterns.bad[0]) fix.push(patterns.bad[0])
  if (patterns.bad[1]) fix.push(patterns.bad[1])
  if (worst) {
    const detail = tagText(worst)
    fix.push(`The move that cost the most was ${moveLabel(worst.ply, worst.san)} in the ${worst.phase}${detail ? `: ${detail.replace(/^This /, 'it ')}` : '.'} Better was ${worst.bestSan}.`)
  }
  const hung = allErrs.filter((p) => p.tag === 'hung-material').length
  const missed = allErrs.filter((p) => p.tag === 'missed-tactic' || p.tag === 'missed-mate').length
  const slow = allErrs.filter((p) => p.tag === 'positional').length
  if (hung >= 2) fix.push(`You left material hanging ${n(hung, 'time')}. Before every move, ask what your opponent can take.`)
  else if (hung === 1) fix.push('One hung piece. Make the "what can be taken?" check a habit before you touch a piece.')
  if (missed >= 1) fix.push(`You missed ${n(missed, 'tactical chance')}; when a capture or check is available, calculate it before playing a quiet move.`)
  if (slow >= 2 && openingErrs.some((p) => p.tag === 'positional') && !patterns.goodKeys.includes('development')) fix.push('In the opening, get the pieces out and the king castled before pawn adventures.')
  if (endErrs.length >= 2) fix.push(`The endgame got messy (${n(endErrs.length, 'error')}). Activate the king early and keep the rooks active; endgame puzzles will help.`)
  if (blunders.length >= 3) fix.push(`${blunders.length} blunders in one game says you were moving too fast. Slow down when the position is sharp.`)
  if (course?.deviation) fix.push(`Drill the ${course.chapterName} line so ${course.deviation.expected} comes automatically.`)
  if (!won && !drew && firstLeadPly > 0 && finalEval < -100) fix.push(`You were ahead around move ${moveNo(firstLeadPly)} and let it slip. When ahead, trade pieces, not pawns, and keep it simple.`)
  if (fix.length === 0) fix.push(allErrs.length === 0 ? 'Nothing to fix from this one. Push the difficulty up a notch.' : 'Only minor inaccuracies. Keep doing what you are doing and tighten the calculation in sharp moments.')

  return { wentWell: good.slice(0, 4).join(' '), improve: fix.slice(0, 5).join(' ') }
}

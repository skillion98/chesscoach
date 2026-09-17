// The virtual coach: turns games, analyses, puzzles, and drills into six radar axes,
// a style reading, a short plan, and an adaptive opponent suggestion. Rule-based.

import { Chess } from 'chess.js'
import { db, type GameRecord } from '../lib/db'
import type { PlyAnalysis } from '../analysis/analyze'
import { moveFeatures, styleFromFeatures, type MoveFeatures, type StyleProfile } from '../game/features'
import { PERSONALITIES, type Personality } from '../game/personalities'
import { clampElo } from '../game/levels'
import { getPuzzleProfile, themeAccuracy } from '../puzzles/puzzles'
import { COURSES } from '../openings/model'
import { courseMastery, weakLines } from '../openings/stats'
import { setSetting } from '../lib/db'

export type AxisKey = 'opening' | 'tactics' | 'calculation' | 'strategy' | 'endgame' | 'safety'

export interface Axis {
  key: AxisKey
  label: string
  /** 0..100, null when there is not enough data yet */
  score: number | null
  detail: string
  need?: string
}

export interface Recommendation {
  id: string
  title: string
  why: string
  action: string
  path: string
  /** settings to apply before navigating (e.g. puzzle theme) */
  setup?: () => Promise<void>
}

export interface Assessment {
  axes: Axis[]
  style: StyleProfile
  styleSummary: string
  recs: Recommendation[]
  suggested: OpponentSuggestion
  games: number
  analyzedGames: number
  puzzles: number
  drills: number
}

export interface OpponentSuggestion {
  elo: number
  personality: Personality
  reason: string
}

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x))
/** map a move-accuracy percentage into a 0..100 skill score (80% accuracy is a club player's ~55) */
const accScore = (acc: number) => clamp(((acc - 55) / 45) * 100)
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function isForcing(p: PlyAnalysis): boolean {
  const s = p.san + ' ' + p.bestSan
  return s.includes('x') || s.includes('+') || s.includes('#')
}

export async function suggestOpponent(rating: number, games?: GameRecord[]): Promise<OpponentSuggestion> {
  const all = games ?? (await db.games.orderBy('playedAt').reverse().limit(40).toArray())
  const rated = all.filter((g) => g.rated !== false).slice(0, 10)
  let adj = 0
  let reason = 'Play a few rated games and I will tune this.'
  if (rated.length >= 4) {
    const score = mean(rated.map((g) => (g.result === '1/2-1/2' ? 0.5 : (g.result === '1-0') === (g.playerColor === 'w') ? 1 : 0)))
    if (score >= 0.7) {
      adj = 80
      reason = `You scored ${Math.round(score * 100)}% in your last ${rated.length} rated games. Time to step up.`
    } else if (score >= 0.6) {
      adj = 40
      reason = `A ${Math.round(score * 100)}% score lately. A slightly stronger opponent will keep you sharp.`
    } else if (score <= 0.3) {
      adj = -80
      reason = `Only ${Math.round(score * 100)}% lately. Drop down, win some games, and rebuild confidence.`
    } else if (score <= 0.4) {
      adj = -40
      reason = `${Math.round(score * 100)}% in recent games. A touch easier so you can practice converting.`
    } else {
      reason = `About ${Math.round(score * 100)}% lately, which is the sweet spot. Stay here.`
    }
  }
  const elo = clampElo(rating + adj)
  const personality = PERSONALITIES.reduce((a, b) => (Math.abs(b.elo - elo) < Math.abs(a.elo - elo) ? b : a))
  return { elo, personality, reason }
}

function styleSummary(s: StyleProfile): string {
  if (s.moves < 60) return 'Not enough moves yet to read your style. Play three or four games.'
  const parts: string[] = []
  if (s.attacking >= 0.6) parts.push('attacking')
  else if (s.attacking <= 0.4) parts.push('quiet')
  if (s.positional >= 0.6) parts.push('positional')
  if (s.solid >= 0.6) parts.push('solid')
  else if (s.solid <= 0.4) parts.push('loose')
  if (s.dynamic >= 0.6) parts.push('dynamic')
  if (parts.length === 0) return 'Balanced: no strong lean toward attack or defense yet.'
  const label = parts.slice(0, 2).join(' and ')
  const tip =
    s.attacking >= 0.6 && s.solid <= 0.45
      ? 'You go for the throat and sometimes leave the back door open.'
      : s.attacking <= 0.4 && s.solid >= 0.55
        ? 'You avoid complications; you will need to embrace a few to climb.'
        : s.dynamic >= 0.6
          ? 'You like imbalances, which wins games and loses games.'
          : 'A steady style that improves fastest by cutting blunders.'
  return `${label.charAt(0).toUpperCase() + label.slice(1)}. ${tip}`
}

export async function assess(): Promise<Assessment> {
  const [games, puzzleProf, themeAcc, weak] = await Promise.all([
    db.games.orderBy('playedAt').reverse().limit(60).toArray(),
    getPuzzleProfile(),
    themeAccuracy(200),
    weakLines(5),
  ])
  const analyzed = games.filter((g) => g.analysis)
  const mine: PlyAnalysis[] = []
  for (const g of analyzed) for (const p of g.analysis!.plies) if (p.mover === g.playerColor) mine.push(p)

  // --- style from the last 15 games ---
  const feats: MoveFeatures[] = []
  for (const g of games.slice(0, 15)) {
    const c = new Chess()
    for (let i = 0; i < g.moves.length; i++) {
      const mover = i % 2 === 0 ? 'w' : 'b'
      if (mover === g.playerColor && i >= 6) {
        const before = new Chess(c.fen())
        const m = c.move(g.moves[i])
        feats.push(moveFeatures(before, m))
      } else {
        c.move(g.moves[i])
      }
    }
  }
  const style = styleFromFeatures(feats)

  // --- openings ---
  const masteries = await Promise.all(COURSES.map((c) => courseMastery(c)))
  const tried = masteries.filter((m) => m.chapters.some((ch) => ch.tried > 0))
  const drills = masteries.reduce((a, m) => a + m.chapters.reduce((b, ch) => b + ch.attempts, 0), 0)
  const openingPlies = mine.filter((p) => p.phase === 'opening')
  const openingAcc = openingPlies.length >= 20 ? accScore(mean(openingPlies.map((p) => p.accuracy))) : null
  const masteryScore = tried.length && drills >= 10 ? mean(tried.map((m) => m.score)) * 100 : null
  const openingScore =
    openingAcc !== null && masteryScore !== null
      ? 0.5 * openingAcc + 0.5 * masteryScore
      : (openingAcc ?? masteryScore)

  // --- tactics ---
  const puzzleCount = puzzleProf.solved + puzzleProf.failed
  const puzzleScore = puzzleCount >= 10 ? clamp(((puzzleProf.rating - 800) / 1200) * 100) : null
  const tacticalErrors = mine.filter((p) => p.tag === 'hung-material' || p.tag === 'missed-tactic' || p.tag === 'missed-mate' || p.tag === 'allowed-mate').length
  const inGameTactics = mine.length >= 60 ? clamp(100 - (tacticalErrors / mine.length) * 100 * 15) : null
  const tacticsScore =
    puzzleScore !== null && inGameTactics !== null ? 0.6 * puzzleScore + 0.4 * inGameTactics : (puzzleScore ?? inGameTactics)

  // --- calculation ---
  const forcing = mine.filter(isForcing)
  const forcingScore = forcing.length >= 30 ? accScore(mean(forcing.map((p) => p.accuracy))) : null
  const longPz = ['mate'].map((k) => themeAcc[k]).filter(Boolean)
  const longScore = longPz.length && longPz[0]!.tried >= 8 ? (longPz[0]!.solved / longPz[0]!.tried) * 100 : null
  const calcScore =
    forcingScore !== null && longScore !== null ? 0.7 * forcingScore + 0.3 * longScore : (forcingScore ?? longScore)

  // --- strategy ---
  const quiet = mine.filter((p) => !isForcing(p) && p.phase === 'middlegame')
  const strategyScore = quiet.length >= 30 ? accScore(mean(quiet.map((p) => p.accuracy))) : null

  // --- endgame ---
  const endPlies = mine.filter((p) => p.phase === 'endgame')
  const endAcc = endPlies.length >= 20 ? accScore(mean(endPlies.map((p) => p.accuracy))) : null
  const endPz = themeAcc['endgame']
  const endPzScore = endPz && endPz.tried >= 8 ? (endPz.solved / endPz.tried) * 100 : null
  const endgameScore = endAcc !== null && endPzScore !== null ? 0.6 * endAcc + 0.4 * endPzScore : (endAcc ?? endPzScore)

  // --- safety (blunder rate) ---
  const blunders = mine.filter((p) => p.judgment === 'blunder').length
  const blunderRate = mine.length ? (blunders / mine.length) * 100 : 0
  const safetyScore = mine.length >= 60 ? clamp(100 - blunderRate * 12) : null

  const axes: Axis[] = [
    {
      key: 'opening',
      label: 'Opening',
      score: openingScore === null ? null : Math.round(openingScore),
      detail:
        openingScore === null
          ? 'Analyze a few games or drill a course.'
          : `${openingPlies.length} opening moves analyzed${tried.length ? `, ${tried.length} course${tried.length === 1 ? '' : 's'} drilled` : ''}.`,
    },
    {
      key: 'tactics',
      label: 'Tactics',
      score: tacticsScore === null ? null : Math.round(tacticsScore),
      detail:
        tacticsScore === null
          ? 'Solve 10 puzzles to unlock.'
          : `Puzzle rating ${puzzleProf.rating}${mine.length ? `, ${tacticalErrors} tactical errors in ${mine.length} analyzed moves` : ''}.`,
    },
    {
      key: 'calculation',
      label: 'Calculation',
      score: calcScore === null ? null : Math.round(calcScore),
      detail: calcScore === null ? 'Needs 30 analyzed forcing moves or 8 mate puzzles.' : `Accuracy in ${forcing.length} forcing positions.`,
    },
    {
      key: 'strategy',
      label: 'Strategy',
      score: strategyScore === null ? null : Math.round(strategyScore),
      detail: strategyScore === null ? 'Needs 30 analyzed quiet middlegame moves.' : `Accuracy in ${quiet.length} quiet middlegame positions.`,
    },
    {
      key: 'endgame',
      label: 'Endgame',
      score: endgameScore === null ? null : Math.round(endgameScore),
      detail: endgameScore === null ? 'Needs 20 analyzed endgame moves or 8 endgame puzzles.' : `${endPlies.length} endgame moves analyzed.`,
    },
    {
      key: 'safety',
      label: 'Safety',
      score: safetyScore === null ? null : Math.round(safetyScore),
      detail: safetyScore === null ? 'Analyze 3 or 4 games to measure your blunder rate.' : `${blunderRate.toFixed(1)} blunders per 100 moves.`,
    },
  ]

  // --- recommendations ---
  const recs: Recommendation[] = []
  const scored = axes.filter((a) => a.score !== null).sort((a, b) => a.score! - b.score!)
  const push = (r: Recommendation) => {
    if (recs.length < 3 && !recs.some((x) => x.id === r.id)) recs.push(r)
  }
  const puzzleRec = (theme: string, title: string, why: string): Recommendation => ({
    id: 'pz-' + theme,
    title,
    why,
    action: 'Solve 10 puzzles',
    path: '/puzzles',
    setup: () => setSetting('puzzleTheme', theme),
  })
  const playRec = (id: string, title: string, why: string): Recommendation => ({
    id: 'play-' + id,
    title,
    why,
    action: `Play ${PERSONALITIES.find((p) => p.id === id)?.name ?? id}`,
    path: '/play',
    setup: async () => {
      await setSetting('opponentMode', 'personality')
      await setSetting('lastPersonality', id)
    },
  })

  if (analyzed.length === 0 && games.length > 0) {
    push({
      id: 'analyze',
      title: 'Analyze your last game',
      why: 'Everything I know about you starts with analyzed games. It takes about half a minute.',
      action: 'Analyze',
      path: `/games/${games[0].id}/analyze`,
    })
  }
  if (weak.length > 0) {
    push({
      id: 'weak-lines',
      title: `Fix your weak line: ${weak[0].title}`,
      why: `You keep missing ${weak[0].expected} in the ${weak[0].chapterName}. Drilling the exact position fixes it fastest.`,
      action: 'Drill it',
      path: `/openings/${weak[0].slug}/${weak[0].chapter}/drill/${weak[0].ply}`,
    })
  }
  for (const a of scored) {
    if (a.score! >= 70) break
    switch (a.key) {
      case 'safety':
        push(puzzleRec('hanging', 'Stop hanging pieces', `${blunderRate.toFixed(1)} blunders per 100 moves is what is holding your rating down. Before every move ask: what can be taken?`))
        push(playRec('walt', 'Play Grandpa Walt for a clean game', 'A slow opponent gives you time to check every move for hanging pieces.'))
        break
      case 'tactics':
        push(puzzleRec('fork', 'Pattern drill: forks', 'Forks and pins are the most common tactics at your level, in both directions.'))
        push(playRec('ingrid', 'Hunt tactics against Ingrid', 'She overlooks sharp tactics, so every game rewards you for looking.'))
        break
      case 'calculation':
        push(puzzleRec('mate', 'Calculate mates to the end', 'Mate-in-two and three puzzles force you to see the whole line before moving.'))
        break
      case 'strategy':
        push(puzzleRec('quiet', 'Find the quiet move', 'Your quiet-position accuracy is the gap. These puzzles have no capture or check as the answer.'))
        push(playRec('dmitri', 'Outplay The Wall', 'Dmitri never attacks. The only way to beat him is a patient plan.'))
        break
      case 'endgame':
        push(puzzleRec('endgame', 'Endgame technique', 'Your endgame accuracy drops off. Rook and pawn endings first.'))
        push(playRec('nadia', 'Trade down against Nadia', 'Survive her attack, trade queens, and practice converting endgames against a weak endgame player.'))
        break
      case 'opening':
        push({
          id: 'course',
          title: tried.length ? 'Keep drilling your openings' : 'Start an opening course',
          why: tried.length ? 'Your drill grades are below B. Ten minutes a day fixes that.' : 'Pick the opening you play most and learn its main variations.',
          action: 'Openings',
          path: '/openings',
        })
        break
    }
  }
  // style-based nudges
  if (style.moves >= 60) {
    if (style.attacking <= 0.4 && style.solid >= 0.55) push(playRec('rosie', 'Learn to weather a storm', 'You avoid complications. Rosie will throw pieces at you; defending her attacks builds nerve.'))
    if (style.attacking >= 0.6 && style.solid <= 0.45) push(playRec('dmitri', 'Practice patience', 'You attack early and loosen your position. Dmitri punishes that by simply defending.'))
  }
  if (recs.length === 0) {
    push({
      id: 'play',
      title: 'Play a rated game',
      why: 'Three or four analyzed games give the radar something to measure.',
      action: 'Play',
      path: '/play',
    })
    push(puzzleRec('mixed', 'Warm up with puzzles', 'Ten mixed puzzles calibrate your puzzle rating.'))
  }

  const profile = games[0]?.ratingAfter ?? 1500
  const suggested = await suggestOpponent(profile, games)

  return {
    axes,
    style,
    styleSummary: styleSummary(style),
    recs,
    suggested,
    games: games.length,
    analyzedGames: analyzed.length,
    puzzles: puzzleCount,
    drills,
  }
}

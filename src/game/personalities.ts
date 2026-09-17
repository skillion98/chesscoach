// Named opponents with a playing style and a built-in weakness. Style is applied by
// re-scoring the engine's candidate moves with feature weights (in centipawns);
// weaknesses adjust temperature or blind the personality to certain moves.

import type { Chess } from 'chess.js'
import type { PvLine } from '../engine/stockfish'
import { findMove, nonPawnMaterial } from './explain'
import { moveFeatures, type FeatureKey } from './features'
import type { Strength } from './levels'

export type Weakness = 'none' | 'hanging' | 'tactics' | 'endgame' | 'opening' | 'greedy'

export interface Personality {
  id: string
  name: string
  elo: number
  tagline: string
  bio: string
  style: string[]
  weakness: Weakness
  weaknessText: string
  weights: Partial<Record<FeatureKey, number>>
  /** added to the strength temperature (centipawns) */
  tempBonus: number
  /** added to the random-move chance */
  randomBonus: number
  /** never choose a move this many centipawns worse than the best (unless random) */
  maxLoss: number
  hue: number
  glyph: string
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'pip',
    name: 'Pip',
    elo: 700,
    tagline: 'Eight years old and fearless.',
    bio: 'Pip loves giving check and grabbing pieces, and forgets that yours can grab back. Great for practicing clean, patient chess.',
    style: ['Attacking', 'Reckless'],
    weakness: 'hanging',
    weaknessText: 'Leaves pieces hanging. Look for free material every move.',
    weights: { check: 40, capture: 25, kingAttack: 20, retreat: -20 },
    tempBonus: 40,
    randomBonus: 0.06,
    maxLoss: 900,
    hue: 40,
    glyph: '♟',
  },
  {
    id: 'walt',
    name: 'Grandpa Walt',
    elo: 1000,
    tagline: 'Slow, solid, and allergic to risk.',
    bio: 'Walt castles early, trades whenever he can, and never sacrifices. He does not calculate much, so combinations sail right past him.',
    style: ['Solid', 'Simplifier'],
    weakness: 'tactics',
    weaknessText: 'Misses combinations. Set up forks and pins; he will not see them coming.',
    weights: { trade: 45, castle: 40, quiet: 10, sacrifice: -120, hangs: -80, retreat: 5 },
    tempBonus: 0,
    randomBonus: 0,
    maxLoss: 400,
    hue: 200,
    glyph: '♖',
  },
  {
    id: 'rosie',
    name: 'Rosie',
    elo: 1200,
    tagline: 'Gambits, sacrifices, and fireworks.',
    bio: 'Rosie throws pawns and pieces at your king from move one. If you survive the storm, she has no idea how to play an endgame.',
    style: ['Attacking', 'Gambiteer'],
    weakness: 'endgame',
    weaknessText: 'Falls apart in endgames. Defend accurately, trade queens, and grind.',
    weights: { sacrifice: 70, check: 30, capture: 15, kingAttack: 35, development: 20, retreat: -40, trade: -25, hangs: -20 },
    tempBonus: 20,
    randomBonus: 0,
    maxLoss: 350,
    hue: 330,
    glyph: '♗',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    elo: 1400,
    tagline: 'If it is free, he takes it.',
    bio: 'Marcus counts material and nothing else. He grabs pawns on the edge of the board while his king sits in the center.',
    style: ['Materialist', 'Greedy'],
    weakness: 'greedy',
    weaknessText: 'Takes poisoned pawns. Offer material that costs him time or king safety.',
    weights: { capture: 50, sacrifice: -60, kingAttack: -10, castle: 10, hangs: -30, development: -10 },
    tempBonus: 10,
    randomBonus: 0,
    maxLoss: 300,
    hue: 90,
    glyph: '♙',
  },
  {
    id: 'ingrid',
    name: 'Ingrid',
    elo: 1500,
    tagline: 'Develops, centralizes, improves.',
    bio: 'Ingrid plays by the book: develop, castle, control the center, trade when ahead. She is hard to outplay slowly but can be caught by sharp tactics.',
    style: ['Positional', 'Classical'],
    weakness: 'tactics',
    weaknessText: 'Overlooks sharp tactics. Keep the position complicated and look for forcing lines.',
    weights: { development: 30, centerPawn: 20, castle: 40, quiet: 15, trade: 10, sacrifice: -100, hangs: -100, kingAttack: -5 },
    tempBonus: 0,
    randomBonus: 0,
    maxLoss: 200,
    hue: 160,
    glyph: '♘',
  },
  {
    id: 'dmitri',
    name: 'Dmitri',
    elo: 1650,
    tagline: 'The Wall. Nothing gets through.',
    bio: 'Dmitri defends everything, retreats when in doubt, and trades pieces to kill your attack. He almost never attacks, so he runs out of ideas if you keep pieces on and build slowly.',
    style: ['Defensive', 'Solid'],
    weakness: 'none',
    weaknessText: 'Passive. Avoid trades, gain space, and squeeze; he will not counterattack.',
    weights: { retreat: 10, trade: 35, castle: 50, quiet: 20, sacrifice: -150, hangs: -120, check: -10, advance: -5, kingAttack: -15 },
    tempBonus: 0,
    randomBonus: 0,
    maxLoss: 150,
    hue: 220,
    glyph: '♜',
  },
  {
    id: 'nadia',
    name: 'Nadia',
    elo: 1800,
    tagline: 'Every piece points at your king.',
    bio: 'Nadia plays for the initiative: checks, pawn storms, and sacrifices for open lines. Her endgame technique does not match her attack.',
    style: ['Attacking', 'Dynamic'],
    weakness: 'endgame',
    weaknessText: 'Weaker in endgames. Neutralize the attack, trade queens, and outplay her technically.',
    weights: { kingAttack: 40, check: 25, sacrifice: 50, advance: 10, capture: 10, retreat: -30, trade: -30, hangs: -40 },
    tempBonus: 10,
    randomBonus: 0,
    maxLoss: 220,
    hue: 0,
    glyph: '♛',
  },
  {
    id: 'ellis',
    name: 'Coach Ellis',
    elo: 2000,
    tagline: 'Plays the best move, the human way.',
    bio: 'Ellis is the sparring partner for when you want a straight fight: no gimmicks, no blind spots, just strong, natural chess.',
    style: ['Universal', 'Balanced'],
    weakness: 'none',
    weaknessText: 'No built-in weakness. Beat him on the merits.',
    weights: {},
    tempBonus: 0,
    randomBonus: 0,
    maxLoss: 80,
    hue: 45,
    glyph: '♔',
  },
]

export function personalityById(id: string | undefined): Personality | undefined {
  return id ? PERSONALITIES.find((p) => p.id === id) : undefined
}

/** Strength parameters for a personality: its rating, with enough candidate lines for style to matter. */
export function personalityStrength(p: Personality, base: (elo: number) => Strength): Strength {
  const s = base(p.elo)
  return { ...s, multipv: Math.max(6, s.multipv), temperature: Math.max(15, s.temperature) }
}

export function choosePersonalityMove(
  chess: Chess,
  lines: PvLine[],
  legalUci: string[],
  p: Personality,
  strength: Strength,
  rand: () => number = Math.random,
): string {
  if (legalUci.length === 0) return ''
  const randomChance = strength.randomMoveChance + p.randomBonus
  if (rand() < randomChance) return legalUci[Math.floor(rand() * legalUci.length)]

  const cands = lines
    .filter((l) => legalUci.includes(l.move))
    .map((l) => ({ uci: l.move, cp: l.cp, m: findMove(chess, l.move)! }))
    .filter((c) => !!c.m)
  if (cands.length === 0) return legalUci[0]

  const best = Math.max(...cands.map((c) => c.cp))
  const weights = { ...p.weights }
  if (p.weakness === 'hanging') delete weights.hangs

  let temp = strength.temperature + p.tempBonus
  if (p.weakness === 'endgame' && nonPawnMaterial(chess) <= 26) temp = temp * 2.5 + 60
  if (p.weakness === 'opening' && chess.moveNumber() <= 10) temp = temp * 2 + 40

  const scored = cands.map((c) => {
    const f = moveFeatures(chess, c.m)
    let s = c.cp
    for (const k of Object.keys(weights) as FeatureKey[]) if (f[k]) s += weights[k] ?? 0
    return { c, s, f }
  })

  if (p.weakness === 'tactics') {
    const sorted = [...scored].sort((a, b) => b.c.cp - a.c.cp)
    const top = sorted[0]
    const second = sorted[1]
    if (second && (top.f.capture || top.f.check) && top.c.cp - second.c.cp > 60 && rand() < 0.45) {
      top.s -= top.c.cp - second.c.cp + 30
    }
  }

  const eligible = scored.filter((x) => best - x.c.cp <= p.maxLoss)
  const pool = eligible.length ? eligible : scored
  if (temp <= 0) return pool.reduce((a, b) => (b.s > a.s ? b : a)).c.uci
  const top = Math.max(...pool.map((x) => x.s))
  const ws = pool.map((x) => Math.exp((x.s - top) / temp))
  const total = ws.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i]
    if (r <= 0) return pool[i].c.uci
  }
  return pool[pool.length - 1].c.uci
}

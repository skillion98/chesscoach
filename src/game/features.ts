// Style features of a single move, used to give engine personalities a playing style
// and to measure the player's own style from their games.

import { Chess, type Color, type Move, type Square } from 'chess.js'
import { VALUE, canRecapture } from './explain'

export interface MoveFeatures {
  capture: boolean
  check: boolean
  castle: boolean
  development: boolean
  retreat: boolean
  advance: boolean
  pawnMove: boolean
  centerPawn: boolean
  trade: boolean
  sacrifice: boolean
  hangs: boolean
  kingAttack: boolean
  quiet: boolean
  promotion: boolean
}

export type FeatureKey = keyof MoveFeatures

const FILES = 'abcdefgh'

function findKing(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) for (const c of row) if (c && c.type === 'k' && c.color === color) return c.square
  return null
}

function dist(a: Square, b: Square): number {
  return Math.max(Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0])), Math.abs(Number(a[1]) - Number(b[1])))
}

export function moveFeatures(before: Chess, m: Move): MoveFeatures {
  const us = m.color
  const them: Color = us === 'w' ? 'b' : 'w'
  const after = new Chess(before.fen())
  after.move(m)
  const capture = !!m.captured
  const check = after.inCheck()
  const castle = m.flags.includes('k') || m.flags.includes('q')
  const home = us === 'w' ? '1' : '8'
  const development = (m.piece === 'n' || m.piece === 'b') && m.from[1] === home && before.moveNumber() <= 14
  const relFrom = us === 'w' ? Number(m.from[1]) : 9 - Number(m.from[1])
  const relTo = us === 'w' ? Number(m.to[1]) : 9 - Number(m.to[1])
  const pawnMove = m.piece === 'p'
  const retreat = !pawnMove && m.piece !== 'k' && relTo < relFrom
  const advance = relTo > relFrom
  const centerPawn = pawnMove && 'cdef'.includes(m.to[0]) && (relTo === 4 || relTo === 5)
  const attackers = after.attackers(m.to, them)
  const defenders = after.attackers(m.to, us)
  const minAttacker = attackers.length ? Math.min(...attackers.map((s) => VALUE[after.get(s)!.type])) : Infinity
  const pieceV = m.promotion ? VALUE[m.promotion] : VALUE[m.piece]
  const hangs = m.piece !== 'k' && attackers.length > 0 && (defenders.length === 0 || minAttacker < pieceV)
  const capV = m.captured ? VALUE[m.captured] : 0
  const recap = capture ? canRecapture(before, m) : false
  const trade = capture && capV === pieceV && recap
  const sacrifice = (capture && capV < pieceV && recap) || (!capture && hangs && pieceV >= 3)
  const kingSq = findKing(after, them)
  const kingAttack = check || (kingSq !== null && dist(m.to, kingSq) <= 2 && !pawnMove)
  const quiet = !capture && !check
  return {
    capture,
    check,
    castle,
    development,
    retreat,
    advance,
    pawnMove,
    centerPawn,
    trade,
    sacrifice,
    hangs,
    kingAttack,
    quiet,
    promotion: !!m.promotion,
  }
}

export interface StyleProfile {
  /** 0..1 each; independent axes */
  attacking: number
  positional: number
  solid: number
  dynamic: number
  moves: number
}

/** Aggregate a player's style from the features of their moves (middlegame moves matter most). */
export function styleFromFeatures(fs: MoveFeatures[]): StyleProfile {
  const n = fs.length
  if (n === 0) return { attacking: 0.5, positional: 0.5, solid: 0.5, dynamic: 0.5, moves: 0 }
  const rate = (k: FeatureKey) => fs.filter((f) => f[k]).length / n
  const clamp = (x: number) => Math.max(0, Math.min(1, x))
  // typical rates for a club player: checks ~6%, captures ~22%, sacrifices ~1.5%, quiet ~72%, trades ~7%
  const attacking = clamp(0.5 + (rate('check') - 0.06) * 3 + (rate('kingAttack') - 0.12) * 1.5 + (rate('sacrifice') - 0.015) * 8)
  const positional = clamp(0.5 + (rate('quiet') - 0.72) * 1.2 + (rate('development') - 0.08) * 1.5 + (rate('centerPawn') - 0.05) * 2)
  const solid = clamp(0.5 + (rate('trade') - 0.07) * 3 + (rate('retreat') - 0.08) * 1.5 - (rate('sacrifice') - 0.015) * 8 - (rate('hangs') - 0.03) * 4)
  const dynamic = clamp(0.5 + (rate('sacrifice') - 0.015) * 10 + (rate('advance') - 0.45) * 0.8 - (rate('trade') - 0.07) * 2)
  return { attacking, positional, solid, dynamic, moves: n }
}

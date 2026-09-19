// Teaching-mode threat scan: which pieces are hanging, which are under attack, which can be won.
// A rough static exchange view (cheapest attacker versus piece value), good enough to teach with.

import type { Chess, Color, PieceSymbol, Square } from 'chess.js'

export type ThreatKind = 'hanging' | 'attacked' | 'winnable'

export interface Threat {
  square: Square
  piece: PieceSymbol
  kind: ThreatKind
  /** the squares of the pieces that attack it (opponent's for hanging/attacked, ours for winnable) */
  attackers: Square[]
}

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

function cheapest(chess: Chess, squares: Square[]): number {
  let v = Infinity
  for (const s of squares) {
    const p = chess.get(s)
    if (p) v = Math.min(v, PIECE_VALUE[p.type])
  }
  return v
}

/** Threats from the point of view of `me`, in the current position. */
export function scanThreats(chess: Chess, me: Color): Threat[] {
  const opp: Color = me === 'w' ? 'b' : 'w'
  const out: Threat[] = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.type === 'k') continue
      const sq = cell.square
      const value = PIECE_VALUE[cell.type]
      if (cell.color === me) {
        const attackers = chess.attackers(sq, opp)
        if (attackers.length === 0) continue
        const defenders = chess.attackers(sq, me)
        const loses = defenders.length === 0 || cheapest(chess, attackers) < value
        out.push({ square: sq, piece: cell.type, kind: loses ? 'hanging' : 'attacked', attackers })
      } else {
        const attackers = chess.attackers(sq, me)
        if (attackers.length === 0) continue
        const defenders = chess.attackers(sq, opp)
        const wins = defenders.length === 0 || cheapest(chess, attackers) < value
        if (wins) out.push({ square: sq, piece: cell.type, kind: 'winnable', attackers })
      }
    }
  }
  // most valuable first so the overlay reads from the biggest problem down
  return out.sort((a, b) => PIECE_VALUE[b.piece] - PIECE_VALUE[a.piece])
}

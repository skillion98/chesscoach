// Running commentary: one plain-English sentence per move, from board features only
// (no engine), so it is instant. Both sides are described.

import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { NAME, VALUE, canRecapture, material, nonPawnMaterial } from './explain'
import { moveFeatures } from './features'

const FILES = 'abcdefgh'

function side(c: Color): string {
  return c === 'w' ? 'White' : 'Black'
}

function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w'
}

function relRank(s: Square, c: Color): number {
  const r = Number(s[1])
  return c === 'w' ? r : 9 - r
}

function pawnsOnFile(chess: Chess, file: number, color?: Color): number {
  let n = 0
  for (let r = 1; r <= 8; r++) {
    const p = chess.get((FILES[file] + r) as Square)
    if (p && p.type === 'p' && (!color || p.color === color)) n++
  }
  return n
}

function isPassed(chess: Chess, s: Square, c: Color): boolean {
  const f = FILES.indexOf(s[0])
  const r = Number(s[1])
  const dir = c === 'w' ? 1 : -1
  for (const df of [-1, 0, 1]) {
    if (f + df < 0 || f + df > 7) continue
    for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) {
      const p = chess.get((FILES[f + df] + rr) as Square)
      if (p && p.type === 'p' && p.color !== c) return false
    }
  }
  return true
}

/** Enemy pieces (not the king) attacked by the piece now on `from`. */
function targets(chess: Chess, from: Square, victim: Color): { square: Square; type: PieceSymbol; defended: boolean }[] {
  const out: { square: Square; type: PieceSymbol; defended: boolean }[] = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== victim || cell.type === 'k') continue
      if (chess.attackers(cell.square, other(victim)).includes(from)) {
        out.push({ square: cell.square, type: cell.type, defended: chess.attackers(cell.square, victim).length > 0 })
      }
    }
  }
  return out
}

function onLongDiagonal(s: Square): boolean {
  const f = FILES.indexOf(s[0])
  const r = Number(s[1]) - 1
  return f === r || f + r === 7
}

export function describeMove(before: Chess, m: Move): string {
  const us = m.color
  const them = other(us)
  const S = side(us)
  const T = side(them)
  const after = new Chess(before.fen())
  after.move(m)
  const f = moveFeatures(before, m)
  const piece = NAME[m.piece]
  const hits = targets(after, m.to, them).filter((h) => VALUE[h.type] > VALUE[m.piece] || !h.defended)
  const juicy = hits.sort((a, b) => VALUE[b.type] - VALUE[a.type])[0]
  const loose = f.hangs && !f.sacrifice ? ` The ${piece} is loose on ${m.to}, though.` : ''

  if (after.isCheckmate()) return `${S} delivers checkmate with ${m.san}.`
  if (f.castle) return `${S} castles ${m.flags.includes('k') ? 'kingside' : 'queenside'}: the king is safe and the rooks are connected.`
  if (m.promotion) return `${S} promotes a pawn to a ${NAME[m.promotion]}.${loose}`

  if (m.captured) {
    const capV = VALUE[m.captured]
    const pieceV = VALUE[m.piece]
    const last = before.history({ verbose: true }).slice(-1)[0]
    const recap = canRecapture(before, m)
    if (last && last.captured && last.to === m.to) return `${S} recaptures on ${m.to}.`
    if (!recap && capV >= 3) return `${S} picks up a free ${NAME[m.captured]} on ${m.to}.`
    if (!recap) return `${S} wins a pawn on ${m.to}.`
    if (capV > pieceV) {
      const exch = m.piece !== 'r' && m.captured === 'r' ? 'wins the exchange' : 'wins material'
      return `${S} ${exch}: a ${piece} for a ${NAME[m.captured]}.`
    }
    if (capV === pieceV) {
      const lead = material(before, us) - material(before, them)
      return `${S} trades ${piece}s on ${m.to}${lead >= 2 ? ', simplifying while ahead' : ''}.`
    }
    return `${S} sacrifices the ${piece} on ${m.to}!`
  }

  if (after.inCheck()) {
    if (juicy) return `${S} checks with the ${piece}, forking the king and the ${NAME[juicy.type]}!`
    return `${S} gives check with the ${piece}; ${T} must respond.`
  }
  if (hits.length >= 2) return `${S}'s ${piece} forks the ${NAME[hits[0].type]} and the ${NAME[hits[1].type]}.`
  if (f.development && juicy) return `${S} develops the ${piece} with tempo, attacking the ${NAME[juicy.type]}.`
  if (juicy && !juicy.defended) return `${S} attacks the undefended ${NAME[juicy.type]} on ${juicy.square} with the ${piece}.${loose}`
  if (juicy) return `${S} hits the ${NAME[juicy.type]} with the ${piece}, gaining a tempo.${loose}`

  if (f.development) {
    return m.piece === 'n'
      ? `${S} develops the knight to ${m.to}.`
      : `${S} develops the bishop to ${m.to}${onLongDiagonal(m.to) ? ', on the long diagonal' : ''}.`
  }

  if (m.piece === 'p') {
    const rr = relRank(m.to, us)
    const fwd = us === 'w' ? 1 : -1
    for (const df of [-1, 1]) {
      const ff = FILES.indexOf(m.to[0]) + df
      if (ff < 0 || ff > 7) continue
      const sq = (FILES[ff] + (Number(m.to[1]) + fwd)) as Square
      const p = after.get(sq)
      if (p && p.color === them) {
        return p.type === 'p'
          ? `${S} plays ${m.san}, challenging the pawn on ${sq}; the structure is about to change.`
          : `${S} kicks the ${NAME[p.type]} with ${m.san}.`
      }
    }
    if (rr >= 5 && isPassed(after, m.to, us)) return `${S} pushes the passed pawn to ${m.to}.`
    if (f.centerPawn) return `${S} stakes a claim in the center with ${m.san}.`
    if (before.moveNumber() <= 8) return `${S} opens lines with ${m.san}.`
    return `${S} gains space with ${m.san}.`
  }

  if (m.piece === 'r') {
    const file = FILES.indexOf(m.to[0])
    const own = pawnsOnFile(after, file, us)
    const theirs = pawnsOnFile(after, file, them)
    if (relRank(m.to, us) === 7) return `${S}'s rook invades the seventh rank.`
    if (own === 0 && theirs === 0) return `${S} puts the rook on the open ${m.to[0]}-file.`
    if (own === 0) return `${S} moves the rook to the half-open ${m.to[0]}-file, eyeing the pawn there.`
    return `${S} brings the rook to ${m.to}.${loose}`
  }
  if (m.piece === 'n') {
    const rr = relRank(m.to, us)
    const guarded = after.attackers(m.to, us).some((s) => after.get(s)?.type === 'p')
    if (rr >= 5 && guarded) return `${S} plants the knight on an outpost at ${m.to}.`
    if (f.retreat) return `${S} retreats the knight to ${m.to}.`
    if (rr >= 4) return `${S} centralizes the knight on ${m.to}.${loose}`
    return `${S} reroutes the knight to ${m.to}.`
  }
  if (m.piece === 'k') {
    const endgame = nonPawnMaterial(after) <= 14 && !after.board().flat().some((c) => c && c.type === 'q')
    return endgame ? `${S} activates the king; it is a fighting piece in the endgame.` : `${S} steps the king to ${m.to}.`
  }
  if (m.piece === 'q') {
    if (f.retreat) return `${S} pulls the queen back to ${m.to}.`
    return `${S} brings the queen to ${m.to}.${loose}`
  }
  if (m.piece === 'b') {
    if (f.retreat) return `${S} retreats the bishop to ${m.to}, keeping it safe.`
    return onLongDiagonal(m.to) ? `${S} puts the bishop on the long diagonal.` : `${S} repositions the bishop to ${m.to}.${loose}`
  }
  return `${S} plays ${m.san}.`
}

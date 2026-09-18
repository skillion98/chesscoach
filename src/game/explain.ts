// Rule-based "idea behind the move" for hints and analysis. Uses the engine for the move
// itself and for threat detection (null-move searches), and chess.js for board features.

import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import type { Engine } from '../engine/stockfish'

export interface HintLine {
  uci: string
  san: string
  cp: number
  mate: number | null
  /** SAN continuation, best move first */
  line: string[]
}

export interface Hint {
  uci: string
  san: string
  from: Square
  to: Square
  idea: string
  evalCp: number
  /** one-line verdict on the position from the player's side */
  assessment: string
  /** what the opponent would do if you passed, if it is dangerous */
  threat: string | null
  /** candidate moves, best first */
  lines: HintLine[]
}

/** Convert a UCI continuation to SAN from a position. */
export function pvToSan(fen: string, ucis: string[], max = 8): string[] {
  const c = new Chess(fen)
  const out: string[] = []
  for (const u of ucis.slice(0, max)) {
    const m = findMove(c, u)
    if (!m) break
    c.move(m)
    out.push(m.san)
  }
  return out
}

export function assessPosition(cp: number, mate: number | null): string {
  if (mate !== null) return mate > 0 ? `You have a forced mate in ${mate}.` : `You are getting mated in ${-mate} unless something changes.`
  if (cp >= 300) return `You are winning (${(cp / 100).toFixed(1)}). Keep it simple.`
  if (cp >= 100) return `You are clearly better (+${(cp / 100).toFixed(1)}).`
  if (cp >= 30) return `You are slightly better (+${(cp / 100).toFixed(1)}).`
  if (cp > -30) return 'The position is balanced.'
  if (cp > -100) return `You are slightly worse (${(cp / 100).toFixed(1)}).`
  if (cp > -300) return `You are worse (${(cp / 100).toFixed(1)}); look for activity and trades.`
  return `You are losing (${(cp / 100).toFixed(1)}); set problems and hope for a slip.`
}

/** The opponent's most dangerous idea if you passed: a good capture or a mate threat. */
export async function opponentThreat(chess: Chess, engine: Engine): Promise<Move | null> {
  if (chess.inCheck()) return null
  try {
    const passed = new Chess(nullMoveFen(chess.fen()))
    const r = await engine.search(passed.fen(), { movetime: 350, multipv: 1 })
    const t = r.lines[0] ? findMove(passed, r.lines[0].move) : undefined
    if (t && ((r.lines[0].mate !== null && r.lines[0].mate > 0) || (t.captured && isGoodCapture(passed, t)))) return t
  } catch {
    /* best effort */
  }
  return null
}

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
export const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const FILES = 'abcdefgh'

function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w'
}

/** Same position with the other side to move (a "pass"). Only valid when the side to move is not in check. */
export function nullMoveFen(fen: string): string {
  const parts = fen.split(' ')
  parts[1] = parts[1] === 'w' ? 'b' : 'w'
  parts[3] = '-'
  return parts.join(' ')
}

export function findMove(chess: Chess, uci: string): Move | undefined {
  return chess.moves({ verbose: true }).find((m) => m.from + m.to + (m.promotion ?? '') === uci)
}

export function material(chess: Chess, color: Color): number {
  let sum = 0
  for (const row of chess.board()) for (const sq of row) if (sq && sq.color === color) sum += VALUE[sq.type]
  return sum
}

export function nonPawnMaterial(chess: Chess): number {
  let sum = 0
  for (const row of chess.board()) for (const sq of row) if (sq && sq.type !== 'p') sum += VALUE[sq.type]
  return sum
}

/** After `mv` is played on `pos`, can the opponent capture back on the landing square? */
export function canRecapture(pos: Chess, mv: Move): boolean {
  const c = new Chess(pos.fen())
  c.move(mv)
  return c.moves({ verbose: true }).some((x) => x.to === mv.to && !!x.captured)
}

/** A capture that wins material or takes something undefended. */
export function isGoodCapture(pos: Chess, mv: Move): boolean {
  if (!mv.captured) return false
  if (VALUE[mv.captured] > VALUE[mv.piece]) return true
  return !canRecapture(pos, mv)
}

function sq(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null
  return (FILES[file] + rank) as Square
}

function fileOf(s: Square): number {
  return FILES.indexOf(s[0])
}

function rankOf(s: Square): number {
  return Number(s[1])
}

function relRank(s: Square, color: Color): number {
  const r = rankOf(s)
  return color === 'w' ? r : 9 - r
}

function pawnsOnFile(chess: Chess, file: number, color?: Color): Square[] {
  const out: Square[] = []
  for (let r = 1; r <= 8; r++) {
    const s = sq(file, r)
    if (!s) continue
    const p = chess.get(s)
    if (p && p.type === 'p' && (!color || p.color === color)) out.push(s)
  }
  return out
}

function isPassedPawn(chess: Chess, s: Square, color: Color): boolean {
  const f = fileOf(s)
  const r = rankOf(s)
  const dir = color === 'w' ? 1 : -1
  for (const df of [-1, 0, 1]) {
    for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) {
      const t = sq(f + df, rr)
      if (!t) break
      const p = chess.get(t)
      if (p && p.type === 'p' && p.color !== color) return false
    }
  }
  return true
}

function pawnAttacks(s: Square, color: Color): Square[] {
  const f = fileOf(s)
  const r = rankOf(s) + (color === 'w' ? 1 : -1)
  return [sq(f - 1, r), sq(f + 1, r)].filter((x): x is Square => !!x)
}

function isHomeSquare(m: Move, color: Color): boolean {
  const back = color === 'w' ? 1 : 8
  if (rankOf(m.from) !== back) return false
  const f = m.from[0]
  if (m.piece === 'n') return f === 'b' || f === 'g'
  if (m.piece === 'b') return f === 'c' || f === 'f'
  return false
}

/** Pieces of `victim` color attacked by the piece now standing on `from`. */
function attackedBy(chess: Chess, from: Square, victim: Color): { square: Square; type: PieceSymbol; defended: boolean }[] {
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

function positionalIdea(before: Chess, after: Chess, m: Move, us: Color): string | null {
  const them = other(us)
  if (m.flags.includes('k') || m.flags.includes('q')) return 'Castles: the king is tucked away and the rooks are connected.'
  if (m.promotion) return `Promotes to a ${NAME[m.promotion]}.`

  // Forks and attacks created by the moved piece
  const hits = attackedBy(after, m.to, them).filter((h) => VALUE[h.type] > VALUE[m.piece] || !h.defended)
  if (after.inCheck() && hits.length >= 1) {
    return `Forks the king and the ${NAME[hits[0].type]}: after the king moves, the ${NAME[hits[0].type]} falls.`
  }
  if (hits.length >= 2) {
    return `Forks the ${NAME[hits[0].type]} and the ${NAME[hits[1].type]}; the opponent can only save one.`
  }
  if (hits.length === 1) {
    const h = hits[0]
    return h.defended
      ? `Attacks the ${NAME[h.type]} with a lesser piece, forcing it to move.`
      : `Attacks the undefended ${NAME[h.type]} on ${h.square}.`
  }

  const moveNo = before.moveNumber()
  if (m.piece === 'p') {
    const f = m.to[0]
    const rr = relRank(m.to, us)
    for (const a of pawnAttacks(m.to, us)) {
      const p = after.get(a)
      if (p && p.color === them) {
        return p.type === 'p'
          ? 'Challenges the pawn structure; lines will open.'
          : `Kicks the ${NAME[p.type]} with gain of time.`
      }
    }
    if (isPassedPawn(after, m.to, us) && rr >= 5) return 'Pushes the passed pawn; every step closer to promotion ties the opponent down.'
    if ((f === 'd' || f === 'e') && (rr === 4 || rr === 5)) return 'Stakes a claim in the center.'
    if (moveNo <= 10) return 'Opens lines for the pieces and gains space.'
    return 'Gains space and restricts the enemy pieces.'
  }
  if ((m.piece === 'n' || m.piece === 'b') && moveNo <= 12 && isHomeSquare(m, us)) {
    return m.piece === 'n' ? 'Develops the knight toward the center.' : 'Develops the bishop to an active diagonal.'
  }
  if (m.piece === 'r') {
    const f = fileOf(m.to)
    const own = pawnsOnFile(after, f, us).length
    const theirs = pawnsOnFile(after, f, them).length
    if (relRank(m.to, us) === 7) return 'Rook to the seventh rank, where it attacks pawns and hems in the king.'
    if (own === 0 && theirs === 0) return `Takes the open ${m.to[0]}-file with the rook.`
    if (own === 0) return `Puts the rook on the half-open ${m.to[0]}-file, pressuring the pawn there.`
    return 'Improves the rook; rooks belong behind passed pawns and on open files.'
  }
  if (m.piece === 'n') {
    const rr = relRank(m.to, us)
    const pawnGuard = after.attackers(m.to, us).some((s) => after.get(s)?.type === 'p')
    const chaseable = [-1, 1].some((df) => {
      const f = fileOf(m.to) + df
      return pawnsOnFile(after, f, them).some((s) => relRank(s, us) > rr)
    })
    if (rr >= 5 && pawnGuard && !chaseable) return 'Plants the knight on an outpost that no pawn can ever chase away.'
    if (rr >= 4) return 'Centralizes the knight, where it controls the most squares.'
    return 'Reroutes the knight to a better square.'
  }
  if (m.piece === 'k') {
    if (nonPawnMaterial(after) <= 14 && !after.board().flat().some((c) => c && c.type === 'q')) {
      return 'Activates the king; in the endgame it is a fighting piece.'
    }
    return 'Steps the king to a safer square.'
  }
  if (m.piece === 'q') return 'Brings the queen to a more active post while staying out of reach.'
  if (m.piece === 'b') return 'Puts the bishop on a longer diagonal.'
  return null
}

function evalContext(cp: number, gap: number, secondSan: string | null, mate: number | null): string {
  if (mate !== null && mate > 0) return ''
  if (secondSan && gap >= 150) return `Nothing else comes close: ${secondSan} would be about ${(gap / 100).toFixed(1)} pawns worse.`
  if (cp >= 300) return 'You are winning; keep it simple and trade down.'
  if (cp >= 100) return 'Keeps a clear advantage.'
  if (cp >= 30) return 'Keeps a small edge.'
  if (cp > -30) return 'The position stays balanced.'
  if (cp > -100) return 'Keeps the position close to equal.'
  if (cp > -300) return 'Limits the damage; the position is worse but holdable.'
  return 'The best practical try in a difficult position.'
}

export interface ExplainContext {
  /** evaluation after the move from the mover's perspective, centipawns */
  cp: number
  mate: number | null
  /** centipawn gap to the second-best move, if known */
  gap?: number
  secondSan?: string | null
}

/**
 * Explain why `m` is a good move in `chess` (side to move plays it).
 * Runs two short null-move searches for threat detection; the engine should be at full strength.
 */
export async function explainMove(
  chess: Chess,
  m: Move,
  engine: Engine,
  ctx: ExplainContext,
  knownThreat?: Move | null,
): Promise<string> {
  const fen = chess.fen()
  const us = chess.turn()
  const after = new Chess(fen)
  after.move(m)
  const ideas: string[] = []
  const forcedMate = ctx.mate !== null && ctx.mate > 0

  if (forcedMate) ideas.push(ctx.mate === 1 ? 'Checkmate.' : `Forces checkmate in ${ctx.mate}.`)

  // What was the opponent threatening if we simply passed?
  const oppThreat: Move | null = knownThreat !== undefined ? knownThreat : await opponentThreat(chess, engine)

  if (oppThreat) {
    if (m.from === oppThreat.to) {
      ideas.push(`Moves the ${NAME[m.piece]} out of danger: it was about to be taken by ${oppThreat.san}.`)
    } else if (m.to === oppThreat.from) {
      // Capturing the attacker: the capture sentence below says it better.
    } else {
      const still = findMove(after, oppThreat.from + oppThreat.to + (oppThreat.promotion ?? ''))
      if (!still || !isGoodCapture(after, still)) ideas.push(`Defends against the threat of ${oppThreat.san}.`)
    }
  }

  if (m.captured) {
    const capV = VALUE[m.captured]
    const pieceV = VALUE[m.piece]
    const last = chess.history({ verbose: true }).slice(-1)[0]
    const recap = canRecapture(chess, m)
    if (last && last.captured && last.to === m.to) {
      ideas.push(`Recaptures on ${m.to}, restoring the material balance.`)
    } else if (!recap) {
      ideas.push(`Wins a free ${NAME[m.captured]}: nothing can take back on ${m.to}.`)
    } else if (capV > pieceV) {
      ideas.push(`Wins material: a ${NAME[m.piece]} for a ${NAME[m.captured]}.`)
    } else if (capV === pieceV) {
      const lead = material(chess, us) - material(chess, other(us))
      ideas.push(
        lead >= 2
          ? `Trades ${NAME[m.piece]}s. When ahead in material, every trade brings the win closer.`
          : `Trades ${NAME[m.piece]}s to relieve the pressure and simplify.`,
      )
    } else {
      ideas.push(`Sacrifices the ${NAME[m.piece]} for a ${NAME[m.captured]}; the follow-up is what makes it work.`)
    }
  }

  // What do we threaten next if the opponent does nothing?
  if (after.inCheck()) {
    if (ideas.length === 0) ideas.push('Gives check, so the reply is forced.')
  } else if (!after.isGameOver()) {
    try {
      const passed = new Chess(nullMoveFen(after.fen()))
      const r = await engine.search(passed.fen(), { movetime: 350, multipv: 1 })
      const t = r.lines[0] ? findMove(passed, r.lines[0].move) : undefined
      if (t) {
        if (r.lines[0].mate !== null && r.lines[0].mate > 0 && r.lines[0].mate <= 3) {
          ideas.push(`Threatens mate, starting with ${t.san}.`)
        } else if (t.captured && isGoodCapture(passed, t)) {
          ideas.push(`Threatens ${t.san}, winning the ${NAME[t.captured]}.`)
        }
      }
    } catch {
      /* threat detection is best-effort */
    }
  }

  if (ideas.length < 2 && !forcedMate) {
    const p = positionalIdea(chess, after, m, us)
    if (p) ideas.push(p)
  }

  const c = evalContext(ctx.cp, ctx.gap ?? 0, ctx.secondSan ?? null, ctx.mate)
  if (c) ideas.push(c)

  return ideas.slice(0, 3).join(' ')
}

/** A proper hint: deeper search, assessment, the opponent's threat, best line with its idea, and alternatives. */
export async function computeHint(chess: Chess, engine: Engine): Promise<Hint | null> {
  const fen = chess.fen()
  const res = await engine.search(fen, { movetime: 1600, multipv: 3 })
  const best = res.lines[0]
  if (!best) return null
  const m = findMove(chess, best.move) ?? findMove(chess, res.bestMove)
  if (!m) return null
  const second = res.lines[1]
  const secondMove = second ? findMove(chess, second.move) : undefined
  const threat = await opponentThreat(chess, engine)
  const idea = await explainMove(
    chess,
    m,
    engine,
    { cp: best.cp, mate: best.mate, gap: second ? best.cp - second.cp : 0, secondSan: secondMove?.san ?? null },
    threat,
  )
  const lines: HintLine[] = res.lines
    .map((l) => {
      const mv = findMove(chess, l.move)
      return mv ? { uci: l.move, san: mv.san, cp: l.cp, mate: l.mate, line: pvToSan(fen, l.pv, 8) } : null
    })
    .filter((x): x is HintLine => !!x)
  let threatText: string | null = null
  if (threat) {
    threatText = threat.captured
      ? `${threat.san}, winning the ${NAME[threat.captured]}`
      : `${threat.san}, with mating ideas`
  }
  return {
    uci: m.from + m.to + (m.promotion ?? ''),
    san: m.san,
    from: m.from,
    to: m.to,
    idea,
    evalCp: best.cp,
    assessment: assessPosition(best.cp, best.mate),
    threat: threatText,
    lines,
  }
}

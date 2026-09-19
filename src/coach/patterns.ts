// Strategic pattern coaching. Walks each game, detects recurring strategic situations
// (locked centers, opposite-side castling, open files, passed pawns, endgame king play, ...),
// measures what the player actually did in them, and turns the aggregate into specific advice.
// Rule-based; uses engine evals when a game has been analyzed, structure alone when it has not.

import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import type { GameRecord } from '../lib/db'

export type PatternKey =
  | 'closed-center'
  | 'opposite-castling'
  | 'open-file'
  | 'development'
  | 'endgame-king'
  | 'convert'
  | 'passed-pawn'
  | 'king-shelter'

export type Verdict = 'weak' | 'ok' | 'strong' | 'watching'

/** One occurrence of a pattern in one game, with what the player did about it. */
export interface Observation {
  key: PatternKey
  gameId: number | undefined
  playedAt: number
  /** ply where the situation began (for jumping into the review) */
  ply: number
  /** true = handled well, false = handled badly, null = neutral */
  good: boolean | null
  /** a sentence about this game, in the coach's voice */
  note: string
  stats: Record<string, number>
}

export interface PatternReport {
  key: PatternKey
  title: string
  verdict: Verdict
  games: number
  /** what the numbers say, with the numbers */
  evidence: string
  /** what to do about it */
  lesson: string
  /** where to practice it */
  action?: { label: string; path: string; setup?: { key: string; value: unknown }[] }
  examples: { gameId: number; ply: number; playedAt: number; good: boolean | null }[]
}

const FILES = 'abcdefgh'
const NONPAWN: Record<PieceSymbol, number> = { p: 0, n: 3, b: 3, r: 5, q: 9, k: 0 }
const CENTER: Square[] = ['d4', 'e4', 'd5', 'e5']
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const pct = (k: number, n: number) => Math.round((k / Math.max(1, n)) * 100)
const cp = (x: number) => `${x >= 0 ? '+' : '−'}${(Math.abs(x) / 100).toFixed(1)}`
const moveNo = (ply: number) => Math.ceil(ply / 2)
const plural = (k: number, one: string, many = one + 's') => `${k} ${k === 1 ? one : many}`
const num = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1))

interface Snapshot {
  pawns: Record<Color, Square[]>
  kings: Record<Color, Square | null>
  material: Record<Color, number>
  queens: number
  openFiles: Set<string>
  lockedPairs: number
  endgame: boolean
}

function snapshot(chess: Chess): Snapshot {
  const pawns: Record<Color, Square[]> = { w: [], b: [] }
  const kings: Record<Color, Square | null> = { w: null, b: null }
  const material: Record<Color, number> = { w: 0, b: 0 }
  let queens = 0
  const filesWithPawns = new Set<string>()
  const white = new Set<string>()
  const black = new Set<string>()
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue
      if (cell.type === 'p') {
        pawns[cell.color].push(cell.square)
        filesWithPawns.add(cell.square[0])
        ;(cell.color === 'w' ? white : black).add(cell.square)
      } else if (cell.type === 'k') kings[cell.color] = cell.square
      else {
        material[cell.color] += NONPAWN[cell.type]
        if (cell.type === 'q') queens++
      }
    }
  }
  const openFiles = new Set<string>()
  for (const f of FILES) if (!filesWithPawns.has(f)) openFiles.add(f)
  let lockedPairs = 0
  for (const sq of white) {
    const f = sq[0]
    const r = Number(sq[1])
    if ('bcdefg'.includes(f) && black.has(`${f}${r + 1}`)) lockedPairs++
  }
  const total = material.w + material.b
  const endgame = (queens === 0 && total <= 26) || total <= 18
  return { pawns, kings, material, queens, openFiles, lockedPairs, endgame }
}

function wing(sq: Square | null): 'k' | 'q' | null {
  if (!sq) return null
  const f = FILES.indexOf(sq[0])
  if (f >= 5) return 'k'
  if (f <= 2) return 'q'
  return null
}

function centerDist(sq: Square): number {
  let best = 9
  for (const c of CENTER) best = Math.min(best, Math.max(Math.abs(FILES.indexOf(sq[0]) - FILES.indexOf(c[0])), Math.abs(Number(sq[1]) - Number(c[1]))))
  return best
}

function isPassed(sq: Square, color: Color, enemyPawns: Square[]): boolean {
  const f = FILES.indexOf(sq[0])
  const r = Number(sq[1])
  for (const e of enemyPawns) {
    const ef = FILES.indexOf(e[0])
    const er = Number(e[1])
    if (Math.abs(ef - f) <= 1 && (color === 'w' ? er > r : er < r)) return false
  }
  return true
}

/** a pawn move that captures a pawn or lands where it attacks an enemy pawn: a lever */
function isPawnBreak(after: Chess, m: Move): boolean {
  if (m.piece !== 'p') return false
  if (m.captured === 'p') return true
  const f = FILES.indexOf(m.to[0])
  const r = Number(m.to[1])
  const dir = m.color === 'w' ? 1 : -1
  for (const df of [-1, 1]) {
    const tf = f + df
    if (tf < 0 || tf > 7) continue
    const sq = `${FILES[tf]}${r + dir}` as Square
    const p = after.get(sq)
    if (p && p.type === 'p' && p.color !== m.color) return true
  }
  return false
}

interface Walk {
  snaps: Snapshot[] // per ply, snaps[i] = position after i plies
  moves: Move[] // moves[i] = move at ply i+1
  breaks: boolean[] // breaks[i] for moves[i]
}

function walk(sans: string[]): Walk {
  const c = new Chess()
  const snaps: Snapshot[] = [snapshot(c)]
  const moves: Move[] = []
  const breaks: boolean[] = []
  for (const san of sans) {
    let m: Move
    try {
      m = c.move(san)
    } catch {
      break
    }
    moves.push(m)
    breaks.push(isPawnBreak(c, m))
    snaps.push(snapshot(c))
  }
  return { snaps, moves, breaks }
}

/** player-perspective evals per ply (clamped), or null when the game is not analyzed */
function evalsFor(g: GameRecord): number[] | null {
  const e = g.analysis?.evals
  if (!e || e.length < 2) return null
  const sign = g.playerColor === 'w' ? 1 : -1
  return e.map((x) => Math.max(-1000, Math.min(1000, x * sign)))
}

const drift = (ev: number[] | null, from: number, to: number) => (ev && ev[from] !== undefined && ev[Math.min(to, ev.length - 1)] !== undefined ? ev[Math.min(to, ev.length - 1)] - ev[from] : null)

// ---------------------------------------------------------------- detectors

export function observeGame(g: GameRecord): Observation[] {
  const me = g.playerColor
  const them: Color = me === 'w' ? 'b' : 'w'
  const w = walk(g.moves)
  const ev = evalsFor(g)
  const out: Observation[] = []
  const N = w.moves.length
  const won = g.result !== '1/2-1/2' && (g.result === '1-0') === (me === 'w')
  const base = (key: PatternKey, ply: number, good: boolean | null, note: string, stats: Record<string, number>): Observation => ({
    key,
    gameId: g.id,
    playedAt: g.playedAt,
    ply,
    good,
    note,
    stats,
  })
  const mine = (i: number) => w.moves[i].color === me // move index i (ply i+1)

  // --- closed center: >= 2 locked pawn pairs and at most one open file, holding for 6 plies
  for (let i = 12; i < N - 6; i++) {
    const s = w.snaps[i]
    if (s.lockedPairs < 2 || s.openFiles.size > 1 || s.endgame) continue
    let holds = true
    for (let k = 1; k <= 6; k++) if (w.snaps[i + k].lockedPairs < 2) holds = false
    if (!holds) continue
    const end = Math.min(N, i + 40)
    let myBreak = -1
    let theirBreak = -1
    let quietBefore = 0
    for (let j = i; j < end; j++) {
      if (mine(j)) {
        if (w.breaks[j]) {
          myBreak = j + 1
          break
        }
        if (w.moves[j].piece !== 'p' && !w.moves[j].captured) quietBefore++
      } else if (w.breaks[j] && theirBreak < 0) theirBreak = j + 1
    }
    const d = drift(ev, i, myBreak > 0 ? myBreak : end)
    const good = myBreak > 0 && quietBefore <= 8 && (theirBreak < 0 || myBreak <= theirBreak) ? true : myBreak < 0 || quietBefore > 10 ? false : null
    const note =
      myBreak > 0
        ? `The center locked around move ${moveNo(i)} and you found the pawn break on move ${moveNo(myBreak)} after ${plural(quietBefore, 'piece move')}${d !== null ? ` (eval ${cp(d)} meanwhile)` : ''}.`
        : `The center locked around move ${moveNo(i)} and you never played a pawn break${theirBreak > 0 ? `; your opponent did on move ${moveNo(theirBreak)}` : ''}${d !== null ? `, and the eval drifted ${cp(d)} while you waited` : ''}.`
    out.push(base('closed-center', i, good, note, { broke: myBreak > 0 ? 1 : 0, quietBefore, drift: d ?? 0, hasEval: d === null ? 0 : 1, oppFirst: theirBreak > 0 && (myBreak < 0 || theirBreak < myBreak) ? 1 : 0 }))
    break
  }

  // --- opposite-side castling: pawn storm race over the next 10 moves each
  for (let i = 10; i < N - 8; i++) {
    const s = w.snaps[i]
    const mw = wing(s.kings[me])
    const tw = wing(s.kings[them])
    if (!mw || !tw || mw === tw) continue
    // require both to have castled (king moved via castling) by now
    const castled = (c: Color) => w.moves.slice(0, i).some((m) => m.color === c && (m.flags.includes('k') || m.flags.includes('q')))
    if (!castled(me) || !castled(them)) continue
    const end = Math.min(N, i + 20)
    const towards = (m: Move, targetWing: 'k' | 'q') => m.piece === 'p' && (targetWing === 'k' ? 'fgh'.includes(m.to[0]) : 'abc'.includes(m.to[0]))
    let myStorm = 0
    let theirStorm = 0
    for (let j = i; j < end; j++) {
      if (mine(j)) {
        if (towards(w.moves[j], tw)) myStorm++
      } else if (towards(w.moves[j], mw)) theirStorm++
    }
    const d = drift(ev, i, end)
    const good = myStorm >= 3 && myStorm >= theirStorm ? true : myStorm <= 1 && theirStorm >= 2 ? false : null
    const note = `Kings castled on opposite wings by move ${moveNo(i)}. In the next ten moves you threw ${plural(myStorm, 'pawn')} at the enemy king and your opponent threw ${theirStorm} at yours${d !== null ? ` (eval ${cp(d)} over that stretch)` : ''}.`
    out.push(base('opposite-castling', i, good, note, { myStorm, theirStorm, drift: d ?? 0, hasEval: d === null ? 0 : 1 }))
    break
  }

  // --- open files: when a file opens in the middlegame, who takes it first?
  {
    let seen = 0
    let seized = 0
    let firstPly = -1
    const done = new Set<string>()
    for (let i = 16; i < N - 4; i++) {
      const s = w.snaps[i]
      if (s.endgame) break
      for (const f of s.openFiles) {
        if (done.has(f) || w.snaps[i - 1].openFiles.has(f)) continue
        done.add(f)
        // does the player still own a rook?
        const c = new Chess()
        for (let k = 0; k < i; k++) c.move(w.moves[k].san)
        const myRooks = c.board().flat().filter((p) => p && p.color === me && p.type === 'r').length
        if (!myRooks) continue
        seen++
        if (firstPly < 0) firstPly = i
        for (let j = i; j < Math.min(N, i + 8); j++) {
          const m = w.moves[j]
          if ((m.piece === 'r' || m.piece === 'q') && m.to[0] === f) {
            if (m.color === me) seized++
            break
          }
        }
      }
    }
    if (seen > 0) {
      const good = seized === seen ? true : seized === 0 ? false : null
      out.push(base('open-file', firstPly, good, `${plural(seen, 'file')} opened in the middlegame and you were first onto ${seized} of them with a rook.`, { seen, seized }))
    }
  }

  // --- development by move 12
  if (N >= 24) {
    const c = new Chess()
    for (let k = 0; k < 24; k++) c.move(w.moves[k].san)
    const home = me === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8']
    let undeveloped = 0
    for (const sq of home) {
      const p = c.get(sq as Square)
      if (p && p.color === me && (p.type === 'n' || p.type === 'b')) undeveloped++
    }
    const castlePly = w.moves.findIndex((m) => m.color === me && (m.flags.includes('k') || m.flags.includes('q'))) + 1
    const castledBy12 = castlePly > 0 && castlePly <= 24
    const pawnMoves = w.moves.slice(0, 24).filter((m, k) => mine(k) && m.piece === 'p').length
    const good = undeveloped === 0 && castledBy12 ? true : undeveloped >= 2 || (!castledBy12 && pawnMoves >= 6) ? false : null
    const note =
      undeveloped === 0 && castledBy12
        ? `By move 12 every minor piece was out and your king was castled.`
        : `By move 12 you still had ${plural(undeveloped, 'minor piece')} at home${castledBy12 ? '' : castlePly > 0 ? ` and castled only on move ${moveNo(castlePly)}` : ' and had not castled'}, after ${plural(pawnMoves, 'pawn move')}.`
    out.push(base('development', 24, good, note, { undeveloped, castleMove: castlePly > 0 ? moveNo(castlePly) : 99, pawnMoves }))
  }

  // --- endgame king activity
  {
    const start = w.snaps.findIndex((s, i) => i > 20 && s.endgame)
    if (start > 0 && N - start >= 12) {
      const end = Math.min(N, start + 20)
      let kingMoves = 0
      const myD: number[] = []
      const theirD: number[] = []
      for (let j = start; j < end; j++) {
        if (mine(j) && w.moves[j].piece === 'k') kingMoves++
        const s = w.snaps[j + 1]
        if (s.kings[me]) myD.push(centerDist(s.kings[me]!))
        if (s.kings[them]) theirD.push(centerDist(s.kings[them]!))
      }
      const md = mean(myD)
      const td = mean(theirD)
      const good = kingMoves >= 3 || md <= 1.5 ? true : kingMoves <= 1 && md >= 3 ? false : null
      const note = `The endgame began around move ${moveNo(start)}. In the next ten moves your king moved ${plural(kingMoves, 'time')} and sat ${num(md)} squares from the center (opponent's king: ${num(td)}).`
      out.push(base('endgame-king', start, good, note, { kingMoves, myDist: md, theirDist: td }))
    }
  }

  // --- converting a winning position (needs evals)
  if (ev) {
    let run = 0
    let reached = -1
    for (let i = 10; i < ev.length; i++) {
      run = ev[i] >= 200 ? run + 1 : 0
      if (run >= 4) {
        reached = i - 3
        break
      }
    }
    if (reached > 0) {
      const later = ev.slice(reached)
      const worst = Math.min(...later)
      const slipped = worst < 50
      const good = won && !slipped ? true : !won || slipped ? false : null
      const note = won
        ? slipped
          ? `You were winning (${cp(ev[reached])}) by move ${moveNo(reached)}, let it fall to ${cp(worst)}, and still won.`
          : `You were winning by move ${moveNo(reached)} and converted without letting it slip.`
        : `You were winning (${cp(ev[reached])}) by move ${moveNo(reached)} and did not convert; the eval fell to ${cp(worst)}.`
      out.push(base('convert', reached, good, note, { won: won ? 1 : 0, slipped: slipped ? 1 : 0 }))
    }
  }

  // --- passed pawns: do you push them?
  {
    let found = -1
    let file = ''
    for (let i = 20; i < N - 8; i++) {
      const s = w.snaps[i]
      const mineP = s.pawns[me].filter((sq) => isPassed(sq, me, s.pawns[them]) && (me === 'w' ? Number(sq[1]) >= 4 : Number(sq[1]) <= 5))
      if (mineP.length) {
        found = i
        file = mineP[0][0]
        break
      }
    }
    if (found > 0) {
      const end = Math.min(N, found + 16)
      let pushes = 0
      let promoted = 0
      for (let j = found; j < end; j++) {
        const m = w.moves[j]
        if (mine(j) && m.piece === 'p' && m.from[0] === file) {
          pushes++
          file = m.to[0]
          if (m.promotion) promoted = 1
        }
      }
      const good = pushes >= 2 || promoted ? true : pushes === 0 ? false : null
      const note =
        pushes === 0
          ? `You had a passed ${file}-pawn from move ${moveNo(found)} and did not push it once in the next eight moves.`
          : `You had a passed pawn from move ${moveNo(found)} and pushed it ${plural(pushes, 'time')} in the next eight moves${promoted ? ', all the way to promotion' : ''}.`
      out.push(base('passed-pawn', found, good, note, { pushes, promoted }))
    }
  }

  // --- king shelter: pawn moves in front of your own castled king
  {
    const castlePly = w.moves.findIndex((m) => m.color === me && (m.flags.includes('k') || m.flags.includes('q'))) + 1
    if (castlePly > 0) {
      const side = w.moves[castlePly - 1].flags.includes('k') ? 'k' : 'q'
      const shelterFiles = side === 'k' ? 'fgh' : 'abc'
      const homeRank = me === 'w' ? '2' : '7'
      const drifts: number[] = []
      let loosened = 0
      let firstPly = -1
      for (let j = castlePly; j < Math.min(N, 60); j++) {
        const m = w.moves[j]
        if (!mine(j) || m.piece !== 'p' || m.captured || !shelterFiles.includes(m.from[0]) || m.from[1] !== homeRank) continue
        if (w.snaps[j].endgame) break
        // forced by check? then it does not count
        const c = new Chess()
        for (let k = 0; k < j; k++) c.move(w.moves[k].san)
        if (c.inCheck()) continue
        loosened++
        if (firstPly < 0) firstPly = j + 1
        const d = drift(ev, j, j + 6)
        if (d !== null) drifts.push(d)
      }
      if (loosened > 0) {
        const md = drifts.length ? mean(drifts) : null
        const good = loosened >= 2 && (md === null || md < -40) ? false : loosened === 1 && (md === null || md > -20) ? null : md !== null && md >= 0 ? true : null
        const note = `You moved ${plural(loosened, 'pawn')} in front of your castled king before move 30${md !== null ? `; on average the eval went ${cp(md)} in the three moves after each one` : ''}.`
        out.push(base('king-shelter', firstPly, good, note, { loosened, drift: md ?? 0, hasEval: md === null ? 0 : 1 }))
      }
    }
  }

  return out
}

// ---------------------------------------------------------------- aggregation

interface Rule {
  key: PatternKey
  title: string
  minGames: number
  judge: (obs: Observation[]) => { verdict: Verdict; evidence: string }
  lesson: string
  action?: PatternReport['action']
}

const RULES: Rule[] = [
  {
    key: 'closed-center',
    title: 'Breaking through closed positions',
    minGames: 2,
    judge: (obs) => {
      const broke = obs.filter((o) => o.stats.broke).length
      const quiet = mean(obs.map((o) => o.stats.quietBefore))
      const withEval = obs.filter((o) => o.stats.hasEval)
      const d = withEval.length ? mean(withEval.map((o) => o.stats.drift)) : null
      const oppFirst = obs.filter((o) => o.stats.oppFirst).length
      const verdict: Verdict = broke / obs.length < 0.5 || quiet > 10 || (d !== null && d < -60) ? 'weak' : broke === obs.length && quiet <= 6 ? 'strong' : 'ok'
      return {
        verdict,
        evidence: `The center locked up in ${plural(obs.length, 'game')}. You found a pawn break in ${broke} of them, after an average of ${Math.round(quiet)} piece moves${oppFirst ? `; your opponent broke first in ${oppFirst}` : ''}${d !== null ? `. While you waited the eval drifted ${cp(d)} on average` : ''}.`,
      }
    },
    lesson: 'A closed position is won by the side that prepares a pawn break. Pick the lever early (c5 or f5 for Black in a King’s Indian, f4 or c4 for White), line the pieces up behind it, then push. Every quiet move that does not help the break is a tempo given away.',
    action: { label: 'Play Dmitri and break through', path: '/play', setup: [{ key: 'opponentMode', value: 'personality' }, { key: 'lastPersonality', value: 'dmitri' }] },
  },
  {
    key: 'opposite-castling',
    title: 'Pawn storms with opposite-side castling',
    minGames: 2,
    judge: (obs) => {
      const my = mean(obs.map((o) => o.stats.myStorm))
      const their = mean(obs.map((o) => o.stats.theirStorm))
      const withEval = obs.filter((o) => o.stats.hasEval)
      const d = withEval.length ? mean(withEval.map((o) => o.stats.drift)) : null
      const verdict: Verdict = my < 2 && my < their ? 'weak' : my >= 3 && my >= their ? 'strong' : 'ok'
      return {
        verdict,
        evidence: `Kings went to opposite wings in ${plural(obs.length, 'game')}. In the ten moves after, you pushed ${num(my)} pawns at the enemy king on average; your opponents pushed ${num(their)} at yours${d !== null ? `. The eval moved ${cp(d)} over those stretches` : ''}.`,
      }
    },
    lesson: 'Opposite-side castling is a race, and the pawns are the runners. Push the pawns in front of the enemy king (h4-h5 and g4-g5, or a4-a5 and b4-b5), open a file, and only stop to defend when a threat is real. Slow piece maneuvers lose these races.',
    action: { label: 'Practice sacrificial attacks', path: '/puzzles', setup: [{ key: 'puzzleTheme', value: 'sacrifice' }] },
  },
  {
    key: 'open-file',
    title: 'Seizing open files',
    minGames: 2,
    judge: (obs) => {
      const seen = obs.reduce((a, o) => a + o.stats.seen, 0)
      const seized = obs.reduce((a, o) => a + o.stats.seized, 0)
      const rate = seized / Math.max(1, seen)
      const verdict: Verdict = rate < 0.4 ? 'weak' : rate >= 0.7 ? 'strong' : 'ok'
      return { verdict, evidence: `${plural(seen, 'file')} opened in your middlegames across ${plural(obs.length, 'game')}. You got a rook there first ${pct(seized, seen)}% of the time.` }
    },
    lesson: 'When a file opens, the first rook on it usually owns it. Make "which file is about to open?" part of your thinking, double rooks on it, and aim for the seventh rank.',
    action: { label: 'Find the quiet move', path: '/puzzles', setup: [{ key: 'puzzleTheme', value: 'quiet' }] },
  },
  {
    key: 'development',
    title: 'Finishing development',
    minGames: 3,
    judge: (obs) => {
      const und = mean(obs.map((o) => o.stats.undeveloped))
      const allOut = obs.filter((o) => o.stats.undeveloped === 0).length
      const late = obs.filter((o) => o.stats.castleMove > 12).length
      const verdict: Verdict = und >= 1.5 || late / obs.length > 0.5 ? 'weak' : und <= 0.5 && late === 0 ? 'strong' : 'ok'
      return { verdict, evidence: `You had every minor piece out by move 12 in ${allOut} of ${plural(obs.length, 'game')} and your king castled by then in ${obs.length - late}.` }
    },
    lesson: 'Knights and bishops out, king castled, rooks connected, then start the plan. Pawn moves and early queen sorties before that hand your opponent the initiative for free.',
    action: { label: 'Drill an opening course', path: '/openings' },
  },
  {
    key: 'endgame-king',
    title: 'Activating the king in endgames',
    minGames: 2,
    judge: (obs) => {
      const km = mean(obs.map((o) => o.stats.kingMoves))
      const md = mean(obs.map((o) => o.stats.myDist))
      const td = mean(obs.map((o) => o.stats.theirDist))
      const verdict: Verdict = km < 1.5 && md >= 2.5 ? 'weak' : km >= 3 || md <= 1.5 ? 'strong' : 'ok'
      return { verdict, evidence: `In ${plural(obs.length, 'endgame')} your king moved ${num(km)} times in the first ten moves and averaged ${num(md)} squares from the center; your opponents' kings averaged ${num(td)}.` }
    },
    lesson: 'Once the queens are off, the king is a fighting piece. Walk it toward the center and toward the pawns before you do anything else; the side with the more active king wins most equal endgames.',
    action: { label: 'Endgame puzzles', path: '/puzzles', setup: [{ key: 'puzzleTheme', value: 'endgame' }] },
  },
  {
    key: 'convert',
    title: 'Converting won positions',
    minGames: 2,
    judge: (obs) => {
      const won = obs.filter((o) => o.stats.won).length
      const slipped = obs.filter((o) => o.stats.slipped).length
      const verdict: Verdict = won / obs.length < 0.6 || slipped / obs.length > 0.5 ? 'weak' : won === obs.length && slipped === 0 ? 'strong' : 'ok'
      return { verdict, evidence: `You reached a winning position (+2 or better) in ${plural(obs.length, 'analyzed game')} and won ${won}; in ${slipped} the advantage fell back to nothing at some point.` }
    },
    lesson: 'When you are winning, the job changes: trade pieces (not pawns), remove counterplay, and push the passed pawn. Do not look for the brilliant finish; look for the move your opponent least wants to see.',
    action: { label: 'Convert against Nadia', path: '/play', setup: [{ key: 'opponentMode', value: 'personality' }, { key: 'lastPersonality', value: 'nadia' }] },
  },
  {
    key: 'passed-pawn',
    title: 'Pushing passed pawns',
    minGames: 2,
    judge: (obs) => {
      const none = obs.filter((o) => o.stats.pushes === 0).length
      const avg = mean(obs.map((o) => o.stats.pushes))
      const verdict: Verdict = none / obs.length >= 0.5 ? 'weak' : avg >= 2 ? 'strong' : 'ok'
      return { verdict, evidence: `You had a passed pawn in ${plural(obs.length, 'game')} and pushed it ${num(avg)} times on average in the eight moves after it appeared; in ${none} you never pushed it.` }
    },
    lesson: 'Passed pawns must be pushed. Each step forward ties down a piece or wins a tempo; a passed pawn left on its square is just a target. Support it with the rook from behind.',
    action: { label: 'Promotion puzzles', path: '/puzzles', setup: [{ key: 'puzzleTheme', value: 'promotion' }] },
  },
  {
    key: 'king-shelter',
    title: 'Keeping the king’s shelter',
    minGames: 3,
    judge: (obs) => {
      const per = mean(obs.map((o) => o.stats.loosened))
      const withEval = obs.filter((o) => o.stats.hasEval)
      const d = withEval.length ? mean(withEval.map((o) => o.stats.drift)) : null
      const verdict: Verdict = per >= 2 && (d === null || d < -30) ? 'weak' : per <= 1 && (d === null || d >= -10) ? 'strong' : 'ok'
      return { verdict, evidence: `You move ${num(per)} pawns in front of your castled king per game before move 30${d !== null ? `, and the eval drops ${cp(d)} on average in the three moves after each push` : ''}.` }
    },
    lesson: 'Every pawn move in front of your king is permanent. Play them only when they win something concrete or stop a real threat; otherwise the holes become the squares your opponent’s pieces live on.',
    action: { label: 'Defensive puzzles', path: '/puzzles', setup: [{ key: 'puzzleTheme', value: 'defense' }] },
  },
]

export function buildPatternReports(games: GameRecord[]): PatternReport[] {
  const all: Observation[] = []
  for (const g of games) {
    try {
      all.push(...observeGame(g))
    } catch {
      // a malformed game record should never take the coach down
    }
  }
  const reports: PatternReport[] = []
  for (const rule of RULES) {
    const obs = all.filter((o) => o.key === rule.key)
    if (obs.length === 0) continue
    const examples = obs
      .filter((o) => o.gameId !== undefined)
      .sort((a, b) => (a.good === false ? -1 : 1) - (b.good === false ? -1 : 1) || b.playedAt - a.playedAt)
      .slice(0, 3)
      .map((o) => ({ gameId: o.gameId!, ply: o.ply, playedAt: o.playedAt, good: o.good }))
    if (obs.length < rule.minGames) {
      reports.push({
        key: rule.key,
        title: rule.title,
        verdict: 'watching',
        games: obs.length,
        evidence: `Seen in ${plural(obs.length, 'game')} so far: ${obs[0].note}`,
        lesson: rule.lesson,
        action: rule.action,
        examples,
      })
      continue
    }
    const { verdict, evidence } = rule.judge(obs)
    reports.push({ key: rule.key, title: rule.title, verdict, games: obs.length, evidence, lesson: rule.lesson, action: rule.action, examples })
  }
  const order: Record<Verdict, number> = { weak: 0, ok: 1, watching: 2, strong: 3 }
  return reports.sort((a, b) => order[a.verdict] - order[b.verdict] || b.games - a.games)
}

/** Pattern notes for one game, for the recap: weaknesses first. */
export function gamePatternNotes(g: GameRecord): { good: string[]; bad: string[]; goodKeys: PatternKey[]; badKeys: PatternKey[] } {
  const obs = observeGame(g)
  const good = obs.filter((o) => o.good === true)
  const bad = obs.filter((o) => o.good === false)
  return { good: good.map((o) => o.note), bad: bad.map((o) => o.note), goodKeys: good.map((o) => o.key), badKeys: bad.map((o) => o.key) }
}

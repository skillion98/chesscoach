// Drill results, in-game adherence, spaced repetition, and mastery grades.

import { Chess } from 'chess.js'
import { db, type Deviation, type LineStat } from '../lib/db'
import { COURSES, allChapters, statKey, type Course } from './model'

const INTERVALS_DAYS = [1, 2, 4, 8, 16, 32, 64]
const DAY = 86_400_000

export async function recordResult(
  slug: string,
  chapter: number,
  ply: number,
  correct: boolean,
  played?: string,
): Promise<void> {
  const key = statKey(slug, chapter, ply)
  const now = Date.now()
  const prev = await db.lineStats.get(key)
  const streak = correct ? (prev?.streak ?? 0) + 1 : 0
  const interval = INTERVALS_DAYS[Math.min(streak, INTERVALS_DAYS.length - 1)]
  const row: LineStat = {
    key,
    slug,
    chapter,
    ply,
    attempts: (prev?.attempts ?? 0) + 1,
    misses: (prev?.misses ?? 0) + (correct ? 0 : 1),
    streak,
    lastSeen: now,
    due: now + (correct ? interval : 1) * DAY,
    lastPlayed: correct ? prev?.lastPlayed : played,
  }
  await db.lineStats.put(row)
}

export interface ChapterMastery {
  /** 0..1, untried nodes count as 0 */
  score: number
  tried: number
  nodes: number
  attempts: number
  misses: number
  grade: string
  due: number
}

export function gradeFor(score: number, tried: number): string {
  if (tried === 0) return '–'
  if (score >= 0.9) return 'A'
  if (score >= 0.8) return 'B'
  if (score >= 0.7) return 'C'
  if (score >= 0.6) return 'D'
  return 'F'
}

export async function chapterMastery(course: Course, idx: number): Promise<ChapterMastery> {
  const ch = allChapters(course)[idx]
  const rows = await db.lineStats.where('slug').equals(course.slug).toArray()
  const mine = rows.filter((r) => r.chapter === idx)
  let sum = 0
  let tried = 0
  let attempts = 0
  let misses = 0
  let due = 0
  const now = Date.now()
  for (const p of ch.playerPlies) {
    const r = mine.find((x) => x.ply === p)
    if (r && r.attempts > 0) {
      tried++
      attempts += r.attempts
      misses += r.misses
      // recent performance matters more: blend accuracy with the streak
      const acc = (r.attempts - r.misses) / r.attempts
      const streakBonus = Math.min(1, r.streak / 3)
      sum += 0.6 * acc + 0.4 * streakBonus
      if (r.due <= now) due++
    }
  }
  const nodes = ch.playerPlies.length
  const score = nodes ? sum / nodes : 0
  return { score, tried, nodes, attempts, misses, grade: gradeFor(score, tried), due }
}

export interface CourseMastery {
  score: number
  grade: string
  chapters: ChapterMastery[]
  due: number
}

export async function courseMastery(course: Course): Promise<CourseMastery> {
  const chapters = await Promise.all(course.chapters.map((_, i) => chapterMastery(course, i)))
  const tried = chapters.reduce((a, c) => a + c.tried, 0)
  const score = chapters.length ? chapters.reduce((a, c) => a + c.score, 0) / chapters.length : 0
  return { score, grade: gradeFor(score, tried), chapters, due: chapters.reduce((a, c) => a + c.due, 0) }
}

export interface WeakLine {
  slug: string
  title: string
  chapter: number
  chapterName: string
  ply: number
  expected: string
  /** what was played instead, most recent */
  played?: string
  drillMisses: number
  drillAttempts: number
  gameDeviations: number
  /** 0..1, higher = weaker */
  weakness: number
  /** SAN moves leading up to the mistake */
  lead: string[]
}

export async function weakLines(limit = 20, slug?: string): Promise<WeakLine[]> {
  const stats = slug ? await db.lineStats.where('slug').equals(slug).toArray() : await db.lineStats.toArray()
  const devs = slug ? await db.deviations.where('slug').equals(slug).toArray() : await db.deviations.toArray()
  const map = new Map<string, WeakLine>()
  const ensure = (s: string, chapter: number, ply: number): WeakLine | null => {
    const key = statKey(s, chapter, ply)
    const hit = map.get(key)
    if (hit) return hit
    const course = COURSES.find((c) => c.slug === s)
    if (!course || !course.chapters[chapter]) return null
    const ch = allChapters(course)[chapter]
    if (ply > ch.sans.length) return null
    const wl: WeakLine = {
      slug: s,
      title: course.title,
      chapter,
      chapterName: ch.name,
      ply,
      expected: ch.sans[ply - 1],
      drillMisses: 0,
      drillAttempts: 0,
      gameDeviations: 0,
      weakness: 0,
      lead: ch.sans.slice(0, ply - 1),
    }
    map.set(key, wl)
    return wl
  }
  for (const r of stats) {
    const wl = ensure(r.slug, r.chapter, r.ply)
    if (!wl) continue
    wl.drillMisses = r.misses
    wl.drillAttempts = r.attempts
    if (r.lastPlayed) wl.played = r.lastPlayed
  }
  for (const d of devs) {
    const wl = ensure(d.slug, d.chapter, d.ply)
    if (!wl) continue
    wl.gameDeviations++
    wl.played = d.played
  }
  const out: WeakLine[] = []
  for (const wl of map.values()) {
    const total = wl.drillAttempts + wl.gameDeviations
    const bad = wl.drillMisses + wl.gameDeviations
    if (bad === 0) continue
    // miss rate, weighted by how often it comes up (games count double)
    const rate = bad / Math.max(1, total)
    wl.weakness = rate * Math.min(1, (wl.drillMisses + 2 * wl.gameDeviations) / 4 + 0.25)
    out.push(wl)
  }
  out.sort((a, b) => b.weakness - a.weakness || b.gameDeviations - a.gameDeviations)
  return out.slice(0, limit)
}

/**
 * After a game: find the course chapter the game followed longest (for the player's
 * side), credit matched player moves, and record the first deviation if any.
 */
export async function recordGameAdherence(
  gameId: number,
  playedAt: number,
  moves: string[],
  playerColor: 'w' | 'b',
): Promise<{ slug: string; chapter: number; matched: number } | null> {
  const c = new Chess()
  const gameUcis: string[] = []
  for (const san of moves) {
    const m = c.move(san)
    gameUcis.push(m.from + m.to + (m.promotion ?? ''))
  }
  let best: { course: Course; chapter: number; matched: number } | null = null
  for (const course of COURSES) {
    if (course.side !== playerColor) continue
    for (const ch of allChapters(course)) {
      let n = 0
      while (n < ch.ucis.length && n < gameUcis.length && ch.ucis[n] === gameUcis[n]) n++
      if (n >= 2 && (!best || n > best.matched)) best = { course, chapter: ch.idx, matched: n }
    }
  }
  if (!best) return null
  const ch = allChapters(best.course)[best.chapter]
  // credit every player move that followed the line
  for (const p of ch.playerPlies) {
    if (p <= best.matched) await recordResult(best.course.slug, best.chapter, p, true)
  }
  // the first divergence, if it was the player's move and the line continues
  const divPly = best.matched + 1
  if (divPly <= ch.sans.length && divPly <= moves.length) {
    const mover = divPly % 2 === 1 ? 'w' : 'b'
    if (mover === playerColor) {
      const dev: Deviation = {
        gameId,
        playedAt,
        slug: best.course.slug,
        chapter: best.chapter,
        ply: divPly,
        expected: ch.sans[divPly - 1],
        played: moves[divPly - 1],
      }
      await db.deviations.add(dev)
      await recordResult(best.course.slug, best.chapter, divPly, false, moves[divPly - 1])
    }
  }
  return { slug: best.course.slug, chapter: best.chapter, matched: best.matched }
}

type EcoRow = [string, string, string]

async function loadEco(): Promise<EcoRow[]> {
  const mod = (await import('../data/eco.json')) as unknown as { default: EcoRow[] }
  return mod.default
}

/** Longest ECO catalog prefix matching the game. */
export async function identifyOpening(moves: string[]): Promise<{ eco: string; name: string } | null> {
  const rows = await loadEco()
  const c = new Chess()
  const played: string[] = []
  for (const san of moves.slice(0, 30)) {
    const m = c.move(san)
    played.push(m.san)
  }
  const joined = played.join(' ')
  let best: [string, string, string] | null = null
  for (const row of rows) {
    const line = row[2]
    if (line.length > joined.length) continue
    if (joined === line || joined.startsWith(line + ' ')) {
      if (!best || line.length > best[2].length) best = row
    }
  }
  return best ? { eco: best[0], name: best[1] } : null
}

export async function ecoRange(from: string, to: string): Promise<EcoRow[]> {
  const rows = await loadEco()
  return rows.filter((r) => r[0] >= from && r[0] <= to)
}

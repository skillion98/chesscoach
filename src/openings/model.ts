import { Chess } from 'chess.js'
import { COURSES, courseBySlug, type Chapter, type Course, type Side } from '../data/courses'

export interface ParsedChapter {
  idx: number
  name: string
  intro: string
  sans: string[]
  ucis: string[]
  /** FEN before each ply (index 0 = start), plus the final position */
  fens: string[]
  notes: Map<number, string>
  /** 1-based plies the course side plays */
  playerPlies: number[]
}

const cache = new Map<string, ParsedChapter>()

export function parseChapter(course: Course, idx: number): ParsedChapter {
  const key = `${course.slug}|${idx}`
  const hit = cache.get(key)
  if (hit) return hit
  const ch: Chapter = course.chapters[idx]
  const c = new Chess()
  const sans: string[] = []
  const ucis: string[] = []
  const fens: string[] = [c.fen()]
  for (const tok of ch.line.split(/\s+/).filter(Boolean)) {
    const m = c.move(tok)
    sans.push(m.san)
    ucis.push(m.from + m.to + (m.promotion ?? ''))
    fens.push(c.fen())
  }
  const playerPlies: number[] = []
  for (let p = 1; p <= sans.length; p++) {
    const mover: Side = p % 2 === 1 ? 'w' : 'b'
    if (mover === course.side) playerPlies.push(p)
  }
  const parsed: ParsedChapter = {
    idx,
    name: ch.name,
    intro: ch.intro,
    sans,
    ucis,
    fens,
    notes: new Map(ch.notes),
    playerPlies,
  }
  cache.set(key, parsed)
  return parsed
}

export function allChapters(course: Course): ParsedChapter[] {
  return course.chapters.map((_, i) => parseChapter(course, i))
}

export function statKey(slug: string, chapter: number, ply: number): string {
  return `${slug}|${chapter}|${ply}`
}

export function thumbnail(video: string): string {
  return `https://i.ytimg.com/vi/${video}/mqdefault.jpg`
}

export function videoUrl(video: string): string {
  return `https://www.youtube.com/watch?v=${video}`
}

export function moveText(sans: string[], upTo: number): string {
  const parts: string[] = []
  for (let i = 0; i < upTo && i < sans.length; i++) {
    if (i % 2 === 0) parts.push(`${i / 2 + 1}.`)
    parts.push(sans[i])
  }
  return parts.join(' ')
}

export { COURSES, courseBySlug }
export type { Course, Chapter, Side }

// Puzzle loading, selection, and the separate puzzle rating.

import { db, getSetting, setSetting, type PuzzleResult } from '../lib/db'
import { updateRating } from '../game/rating'

export interface Puzzle {
  id: string
  /** position before the opponent's first move */
  fen: string
  /** UCI moves: opponent move first, then the solution alternating */
  moves: string[]
  rating: number
  themes: string[]
}

export const BANDS = [800, 1000, 1200, 1400, 1600, 1800, 2000]

export interface ThemeOption {
  key: string
  label: string
  /** Lichess theme tags, any of which qualifies */
  tags: string[]
}

export const THEMES: ThemeOption[] = [
  { key: 'mixed', label: 'Mixed', tags: [] },
  { key: 'mate', label: 'Checkmates', tags: ['mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate'] },
  { key: 'fork', label: 'Forks', tags: ['fork'] },
  { key: 'pin', label: 'Pins & skewers', tags: ['pin', 'skewer'] },
  { key: 'discovered', label: 'Discovered attacks', tags: ['discoveredAttack'] },
  { key: 'hanging', label: 'Hanging pieces', tags: ['hangingPiece', 'capturingDefender'] },
  { key: 'deflection', label: 'Deflection', tags: ['deflection', 'attraction'] },
  { key: 'sacrifice', label: 'Sacrifices', tags: ['sacrifice'] },
  { key: 'defense', label: 'Defense', tags: ['defensiveMove'] },
  { key: 'quiet', label: 'Quiet moves', tags: ['quietMove', 'zugzwang'] },
  { key: 'endgame', label: 'Endgames', tags: ['endgame', 'rookEndgame', 'pawnEndgame', 'queenEndgame', 'knightEndgame', 'bishopEndgame'] },
  { key: 'promotion', label: 'Promotion', tags: ['promotion', 'advancedPawn'] },
]

export function themeByKey(key: string): ThemeOption {
  return THEMES.find((t) => t.key === key) ?? THEMES[0]
}

const cache = new Map<number, Promise<Puzzle[]>>()

function loadBand(band: number): Promise<Puzzle[]> {
  let p = cache.get(band)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/puzzles/${band}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`puzzle band ${band} unavailable`)
        return r.json() as Promise<[string, string, string, number, string][]>
      })
      .then((rows) =>
        rows.map(([id, fen, moves, rating, themes]) => ({ id, fen, moves: moves.split(' '), rating, themes: themes.split(' ') })),
      )
    cache.set(band, p)
  }
  return p
}

function bandOf(rating: number): number {
  const b = Math.floor(rating / 200) * 200
  return Math.max(BANDS[0], Math.min(BANDS[BANDS.length - 1], b))
}

export interface PuzzleProfile {
  rating: number
  solved: number
  failed: number
  streak: number
  best: number
}

const DEFAULT: PuzzleProfile = { rating: 1400, solved: 0, failed: 0, streak: 0, best: 0 }

export async function getPuzzleProfile(): Promise<PuzzleProfile> {
  return { ...DEFAULT, ...(await getSetting<Partial<PuzzleProfile>>('puzzleProfile', {})) }
}

export async function savePuzzleProfile(p: PuzzleProfile): Promise<void> {
  await setSetting('puzzleProfile', p)
}

/** Pick an unseen puzzle near the target rating, optionally restricted to a theme. */
export async function pickPuzzle(target: number, themeKey: string, excludeIds: Set<string>): Promise<Puzzle | null> {
  const theme = themeByKey(themeKey)
  const center = bandOf(target)
  const bandsToTry = [center, center - 200, center + 200, center - 400, center + 400].filter(
    (b, i, a) => b >= BANDS[0] && b <= BANDS[BANDS.length - 1] && a.indexOf(b) === i,
  )
  let pool: Puzzle[] = []
  for (const b of bandsToTry) {
    const rows = await loadBand(b)
    pool = pool.concat(rows)
    const candidates = filterPool(pool, target, theme, excludeIds, 150)
    if (candidates.length >= 20) return candidates[Math.floor(Math.random() * candidates.length)]
  }
  for (const window of [250, 400, 800]) {
    const candidates = filterPool(pool, target, theme, excludeIds, window)
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)]
  }
  const any = pool.filter((p) => !excludeIds.has(p.id))
  return any.length ? any[Math.floor(Math.random() * any.length)] : null
}

function filterPool(pool: Puzzle[], target: number, theme: ThemeOption, exclude: Set<string>, window: number): Puzzle[] {
  return pool.filter(
    (p) =>
      !exclude.has(p.id) &&
      Math.abs(p.rating - target) <= window &&
      (theme.tags.length === 0 || p.themes.some((t) => theme.tags.includes(t))),
  )
}

export async function seenPuzzleIds(): Promise<Set<string>> {
  const rows = await db.puzzleResults.toArray()
  return new Set(rows.map((r) => r.puzzleId))
}

export async function recordPuzzle(
  puzzle: Puzzle,
  solved: boolean,
  hintUsed: boolean,
  themeKey: string,
): Promise<{ before: number; after: number; profile: PuzzleProfile }> {
  const prof = await getPuzzleProfile()
  const before = prof.rating
  const games = prof.solved + prof.failed
  const after = updateRating(before, puzzle.rating, solved ? 1 : 0, games)
  const next: PuzzleProfile = {
    rating: after,
    solved: prof.solved + (solved ? 1 : 0),
    failed: prof.failed + (solved ? 0 : 1),
    streak: solved ? prof.streak + 1 : 0,
    best: Math.max(prof.best, after),
  }
  await savePuzzleProfile(next)
  const row: PuzzleResult = {
    puzzleId: puzzle.id,
    at: Date.now(),
    solved,
    hintUsed,
    puzzleRating: puzzle.rating,
    themes: puzzle.themes,
    themeKey,
    ratingBefore: before,
    ratingAfter: after,
  }
  await db.puzzleResults.add(row)
  return { before, after, profile: next }
}

/** Accuracy per theme option over recent results, for the coach and radar. */
export async function themeAccuracy(limit = 200): Promise<Record<string, { tried: number; solved: number }>> {
  const rows = await db.puzzleResults.orderBy('at').reverse().limit(limit).toArray()
  const out: Record<string, { tried: number; solved: number }> = {}
  for (const t of THEMES) {
    if (t.key === 'mixed') continue
    const mine = rows.filter((r) => r.themes.some((x) => t.tags.includes(x)))
    if (mine.length) out[t.key] = { tried: mine.length, solved: mine.filter((r) => r.solved).length }
  }
  return out
}

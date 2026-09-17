import Dexie, { type EntityTable } from 'dexie'
import { STARTING_RATING } from '../game/rating'
import { LEGACY_LEVEL_ELO } from '../game/levels'
import type { GameAnalysis } from '../analysis/analyze'

export type Color = 'w' | 'b'
export type Result = '1-0' | '0-1' | '1/2-1/2' | '*'

export interface GameRecord {
  id?: number
  playedAt: number
  playerColor: Color
  /** opponent strength on the sliding scale */
  opponentElo: number
  /** false when a hint was used; the game then does not affect the rating */
  rated: boolean
  result: Result
  termination: string
  /** SAN moves in order */
  moves: string[]
  finalFen: string
  ratingBefore: number
  ratingAfter: number
  /** first build only; superseded by opponentElo */
  levelId?: number
  /** engine review, filled in on demand */
  analysis?: GameAnalysis
}

export interface Setting {
  key: string
  value: unknown
}

export interface Profile {
  rating: number
  gamesPlayed: number
  peakRating: number
}

export const db = new Dexie('chesscoach') as Dexie & {
  games: EntityTable<GameRecord, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  games: '++id, playedAt, levelId, result',
  settings: 'key',
})

db.version(2)
  .stores({
    games: '++id, playedAt, opponentElo, result',
    settings: 'key',
  })
  .upgrade((tx) =>
    tx
      .table('games')
      .toCollection()
      .modify((g: GameRecord) => {
        if (g.opponentElo == null) g.opponentElo = LEGACY_LEVEL_ELO[g.levelId ?? 5] ?? 1400
        if (g.rated == null) g.rated = true
      }),
  )

const DEFAULT_PROFILE: Profile = { rating: STARTING_RATING, gamesPlayed: 0, peakRating: STARTING_RATING }

export async function getProfile(): Promise<Profile> {
  const row = await db.settings.get('profile')
  return { ...DEFAULT_PROFILE, ...((row?.value as Partial<Profile>) ?? {}) }
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.settings.put({ key: 'profile', value: p })
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function exportBackup(): Promise<string> {
  const [games, settings] = await Promise.all([db.games.toArray(), db.settings.toArray()])
  return JSON.stringify({ app: 'chesscoach', version: 2, exportedAt: Date.now(), games, settings }, null, 2)
}

export async function importBackup(json: string): Promise<{ games: number }> {
  const data = JSON.parse(json) as { app?: string; games?: GameRecord[]; settings?: Setting[] }
  if (data.app !== 'chesscoach') throw new Error('Not a Chess Coach backup file')
  const games = (data.games ?? []).map((g) => ({
    ...g,
    opponentElo: g.opponentElo ?? LEGACY_LEVEL_ELO[g.levelId ?? 5] ?? 1400,
    rated: g.rated ?? true,
  }))
  await db.transaction('rw', db.games, db.settings, async () => {
    await db.games.clear()
    await db.settings.clear()
    await db.games.bulkAdd(games)
    await db.settings.bulkPut(data.settings ?? [])
  })
  return { games: games.length }
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.games, db.settings, async () => {
    await db.games.clear()
    await db.settings.clear()
  })
}

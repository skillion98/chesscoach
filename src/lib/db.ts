import Dexie, { type EntityTable } from 'dexie'
import { STARTING_RATING } from '../game/rating'

export type Color = 'w' | 'b'
export type Result = '1-0' | '0-1' | '1/2-1/2' | '*'

export interface GameRecord {
  id?: number
  playedAt: number
  playerColor: Color
  levelId: number
  result: Result
  termination: string
  /** SAN moves in order */
  moves: string[]
  finalFen: string
  ratingBefore: number
  ratingAfter: number
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
  return JSON.stringify({ app: 'chesscoach', version: 1, exportedAt: Date.now(), games, settings }, null, 2)
}

export async function importBackup(json: string): Promise<{ games: number }> {
  const data = JSON.parse(json) as { app?: string; games?: GameRecord[]; settings?: Setting[] }
  if (data.app !== 'chesscoach') throw new Error('Not a Chess Coach backup file')
  await db.transaction('rw', db.games, db.settings, async () => {
    await db.games.clear()
    await db.settings.clear()
    await db.games.bulkAdd(data.games ?? [])
    await db.settings.bulkPut(data.settings ?? [])
  })
  return { games: data.games?.length ?? 0 }
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.games, db.settings, async () => {
    await db.games.clear()
    await db.settings.clear()
  })
}

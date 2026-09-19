// Rebuild the profile from the game history (used when the rating system changes).

import { db, saveProfile, type Profile } from '../lib/db'
import { START_RD, START_VOL } from './glicko'
import { HINT_COST, UNDO_COST, applyGame, type RatingState } from './rating'

export async function rebuildProfileFromGames(): Promise<Profile> {
  const games = await db.games.orderBy('playedAt').toArray()
  let state: RatingState = { rating: 0, rd: START_RD, vol: START_VOL, gamesPlayed: 0, lastGameAt: null }
  let peak = 0
  for (const g of games) {
    if (g.rated === false) continue
    const won = g.result !== '1/2-1/2' && (g.result === '1-0') === (g.playerColor === 'w')
    const score: 0 | 0.5 | 1 = g.result === '1/2-1/2' ? 0.5 : won ? 1 : 0
    const before = state.rating
    state = applyGame(state, g.opponentElo, score, g.playedAt)
    const cost = (g.hints ?? 0) * HINT_COST + (g.undos ?? 0) * UNDO_COST
    state = { ...state, rating: Math.max(0, state.rating - cost) }
    peak = Math.max(peak, state.rating)
    if (g.id !== undefined) await db.games.update(g.id, { ratingBefore: before, ratingAfter: state.rating, assistCost: cost })
  }
  const profile: Profile = {
    rating: state.rating,
    gamesPlayed: state.gamesPlayed,
    peakRating: peak,
    rd: state.rd,
    vol: state.vol,
    lastGameAt: state.lastGameAt ?? undefined,
  }
  await saveProfile(profile)
  return profile
}

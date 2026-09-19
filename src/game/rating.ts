import { firstRating, glickoUpdate, type GlickoRating } from './glicko'

export const STARTING_RATING = 0
export const RATING_ERA = 3

/** Fixed prices for assistance, in rating points. */
export const HINT_COST = 8
export const UNDO_COST = 5
/** Teaching mode (threat overlay) is priced once per game it was used in. */
export const TEACHING_COST = 10

export function expectedScore(player: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - player) / 400))
}

/** Puzzle rating still uses a plain Elo step (the puzzle pool is huge and well calibrated). */
export function kFactor(gamesPlayed: number): number {
  return gamesPlayed < 20 ? 40 : 24
}

export function updateRating(player: number, opponent: number, score: 0 | 0.5 | 1, gamesPlayed: number): number {
  return Math.max(0, Math.round(player + kFactor(gamesPlayed) * (score - expectedScore(player, opponent))))
}

export function hintCost(): number {
  return HINT_COST
}

export function undoCost(): number {
  return UNDO_COST
}

export function teachingCost(): number {
  return TEACHING_COST
}

export function assistCostFor(hints: number, undos: number, teaching: boolean): number {
  return hints * HINT_COST + undos * UNDO_COST + (teaching ? TEACHING_COST : 0)
}

export interface RatingState extends GlickoRating {
  gamesPlayed: number
  lastGameAt: number | null
}

/** Apply one rated game. The first game sets the starting point; after that Glicko-2. */
export function applyGame(state: RatingState, opponent: number, score: 0 | 0.5 | 1, playedAt: number): RatingState {
  const idleDays = state.lastGameAt ? Math.max(0, (playedAt - state.lastGameAt) / 86_400_000) : 0
  const next = state.gamesPlayed === 0 ? firstRating(opponent, score) : glickoUpdate(state, opponent, score, idleDays)
  return { ...next, gamesPlayed: state.gamesPlayed + 1, lastGameAt: playedAt }
}

export const STARTING_RATING = 0
export const RATING_ERA = 2

export function expectedScore(player: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - player) / 400))
}

/** Big steps while you are earning your first rating, then normal club-style updates. */
export function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 120
  if (gamesPlayed < 25) return 60
  return 24
}

export function updateRating(player: number, opponent: number, score: 0 | 0.5 | 1, gamesPlayed: number): number {
  return Math.max(0, Math.round(player + kFactor(gamesPlayed) * (score - expectedScore(player, opponent))))
}

/** What one hint or one undo costs, in rating points, at the current K-factor. */
export function hintCost(gamesPlayed: number): number {
  return Math.max(3, Math.round(kFactor(gamesPlayed) / 4))
}

export function undoCost(gamesPlayed: number): number {
  return Math.max(2, Math.round(kFactor(gamesPlayed) / 6))
}

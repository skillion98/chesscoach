export const STARTING_RATING = 1500
export const PROVISIONAL_GAMES = 20

export function expectedScore(player: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - player) / 400))
}

export function kFactor(gamesPlayed: number): number {
  return gamesPlayed < PROVISIONAL_GAMES ? 40 : 24
}

export function updateRating(player: number, opponent: number, score: 0 | 0.5 | 1, gamesPlayed: number): number {
  return Math.round(player + kFactor(gamesPlayed) * (score - expectedScore(player, opponent)))
}

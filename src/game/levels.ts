export interface Level {
  id: number
  name: string
  /** Approximate playing strength; used as the opponent rating for Elo updates until calibrated. */
  elo: number
  /** Stockfish "Skill Level" 0-20 */
  skill: number
  /** milliseconds per move */
  movetime: number
  /** how many candidate lines to consider when choosing a move */
  multipv: number
  /** softmax temperature in centipawns; 0 = always the best line */
  temperature: number
  /** chance of playing a completely random legal move */
  randomMoveChance: number
  blurb: string
}

export const LEVELS: Level[] = [
  { id: 1, name: 'Pawn', elo: 600, skill: 0, movetime: 60, multipv: 6, temperature: 160, randomMoveChance: 0.15, blurb: 'Hangs pieces and misses one-move threats.' },
  { id: 2, name: 'Novice', elo: 800, skill: 1, movetime: 80, multipv: 5, temperature: 120, randomMoveChance: 0.08, blurb: 'Sees captures, not much else.' },
  { id: 3, name: 'Beginner', elo: 1000, skill: 3, movetime: 100, multipv: 4, temperature: 90, randomMoveChance: 0.03, blurb: 'Basic tactics, shaky endgames.' },
  { id: 4, name: 'Improver', elo: 1200, skill: 5, movetime: 150, multipv: 3, temperature: 60, randomMoveChance: 0, blurb: 'Solid but drifts in quiet positions.' },
  { id: 5, name: 'Club Player', elo: 1400, skill: 8, movetime: 200, multipv: 2, temperature: 40, randomMoveChance: 0, blurb: 'A fair fight at your level.' },
  { id: 6, name: 'Strong Club', elo: 1600, skill: 11, movetime: 300, multipv: 1, temperature: 0, randomMoveChance: 0, blurb: 'Punishes loose moves.' },
  { id: 7, name: 'Expert', elo: 1900, skill: 15, movetime: 500, multipv: 1, temperature: 0, randomMoveChance: 0, blurb: 'Rarely blunders. Bring a plan.' },
  { id: 8, name: 'Master', elo: 2200, skill: 20, movetime: 800, multipv: 1, temperature: 0, randomMoveChance: 0, blurb: 'Full engine strength for its time budget.' },
]

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[4]
}

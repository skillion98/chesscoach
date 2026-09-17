// Continuous opponent strength: any Elo from MIN_ELO to MAX_ELO in ELO_STEP increments.
// Engine parameters are interpolated between hand-tuned anchors.

export interface Strength {
  elo: number
  band: string
  glyph: string
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
}

/** Kept as an alias so move selection code can stay generic. */
export type Level = Strength

export const MIN_ELO = 400
export const MAX_ELO = 2400
export const ELO_STEP = 20

interface Anchor {
  elo: number
  skill: number
  movetime: number
  multipv: number
  temperature: number
  randomMoveChance: number
}

const ANCHORS: Anchor[] = [
  { elo: 400, skill: 0, movetime: 40, multipv: 8, temperature: 220, randomMoveChance: 0.25 },
  { elo: 600, skill: 0, movetime: 60, multipv: 6, temperature: 160, randomMoveChance: 0.15 },
  { elo: 800, skill: 1, movetime: 80, multipv: 5, temperature: 120, randomMoveChance: 0.08 },
  { elo: 1000, skill: 3, movetime: 100, multipv: 4, temperature: 90, randomMoveChance: 0.03 },
  { elo: 1200, skill: 5, movetime: 150, multipv: 3, temperature: 60, randomMoveChance: 0 },
  { elo: 1400, skill: 8, movetime: 200, multipv: 2, temperature: 40, randomMoveChance: 0 },
  { elo: 1600, skill: 11, movetime: 300, multipv: 1, temperature: 0, randomMoveChance: 0 },
  { elo: 1900, skill: 15, movetime: 500, multipv: 1, temperature: 0, randomMoveChance: 0 },
  { elo: 2200, skill: 20, movetime: 800, multipv: 1, temperature: 0, randomMoveChance: 0 },
  { elo: 2400, skill: 20, movetime: 1500, multipv: 1, temperature: 0, randomMoveChance: 0 },
]

const BANDS: { max: number; name: string; glyph: string; blurb: string }[] = [
  { max: 700, name: 'Pawn', glyph: '♙', blurb: 'Hangs pieces and misses one-move threats.' },
  { max: 1000, name: 'Novice', glyph: '♘', blurb: 'Sees captures, not much else.' },
  { max: 1200, name: 'Beginner', glyph: '♘', blurb: 'Basic tactics, shaky endgames.' },
  { max: 1400, name: 'Improver', glyph: '♗', blurb: 'Solid but drifts in quiet positions.' },
  { max: 1600, name: 'Club Player', glyph: '♗', blurb: 'A fair fight for a club player.' },
  { max: 1800, name: 'Strong Club', glyph: '♖', blurb: 'Punishes loose moves.' },
  { max: 2100, name: 'Expert', glyph: '♕', blurb: 'Rarely blunders. Bring a plan.' },
  { max: Infinity, name: 'Master', glyph: '♔', blurb: 'Full engine strength for its time budget.' },
]

export function bandFor(elo: number): { name: string; glyph: string; blurb: string } {
  return BANDS.find((b) => elo < b.max) ?? BANDS[BANDS.length - 1]
}

export function clampElo(elo: number): number {
  const snapped = Math.round(elo / ELO_STEP) * ELO_STEP
  return Math.min(MAX_ELO, Math.max(MIN_ELO, snapped))
}

export function strengthFor(eloIn: number): Strength {
  const elo = clampElo(eloIn)
  let a = ANCHORS[0]
  let b = ANCHORS[ANCHORS.length - 1]
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (elo >= ANCHORS[i].elo && elo <= ANCHORS[i + 1].elo) {
      a = ANCHORS[i]
      b = ANCHORS[i + 1]
      break
    }
  }
  const t = b.elo === a.elo ? 0 : (elo - a.elo) / (b.elo - a.elo)
  const lerp = (x: number, y: number) => x + (y - x) * t
  const band = bandFor(elo)
  return {
    elo,
    band: band.name,
    glyph: band.glyph,
    skill: Math.round(lerp(a.skill, b.skill)),
    movetime: Math.round(lerp(a.movetime, b.movetime)),
    multipv: Math.max(1, Math.round(lerp(a.multipv, b.multipv))),
    temperature: Math.round(lerp(a.temperature, b.temperature)),
    randomMoveChance: Number(lerp(a.randomMoveChance, b.randomMoveChance).toFixed(3)),
  }
}

/** Elo assigned to the eight fixed levels of the first build, for migrating old game records. */
export const LEGACY_LEVEL_ELO: Record<number, number> = {
  1: 600,
  2: 800,
  3: 1000,
  4: 1200,
  5: 1400,
  6: 1600,
  7: 1900,
  8: 2200,
}

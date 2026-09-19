// Glicko-2 (Glickman), one rating period per game, as Lichess does.
// A rating carries a deviation (how unsure we are) that shrinks with games and grows with idleness.

export interface GlickoRating {
  rating: number
  /** rating deviation: 350 = no idea, ~60 = well established */
  rd: number
  vol: number
}

const SCALE = 173.7178
const TAU = 0.75
const MAX_VOL = 0.1
export const START_RD = 350
export const START_VOL = 0.06
/** below this deviation the rating is no longer shown as provisional */
export const PROVISIONAL_RD = 110
/** engine opponents are calibrated only roughly */
export const OPPONENT_RD = 60

export function isProvisional(r: GlickoRating): boolean {
  return r.rd > PROVISIONAL_RD
}

/** The first rated game sets the starting point from the opponent and the result. */
export function firstRating(opponent: number, score: 0 | 0.5 | 1): GlickoRating {
  const rating = Math.max(0, Math.round(opponent + (score - 0.5) * 800))
  return { rating, rd: START_RD, vol: START_VOL }
}

export function glickoUpdate(p: GlickoRating, opponent: number, score: 0 | 0.5 | 1, idleDays = 0): GlickoRating {
  const mu = (p.rating - 1500) / SCALE
  let phi = p.rd / SCALE
  const sigma = p.vol
  if (idleDays > 0) phi = Math.min(START_RD / SCALE, Math.sqrt(phi * phi + sigma * sigma * idleDays))

  const muj = (opponent - 1500) / SCALE
  const phij = OPPONENT_RD / SCALE
  const g = 1 / Math.sqrt(1 + (3 * phij * phij) / (Math.PI * Math.PI))
  const E = 1 / (1 + Math.exp(-g * (mu - muj)))
  const v = 1 / (g * g * E * (1 - E))
  const delta = v * g * (score - E)

  // new volatility (Illinois algorithm from the Glicko-2 paper)
  const a = Math.log(sigma * sigma)
  const f = (x: number) =>
    (Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x))) / (2 * Math.pow(phi * phi + v + Math.exp(x), 2)) - (x - a) / (TAU * TAU)
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v)
  else {
    let k = 1
    while (f(a - k * TAU) < 0 && k < 50) k++
    B = a - k * TAU
  }
  let fA = f(A)
  let fB = f(B)
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB < 0) {
      A = B
      fA = fB
    } else fA = fA / 2
    B = C
    fB = fC
  }
  const sigmaNew = Math.min(MAX_VOL, Math.exp(A / 2))

  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew)
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  let muNew = mu + phiNew * phiNew * g * (score - E)
  // keep any single game within a sane range
  const cap = 400 / SCALE
  muNew = Math.max(mu - cap, Math.min(mu + cap, muNew))

  return {
    rating: Math.max(0, Math.round(muNew * SCALE + 1500)),
    rd: Math.max(30, Math.min(START_RD, Math.round(phiNew * SCALE))),
    vol: sigmaNew,
  }
}

/** Expected score of `a` against `b`, ignoring deviations (for coach suggestions). */
export function expected(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400))
}

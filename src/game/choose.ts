import type { PvLine } from '../engine/stockfish'
import type { Level } from './levels'

/**
 * Pick the engine's reply for a given level. Higher temperature makes weaker,
 * more human-looking choices; randomMoveChance injects outright blunders.
 * Returns a UCI move string.
 */
export function chooseMove(
  lines: PvLine[],
  bestMove: string,
  legalUci: string[],
  level: Level,
  rand: () => number = Math.random,
): string {
  if (level.randomMoveChance > 0 && legalUci.length > 0 && rand() < level.randomMoveChance) {
    return legalUci[Math.floor(rand() * legalUci.length)]
  }
  const candidates = lines.filter((l) => legalUci.includes(l.move))
  if (level.temperature <= 0 || candidates.length <= 1) {
    if (legalUci.includes(bestMove)) return bestMove
    return candidates[0]?.move ?? legalUci[0]
  }
  const best = Math.max(...candidates.map((c) => c.cp))
  const weights = candidates.map((c) => Math.exp((c.cp - best) / level.temperature))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) return candidates[i].move
  }
  return candidates[candidates.length - 1].move
}

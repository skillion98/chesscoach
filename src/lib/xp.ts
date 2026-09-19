// Experience points: a progress track that only goes up, separate from the honest rating.

import { getSetting, setSetting } from './db'

export interface XpState {
  total: number
  /** recent awards, newest first */
  recent: { at: number; amount: number; reason: string }[]
}

export const XP_AWARDS = {
  gamePlayed: 20,
  gameWon: 15,
  gameDrawn: 5,
  analysis: 15,
  puzzleSolved: 6,
  puzzleFailed: 1,
  lesson: 10,
  drill: 10,
  drillPerfect: 10,
} as const

/** XP needed to reach a level: 60·L². Level 1 at 60, level 5 at 1500, level 10 at 6000. */
export function xpForLevel(level: number): number {
  return 60 * level * level
}

export function levelFor(total: number): { level: number; into: number; span: number; title: string } {
  let level = 0
  while (xpForLevel(level + 1) <= total) level++
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, into: total - base, span: next - base, title: titleFor(level) }
}

export function titleFor(level: number): string {
  if (level < 3) return 'Pawn'
  if (level < 6) return 'Knight'
  if (level < 9) return 'Bishop'
  if (level < 13) return 'Rook'
  if (level < 20) return 'Queen'
  return 'King'
}

export async function getXp(): Promise<XpState> {
  return await getSetting<XpState>('xp', { total: 0, recent: [] })
}

export async function addXp(amount: number, reason: string): Promise<XpState> {
  const s = await getXp()
  const next: XpState = { total: s.total + amount, recent: [{ at: Date.now(), amount, reason }, ...s.recent].slice(0, 20) }
  await setSetting('xp', next)
  window.dispatchEvent(new CustomEvent('xp', { detail: next }))
  return next
}

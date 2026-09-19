import { useEffect, useState } from 'react'
import { getXp, levelFor, type XpState } from '../lib/xp'

/** Level and progress toward the next one; only ever goes up. */
export default function XpBar() {
  const [xp, setXp] = useState<XpState | null>(null)
  useEffect(() => {
    getXp().then(setXp)
    const on = (e: Event) => setXp((e as CustomEvent<XpState>).detail)
    window.addEventListener('xp', on)
    return () => window.removeEventListener('xp', on)
  }, [])
  if (!xp) return null
  const lv = levelFor(xp.total)
  const pct = Math.round((lv.into / lv.span) * 100)
  const glyph = lv.title === 'Pawn' ? '♙' : lv.title === 'Knight' ? '♘' : lv.title === 'Bishop' ? '♗' : lv.title === 'Rook' ? '♖' : lv.title === 'Queen' ? '♕' : '♔'
  return (
    <div className="xp">
      <div className="xp-head">
        <span className="xp-level">
          <span aria-hidden="true">{glyph}</span> Level {lv.level} · {lv.title}
        </span>
        <span className="muted small">
          {lv.into}/{lv.span} XP to level {lv.level + 1}
        </span>
      </div>
      <div className="xp-track">
        <span className="xp-fill" style={{ width: `${pct}%` }} />
      </div>
      {xp.recent[0] && (
        <div className="muted small xp-recent">
          +{xp.recent[0].amount} {xp.recent[0].reason.toLowerCase()}
        </div>
      )}
    </div>
  )
}

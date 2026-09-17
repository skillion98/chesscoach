import { useEffect, useState } from 'react'
import Icon from '../components/Icons'
import { moveText } from '../openings/model'
import { weakLines, type WeakLine } from '../openings/stats'
import { navigate } from '../lib/router'

export default function WeakLinesScreen() {
  const [rows, setRows] = useState<WeakLine[] | null>(null)

  useEffect(() => {
    weakLines(40).then(setRows)
  }, [])

  if (!rows) return <div className="screen muted">Loading…</div>

  return (
    <div className="screen">
      <p className="muted small">
        Lines you keep getting wrong, from drills and from your games. Highest priority first. Tap one to drill it from that exact position.
      </p>
      {rows.length === 0 && (
        <div className="card center">
          <Icon name="target" size={36} className="muted" />
          <p className="muted">Nothing flagged yet. Drill a chapter or play a game and the misses will show up here.</p>
        </div>
      )}
      <div className="weak-list">
        {rows.map((w) => (
          <button
            type="button"
            key={`${w.slug}-${w.chapter}-${w.ply}`}
            className="weak-row"
            onClick={() => navigate(`/openings/${w.slug}/${w.chapter}/drill/${w.ply}`)}
          >
            <span className="weak-score" aria-hidden="true">
              <span className="weak-fill" style={{ height: `${Math.round(w.weakness * 100)}%` }} />
            </span>
            <span className="weak-main">
              <span className="small muted">
                {w.title} · {w.chapterName}
              </span>
              <span>
                After <span className="mono">{moveText(w.lead, w.lead.length) || 'the start'}</span>, play <strong>{w.expected}</strong>
                {w.played ? `, not ${w.played}` : ''}
              </span>
              <span className="small muted">
                {w.drillMisses > 0 ? `${w.drillMisses} of ${w.drillAttempts} drills missed` : ''}
                {w.drillMisses > 0 && w.gameDeviations > 0 ? ' · ' : ''}
                {w.gameDeviations > 0 ? `left the line in ${w.gameDeviations} game${w.gameDeviations === 1 ? '' : 's'}` : ''}
              </span>
            </span>
            <span className="chev">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

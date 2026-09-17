import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'
import Icon from '../components/Icons'
import Radar from '../components/Radar'
import { assess, type Assessment } from '../coach/assess'
import { setSetting } from '../lib/db'
import { navigate } from '../lib/router'

function Slider({ left, right, value }: { left: string; right: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="style-slider">
      <div className="style-ends">
        <span className={value < 0.45 ? 'strong' : ''}>{left}</span>
        <span className={value > 0.55 ? 'strong' : ''}>{right}</span>
      </div>
      <div className="style-track">
        <span className="style-knob" style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CoachScreen() {
  const [a, setA] = useState<Assessment | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    assess()
      .then(setA)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])

  if (err) return <div className="screen muted">Could not assess: {err}</div>
  if (!a) return <div className="screen muted">Reading your games…</div>

  const s = a.style
  const enough = s.moves >= 60
  const attackPos = enough ? 0.5 + (s.attacking - s.positional) / 2 : 0.5
  const dynSolid = enough ? 0.5 + (s.dynamic - s.solid) / 2 : 0.5

  const go = async (r: Assessment['recs'][number]) => {
    if (r.setup) await r.setup()
    navigate(r.path)
  }

  return (
    <div className="screen coach">
      <Radar axes={a.axes} />
      <div className="axis-notes">
        {a.axes.map((x) => (
          <div className="axis-note" key={x.key}>
            <span className={'axis-dot' + (x.score === null ? ' empty' : x.score >= 70 ? ' good' : x.score >= 45 ? ' mid' : ' bad')} />
            <span className="axis-label">{x.label}</span>
            <span className="muted small">{x.detail}</span>
          </div>
        ))}
      </div>

      <h3>Your style</h3>
      <div className={'card' + (enough ? '' : ' style-pending')}>
        <Slider left="Positional" right="Attacking" value={attackPos} />
        <Slider left="Solid" right="Dynamic" value={dynSolid} />
        <p className="style-summary">{a.styleSummary}</p>
      </div>

      <h3>This week</h3>
      <div className="plan">
        {a.recs.map((r) => (
          <button type="button" className="plan-card" key={r.id} onClick={() => void go(r)}>
            <span className="plan-title">{r.title}</span>
            <span className="plan-why muted small">{r.why}</span>
            <span className="plan-action">
              {r.action} <span className="chev">›</span>
            </span>
          </button>
        ))}
      </div>

      <h3>Next opponent</h3>
      <button
        type="button"
        className="suggest-card"
        onClick={async () => {
          await setSetting('opponentMode', 'personality')
          await setSetting('lastPersonality', a.suggested.personality.id)
          await setSetting('lastElo', a.suggested.elo)
          navigate('/play')
        }}
      >
        <Avatar hue={a.suggested.personality.hue} glyph={a.suggested.personality.glyph} size={52} />
        <span className="suggest-main">
          <span className="plan-title">
            {a.suggested.personality.name} · {a.suggested.personality.elo}
          </span>
          <span className="muted small">{a.suggested.reason}</span>
        </span>
        <span className="chev">›</span>
      </button>

      <p className="muted small center data-line">
        <Icon name="history" size={14} /> {a.games} games, {a.analyzedGames} analyzed · {a.puzzles} puzzles · {a.drills} drill moves
      </p>
    </div>
  )
}

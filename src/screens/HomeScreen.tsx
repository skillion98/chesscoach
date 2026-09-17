import { useEffect, useState } from 'react'
import Icon, { type IconName } from '../components/Icons'
import { MAX_ELO, MIN_ELO, bandFor } from '../game/levels'
import { db, type GameRecord, type Profile } from '../lib/db'
import { navigate } from '../lib/router'

interface Props {
  profile: Profile
}

const TILES: { title: string; icon: IconName; path?: string }[] = [
  { title: 'Play', icon: 'play', path: '/play' },
  { title: 'Games', icon: 'history', path: '/games' },
  { title: 'Analysis', icon: 'search' },
  { title: 'Openings', icon: 'book' },
  { title: 'Puzzles', icon: 'puzzle' },
  { title: 'Coach', icon: 'coach' },
]

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const [sx, sy] = toXY(startDeg)
  const [ex, ey] = toXY(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

function Gauge({ rating }: { rating: number }) {
  const frac = Math.min(1, Math.max(0, (rating - MIN_ELO) / (MAX_ELO - MIN_ELO)))
  const start = 150
  const sweep = 240
  const end = start + sweep * frac
  const band = bandFor(rating)
  return (
    <svg className="gauge" viewBox="0 0 200 150" role="img" aria-label={`Rating ${rating}, ${band.name}`}>
      <path d={arcPath(100, 90, 78, start, start + sweep)} className="gauge-track" />
      {frac > 0.005 && <path d={arcPath(100, 90, 78, start, end)} className="gauge-fill" />}
      <text x="100" y="98" className="gauge-num" textAnchor="middle">
        {rating}
      </text>
      <text x="100" y="122" className="gauge-band" textAnchor="middle">
        {band.glyph} {band.name}
      </text>
    </svg>
  )
}

function Sparkline({ games }: { games: GameRecord[] }) {
  const rated = games.filter((g) => g.rated !== false).slice(0, 20).reverse()
  const pts = rated.map((g) => g.ratingAfter)
  if (pts.length < 2) {
    return (
      <div className="spark-empty muted small">
        {pts.length === 0 ? 'Play a rated game to start your curve.' : 'One more rated game and your curve appears.'}
      </div>
    )
  }
  const w = 320
  const h = 56
  const lo = Math.min(...pts) - 10
  const hi = Math.max(...pts) + 10
  const x = (i: number) => (i / (pts.length - 1)) * (w - 8) + 4
  const y = (v: number) => h - 4 - ((v - lo) / (hi - lo)) * (h - 8)
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Recent rating trend">
      <path d={d} className={last >= first ? 'spark-line up' : 'spark-line down'} />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="3.5" className={last >= first ? 'spark-dot up' : 'spark-dot down'} />
    </svg>
  )
}

export default function HomeScreen({ profile }: Props) {
  const [recent, setRecent] = useState<GameRecord[]>([])

  useEffect(() => {
    db.games.orderBy('playedAt').reverse().limit(40).toArray().then(setRecent)
  }, [profile])

  const wins = recent.filter((g) => g.result !== '1/2-1/2' && (g.result === '1-0') === (g.playerColor === 'w')).length

  return (
    <div className="screen home">
      <section className="hero">
        <Gauge rating={profile.rating} />
        <Sparkline games={recent} />
        <div className="stats">
          <div className="stat">
            <Icon name="history" size={18} />
            <span>{profile.gamesPlayed}</span>
          </div>
          <div className="stat">
            <Icon name="trophy" size={18} />
            <span>{profile.peakRating}</span>
          </div>
          <div className="stat">
            <Icon name="flag" size={18} />
            <span>
              {wins}/{recent.length}
            </span>
          </div>
        </div>
      </section>
      <div className="tiles">
        {TILES.map((t) => (
          <button
            type="button"
            key={t.title}
            className={'tile' + (t.path ? '' : ' disabled')}
            disabled={!t.path}
            onClick={() => t.path && navigate(t.path)}
          >
            <Icon name={t.icon} size={34} className="tile-icon" />
            <span className="tile-title">{t.title}</span>
            {!t.path && <Icon name="lock" size={14} className="tile-lock" />}
          </button>
        ))}
      </div>
    </div>
  )
}

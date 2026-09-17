import type { Profile } from '../lib/db'
import { navigate } from '../lib/router'

interface Props {
  profile: Profile
}

const TILES: { title: string; sub: string; path?: string }[] = [
  { title: 'Play', sub: 'Rated game vs the engine', path: '/play' },
  { title: 'Games', sub: 'Review your history', path: '/games' },
  { title: 'Puzzles', sub: 'Coming in milestone 4' },
  { title: 'Openings', sub: 'Coming in milestone 3' },
  { title: 'Analysis', sub: 'Coming in milestone 2' },
  { title: 'Coach', sub: 'Coming in milestone 6' },
]

export default function HomeScreen({ profile }: Props) {
  return (
    <div className="screen">
      <section className="card rating-card">
        <div>
          <div className="muted small">Your rating</div>
          <div className="rating-big">{profile.rating}</div>
        </div>
        <div className="rating-meta">
          <div>
            <div className="muted small">Games</div>
            <div>{profile.gamesPlayed}</div>
          </div>
          <div>
            <div className="muted small">Peak</div>
            <div>{profile.peakRating}</div>
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
            <span className="tile-title">{t.title}</span>
            <span className="tile-sub">{t.sub}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link" onClick={() => navigate('/settings')}>
        Settings &amp; backup
      </button>
    </div>
  )
}

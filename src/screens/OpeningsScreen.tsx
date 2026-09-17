import { useEffect, useState } from 'react'
import Icon from '../components/Icons'
import { COURSES, thumbnail, type Course } from '../openings/model'
import { courseMastery, weakLines, type CourseMastery } from '../openings/stats'
import { navigate } from '../lib/router'

function Tile({ course, mastery }: { course: Course; mastery?: CourseMastery }) {
  const pct = mastery ? Math.round(mastery.score * 100) : 0
  return (
    <button type="button" className="op-tile" onClick={() => navigate(`/openings/${course.slug}`)}>
      <img className="op-thumb" src={thumbnail(course.video)} alt="" loading="lazy" />
      <span className="op-shade" />
      <span className={'op-side ' + (course.side === 'w' ? 'white' : 'black')} aria-label={course.side === 'w' ? 'as White' : 'as Black'}>
        {course.side === 'w' ? '♔' : '♚'}
      </span>
      {mastery && mastery.grade !== '–' && (
        <span className={'op-grade g-' + mastery.grade} title={`${pct}% mastery`}>
          {mastery.grade}
        </span>
      )}
      {mastery && mastery.due > 0 && <span className="op-due">{mastery.due} due</span>}
      <span className="op-title">{course.title}</span>
      <span className="op-bar">
        <span className="op-bar-fill" style={{ width: `${pct}%` }} />
      </span>
    </button>
  )
}

export default function OpeningsScreen() {
  const [mastery, setMastery] = useState<Record<string, CourseMastery>>({})
  const [weak, setWeak] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all(COURSES.map(async (c) => [c.slug, await courseMastery(c)] as const)).then((rows) => {
      if (alive) setMastery(Object.fromEntries(rows))
    })
    weakLines(50).then((w) => alive && setWeak(w.length))
    return () => {
      alive = false
    }
  }, [])

  const white = COURSES.filter((c) => c.side === 'w')
  const black = COURSES.filter((c) => c.side === 'b')

  return (
    <div className="screen openings">
      <button type="button" className="weak-btn" onClick={() => navigate('/openings/weak')}>
        <Icon name="target" size={22} />
        <span>
          <strong>Weak lines</strong>
          <span className="muted small">
            {weak === 0 ? 'Nothing flagged yet. Drill a line or play a game.' : `${weak} spot${weak === 1 ? '' : 's'} to fix`}
          </span>
        </span>
        <span className="chev">›</span>
      </button>

      <h3 className="op-group">
        <span aria-hidden="true">♔</span> As White
      </h3>
      <div className="op-grid">
        {white.map((c) => (
          <Tile key={c.slug} course={c} mastery={mastery[c.slug]} />
        ))}
      </div>
      <h3 className="op-group">
        <span aria-hidden="true">♚</span> As Black
      </h3>
      <div className="op-grid">
        {black.map((c) => (
          <Tile key={c.slug} course={c} mastery={mastery[c.slug]} />
        ))}
      </div>
      <p className="muted small center">Videos by NM Dereque Kelley (@kebuchess). Variation names from the Lichess openings database.</p>
    </div>
  )
}

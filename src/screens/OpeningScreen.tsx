import { useEffect, useState } from 'react'
import Icon from '../components/Icons'
import { allChapters, courseBySlug, moveText, thumbnail, videoUrl } from '../openings/model'
import { courseMastery, ecoRange, weakLines, type CourseMastery, type WeakLine } from '../openings/stats'
import { speak, speechAvailable, stopSpeech } from '../lib/speech'
import { navigate } from '../lib/router'

interface Props {
  slug: string
}

export default function OpeningScreen({ slug }: Props) {
  const course = courseBySlug(slug)
  const [mastery, setMastery] = useState<CourseMastery | null>(null)
  const [weak, setWeak] = useState<WeakLine[]>([])
  const [eco, setEco] = useState<[string, string, string][] | null>(null)
  const [showEco, setShowEco] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!course) return
    let alive = true
    courseMastery(course).then((m) => alive && setMastery(m))
    weakLines(5, course.slug).then((w) => alive && setWeak(w))
    return () => {
      alive = false
      stopSpeech()
    }
  }, [course])

  useEffect(() => {
    if (showEco && !eco && course) ecoRange(course.eco[0], course.eco[1]).then(setEco)
  }, [showEco, eco, course])

  if (!course) return <div className="screen muted">Opening not found.</div>
  const chapters = allChapters(course)

  const listen = async () => {
    if (speaking) {
      stopSpeech()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    await speak(course.intro)
    setSpeaking(false)
  }

  return (
    <div className="screen opening">
      <a className="op-hero" href={videoUrl(course.video)} target="_blank" rel="noopener noreferrer">
        <img src={thumbnail(course.slug)} alt="" />
        <span className="op-hero-shade" />
        <span className="op-hero-play">
          <Icon name="play" size={34} />
        </span>
        <span className="op-hero-label">
          <Icon name="video" size={16} /> Watch NM Dereque Kelley explain the {course.title}
        </span>
      </a>

      <div className="op-head">
        <div>
          <div className="op-h1">
            <span aria-hidden="true">{course.side === 'w' ? '♔' : '♚'}</span> {course.title}
          </div>
          <div className="muted small">
            {course.eco[0]}–{course.eco[1]} · you play {course.side === 'w' ? 'White' : 'Black'}
          </div>
        </div>
        {mastery && (
          <div className={'grade-badge g-' + mastery.grade}>
            <span className="grade-letter">{mastery.grade}</span>
            <span className="grade-pct">{Math.round(mastery.score * 100)}%</span>
          </div>
        )}
      </div>

      <div className="card intro-card">
        <p>{course.intro}</p>
        {speechAvailable() && (
          <button type="button" className="with-icon" onClick={() => void listen()}>
            <Icon name={speaking ? 'pause' : 'sound'} size={18} /> {speaking ? 'Stop' : 'Listen'}
          </button>
        )}
      </div>

      <h3>Chapters</h3>
      <div className="chapters">
        {chapters.map((ch, i) => {
          const m = mastery?.chapters[i]
          return (
            <div className="chapter" key={ch.idx}>
              <div className="chapter-main">
                <div className="chapter-name">
                  {i + 1}. {ch.name}
                </div>
                <div className="muted small mono">{moveText(ch.sans, 6)}…</div>
                {m && m.tried > 0 && (
                  <div className="muted small">
                    {m.tried}/{m.nodes} moves seen · {m.attempts - m.misses}/{m.attempts} correct
                    {m.due > 0 ? ` · ${m.due} due` : ''}
                  </div>
                )}
              </div>
              <div className="chapter-side">
                <span className={'grade-mini g-' + (m?.grade ?? '–')}>{m?.grade ?? '–'}</span>
                <div className="chapter-btns">
                  <button type="button" onClick={() => navigate(`/openings/${course.slug}/${i}/learn`)}>
                    Learn
                  </button>
                  <button type="button" className="primary" onClick={() => navigate(`/openings/${course.slug}/${i}/drill`)}>
                    Drill
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {weak.length > 0 && (
        <>
          <h3>Your weak spots here</h3>
          <div className="weak-list">
            {weak.map((w) => (
              <button
                type="button"
                key={`${w.chapter}-${w.ply}`}
                className="weak-row"
                onClick={() => navigate(`/openings/${w.slug}/${w.chapter}/drill/${w.ply}`)}
              >
                <span className="weak-main">
                  <span className="small muted">{w.chapterName}</span>
                  <span>
                    After <span className="mono">{moveText(w.lead, w.lead.length) || 'the start'}</span>, play <strong>{w.expected}</strong>
                    {w.played ? `, not ${w.played}` : ''}
                  </span>
                  <span className="small muted">
                    {w.drillMisses > 0 ? `${w.drillMisses} drill miss${w.drillMisses === 1 ? '' : 'es'}` : ''}
                    {w.drillMisses > 0 && w.gameDeviations > 0 ? ' · ' : ''}
                    {w.gameDeviations > 0 ? `${w.gameDeviations} game${w.gameDeviations === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" className="link" onClick={() => setShowEco((s) => !s)}>
        {showEco ? 'Hide' : 'Show'} all named variations ({course.eco[0]}–{course.eco[1]})
      </button>
      {showEco && (
        <div className="eco-list">
          {!eco && <div className="muted small">Loading…</div>}
          {eco?.map((r, i) => (
            <div className="eco-row" key={i}>
              <span className="eco-code">{r[0]}</span>
              <span className="eco-main">
                <span>{r[1]}</span>
                <span className="muted small mono">{r[2]}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

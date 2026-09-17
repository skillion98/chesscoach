import { useCallback, useEffect, useState } from 'react'
import Icon from './components/Icons'
import { getProfile, type Profile } from './lib/db'
import { navigate, useRoute } from './lib/router'
import HomeScreen from './screens/HomeScreen'
import PlayScreen from './screens/PlayScreen'
import GamesScreen from './screens/GamesScreen'
import ReviewScreen from './screens/ReviewScreen'
import SettingsScreen from './screens/SettingsScreen'
import OpeningsScreen from './screens/OpeningsScreen'
import OpeningScreen from './screens/OpeningScreen'
import LessonScreen from './screens/LessonScreen'
import WeakLinesScreen from './screens/WeakLinesScreen'
import PuzzleScreen from './screens/PuzzleScreen'
import { courseBySlug } from './openings/model'

export default function App() {
  const route = useRoute()
  const [profile, setProfile] = useState<Profile | null>(null)

  const reload = useCallback(() => {
    getProfile().then(setProfile)
  }, [])

  useEffect(reload, [reload])

  if (!profile) return <div className="screen muted">Loading…</div>

  let title = 'Chess Coach'
  let body
  let back: string | null = '/'
  const review = /^\/games\/(\d+)(\/analyze)?$/.exec(route)
  const lesson = /^\/openings\/([a-z0-9-]+)\/(\d+)\/(learn|drill)(?:\/(\d+))?$/.exec(route)
  const opening = /^\/openings\/([a-z0-9-]+)$/.exec(route)

  if (route === '/play') {
    title = 'Play'
    body = <PlayScreen profile={profile} onProfile={setProfile} />
  } else if (route === '/games') {
    title = 'Games'
    body = <GamesScreen />
  } else if (review) {
    title = 'Review'
    back = '/games'
    body = <ReviewScreen id={Number(review[1])} autoAnalyze={!!review[2]} />
  } else if (route === '/settings') {
    title = 'Settings'
    body = <SettingsScreen profile={profile} onReload={reload} />
  } else if (route === '/puzzles') {
    title = 'Puzzles'
    body = <PuzzleScreen />
  } else if (route === '/openings') {
    title = 'Openings'
    body = <OpeningsScreen />
  } else if (route === '/openings/weak') {
    title = 'Weak lines'
    back = '/openings'
    body = <WeakLinesScreen />
  } else if (lesson) {
    const c = courseBySlug(lesson[1])
    title = c ? c.title : 'Lesson'
    back = `/openings/${lesson[1]}`
    body = (
      <LessonScreen
        key={`${lesson[1]}-${lesson[2]}-${lesson[3]}-${lesson[4] ?? ''}`}
        slug={lesson[1]}
        idx={Number(lesson[2])}
        mode={lesson[3] as 'learn' | 'drill'}
        startPly={lesson[4] ? Number(lesson[4]) : undefined}
      />
    )
  } else if (opening) {
    title = 'Opening'
    back = '/openings'
    body = <OpeningScreen slug={opening[1]} />
  } else {
    back = null
    body = <HomeScreen profile={profile} />
  }

  const isHome = back === null

  return (
    <div className="app">
      <header className="topbar">
        {back ? (
          <button type="button" className="back" onClick={() => navigate(back)}>
            ‹ Back
          </button>
        ) : (
          <span className="back-spacer" />
        )}
        <span className="topbar-title">{title}</span>
        {isHome ? (
          <button type="button" className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings">
            <Icon name="gear" size={22} />
          </button>
        ) : (
          <span className="back-spacer" />
        )}
      </header>
      <main>{body}</main>
    </div>
  )
}

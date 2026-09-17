import { useCallback, useEffect, useState } from 'react'
import Icon from './components/Icons'
import { getProfile, type Profile } from './lib/db'
import { navigate, useRoute } from './lib/router'
import HomeScreen from './screens/HomeScreen'
import PlayScreen from './screens/PlayScreen'
import GamesScreen from './screens/GamesScreen'
import ReviewScreen from './screens/ReviewScreen'
import SettingsScreen from './screens/SettingsScreen'

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
  const review = /^\/games\/(\d+)(\/analyze)?$/.exec(route)
  if (route === '/play') {
    title = 'Play'
    body = <PlayScreen profile={profile} onProfile={setProfile} />
  } else if (route === '/games') {
    title = 'Games'
    body = <GamesScreen />
  } else if (review) {
    title = 'Review'
    body = <ReviewScreen id={Number(review[1])} autoAnalyze={!!review[2]} />
  } else if (route === '/settings') {
    title = 'Settings'
    body = <SettingsScreen profile={profile} onReload={reload} />
  } else {
    body = <HomeScreen profile={profile} />
  }

  const isHome = route === '/' || route === ''

  return (
    <div className="app">
      <header className="topbar">
        {!isHome ? (
          <button type="button" className="back" onClick={() => (review ? navigate('/games') : navigate('/'))}>
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

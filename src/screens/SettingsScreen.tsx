import { useEffect, useRef, useState } from 'react'
import { exportBackup, getSetting, importBackup, resetAll, setSetting, type Profile } from '../lib/db'
import { listVoices, setPreferredVoice, speak, speechAvailable, stopSpeech, type VoiceOption } from '../lib/speech'

function VoicePicker() {
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [uri, setUri] = useState<string>('')
  useEffect(() => {
    const load = () => setVoices(listVoices())
    load()
    if (speechAvailable()) window.speechSynthesis.addEventListener('voiceschanged', load)
    getSetting<string | null>('voiceURI', null).then((v) => setUri(v ?? ''))
    return () => {
      if (speechAvailable()) window.speechSynthesis.removeEventListener('voiceschanged', load)
      stopSpeech()
    }
  }, [])
  if (!speechAvailable()) return <p className="muted small">This browser has no speech voices.</p>
  const label = (v: VoiceOption) => `${v.name}${v.quality !== 'standard' ? ` (${v.quality})` : ''} · ${v.lang}`
  const bestInstalled = voices[0]?.quality ?? 'standard'
  return (
    <>
      <select
        className="select"
        value={uri}
        onChange={(e) => {
          const v = e.target.value || null
          setUri(e.target.value)
          setPreferredVoice(v)
          void setSetting('voiceURI', v)
        }}
      >
        <option value="">Automatic (best installed)</option>
        {voices.map((v) => (
          <option key={v.uri} value={v.uri}>
            {label(v)}
          </option>
        ))}
      </select>
      <div className="btn-row left">
        <button type="button" onClick={() => void speak('Bishop to c4. It eyes f7 and develops with tempo. Castle next, then push d4.')}>
          Test voice
        </button>
      </div>
      {bestInstalled === 'standard' && (
        <p className="muted small">
          These are the only voices Apple lets web apps use; Siri and downloaded Premium voices are not available here.
          Recorded narration for the opening lessons uses a separate, natural voice when it is installed.
        </p>
      )}
    </>
  )
}

function Toggle({ label, hint, settingKey, fallback }: { label: string; hint: string; settingKey: string; fallback: boolean }) {
  const [on, setOn] = useState(fallback)
  useEffect(() => {
    getSetting<boolean>(settingKey, fallback).then(setOn)
  }, [settingKey, fallback])
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        <span className="muted small">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked)
          void setSetting(settingKey, e.target.checked)
        }}
      />
    </label>
  )
}

interface Props {
  profile: Profile
  onReload: () => void
}

export default function SettingsScreen({ profile, onReload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const doExport = async () => {
    const json = await exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chesscoach-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setMsg('Backup exported.')
  }

  const doImport = async (file: File) => {
    if (!window.confirm('Importing replaces everything currently in the app. Continue?')) return
    try {
      const { games } = await importBackup(await file.text())
      setMsg(`Imported ${games} games.`)
      onReload()
    } catch (e) {
      setMsg('Import failed: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const doReset = async () => {
    if (!window.confirm('Delete all games and reset your rating? This cannot be undone.')) return
    await resetAll()
    setMsg('Everything reset.')
    onReload()
  }

  return (
    <div className="screen">
      <h2>Settings</h2>
      <section className="card">
        <h3>Profile</h3>
        <p>
          Rating <strong>{profile.rating}</strong> · {profile.gamesPlayed} games · peak {profile.peakRating}
        </p>
      </section>
      <section className="card">
        <h3>During play</h3>
        <Toggle
          label="Move feedback"
          hint="Brilliant, Great, Mistake, Blunder badges on your moves, judged by the engine as you play."
          settingKey="moveFeedback"
          fallback
        />
        <Toggle label="Sounds" hint="Move clicks and a short chime or thud with each badge." settingKey="sounds" fallback />
        <Toggle label="Commentary" hint="A sentence about every move under the board." settingKey="commentary" fallback={false} />
      </section>
      <section className="card">
        <h3>Narration voice</h3>
        <VoicePicker />
      </section>
      <section className="card">
        <h3>Backup</h3>
        <p className="muted small">
          Everything lives on this device. Export a backup now and then, especially before iOS updates.
        </p>
        <div className="btn-row">
          <button type="button" className="primary" onClick={() => void doExport()}>Export backup</button>
          <button type="button" onClick={() => fileRef.current?.click()}>Import backup</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>
      <section className="card">
        <h3>Danger zone</h3>
        <button type="button" className="danger" onClick={() => void doReset()}>Reset everything</button>
      </section>
      {msg && <p className="muted">{msg}</p>}
      <section className="card">
        <h3>App version</h3>
        <p className="muted small">Build {__BUILD__}</p>
        <button
          type="button"
          onClick={async () => {
            setMsg('Fetching the latest version…')
            try {
              const regs = await navigator.serviceWorker?.getRegistrations()
              for (const r of regs ?? []) await r.unregister()
              const keys = await caches.keys()
              for (const k of keys) await caches.delete(k)
            } catch {
              /* ignore */
            }
            window.location.reload()
          }}
        >
          Reload latest version
        </button>
      </section>
      <p className="muted small">
        Engine: Stockfish 19 (lite, single-thread) under GPLv3. Board: chessground. Rules: chess.js.
      </p>
    </div>
  )
}

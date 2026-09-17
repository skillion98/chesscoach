import { useRef, useState } from 'react'
import { exportBackup, importBackup, resetAll, type Profile } from '../lib/db'

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
      <p className="muted small">
        Engine: Stockfish 19 (lite, single-thread) under GPLv3. Board: chessground. Rules: chess.js.
      </p>
    </div>
  )
}

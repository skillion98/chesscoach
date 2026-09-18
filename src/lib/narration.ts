// Recorded narration clips (generated once with a neural voice) with the device voice as fallback.

import { readingMs, speak, speechAvailable, stopSpeech } from './speech'

interface ManifestEntry {
  file: string
  seconds: number
}

let manifest: Record<string, ManifestEntry> | null = null
let loading: Promise<void> | null = null
let current: HTMLAudioElement | null = null

export function loadNarration(): Promise<void> {
  if (manifest) return Promise.resolve()
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, ManifestEntry>>) : {}))
      .then((m) => {
        manifest = m
      })
      .catch(() => {
        manifest = {}
      })
  }
  return loading
}

export function hasClip(key: string): boolean {
  return !!manifest && key in manifest
}

/** True once a recorded voice is available for at least one lesson. */
export function narrationInstalled(): boolean {
  return !!manifest && Object.keys(manifest).length > 0
}

export function stopNarration(): void {
  if (current) {
    current.pause()
    current.src = ''
    current = null
  }
  stopSpeech()
}

/**
 * Say something: the recorded clip when one exists for `key`, otherwise the device voice,
 * otherwise (or when muted) just wait roughly as long as reading it would take.
 */
export async function narrate(text: string, key: string | undefined, muted: boolean): Promise<void> {
  await loadNarration()
  stopNarration()
  if (muted) {
    await new Promise((r) => setTimeout(r, readingMs(text)))
    return
  }
  const entry = key && manifest ? manifest[key] : undefined
  if (entry) {
    await new Promise<void>((resolve) => {
      const a = new Audio(`${import.meta.env.BASE_URL}audio/${entry.file}`)
      current = a
      const done = () => {
        if (current === a) current = null
        resolve()
      }
      a.onended = done
      a.onerror = () => {
        // fall back to the device voice if the file is missing
        if (current === a) current = null
        void speak(text).then(resolve)
      }
      a.play().catch(() => {
        if (current === a) current = null
        void speak(text).then(resolve)
      })
    })
    return
  }
  if (speechAvailable()) await speak(text)
  else await new Promise((r) => setTimeout(r, readingMs(text)))
}

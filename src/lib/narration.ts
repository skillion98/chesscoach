// Narration with three sources, best available first:
//   1. recorded clips generated once for fixed lesson text (public/audio + manifest)
//   2. the natural on-device voice (Kokoro in the browser), when the user enabled it
//   3. the device's built-in speech voice
// Dynamic text (coach recaps) skips 1.

import { db, getSetting } from './db'
import { localTtsReady, localVoiceDisabled, loadLocalTts, synthesizeLocal, threadsAvailable, webgpuAvailable } from './localTts'
import { speakable } from './speakable'
import { readingMs, speak, speechAvailable, stopSpeech } from './speech'

interface ManifestEntry {
  file: string
  seconds: number
}

let manifest: Record<string, ManifestEntry> | null = null
let loading: Promise<void> | null = null
let current: HTMLAudioElement | null = null
let currentUrl: string | null = null

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

export function narrationInstalled(): boolean {
  return !!manifest && Object.keys(manifest).length > 0
}

export function stopNarration(): void {
  if (current) {
    current.pause()
    current.src = ''
    current = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
  stopSpeech()
}

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const a = new Audio(url)
    current = a
    a.onended = () => {
      if (current === a) current = null
      resolve(true)
    }
    a.onerror = () => {
      if (current === a) current = null
      resolve(false)
    }
    a.play().catch(() => {
      if (current === a) current = null
      resolve(false)
    })
  })
}

async function localVoiceEnabled(): Promise<{ on: boolean; voice: string }> {
  const on = await getSetting<boolean>('localVoice', false)
  const voice = await getSetting<string>('localVoiceId', 'af_heart')
  return { on, voice }
}

async function cachedSynthesis(text: string, voice: string): Promise<Blob> {
  const key = `tts:${voice}:${hashText(text)}`
  const row = await db.settings.get(key)
  if (row && row.value instanceof Blob) return row.value
  const blob = await synthesizeLocal(speakable(text), voice)
  await db.settings.put({ key, value: blob })
  return blob
}

function hashText(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

/** Synthesize and cache dynamic text ahead of time (e.g. a recap right after analysis) without playing it. */
export async function prepareNarration(text: string): Promise<boolean> {
  const local = await localVoiceEnabled()
  if (!local.on || localVoiceDisabled()) return false
  try {
    await loadLocalTts()
    await cachedSynthesis(text, local.voice)
    return true
  } catch {
    return false
  }
}

/** Rough wait for synthesizing `text` on this device, in seconds. */
export function estimatePrepSeconds(text: string): number {
  const audioSecs = text.split(/\s+/).length / 2.6
  const threads = threadsAvailable()
  const speed = webgpuAvailable() && !isPhone() ? 3 : threads >= 4 ? 1.2 : threads > 1 ? 0.8 : 0.4 // audio seconds produced per second
  return Math.round(audioSecs / speed)
}

function isPhone(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1
}

/**
 * Say something. `key` selects a recorded clip when one exists; otherwise the natural
 * on-device voice if enabled, otherwise the built-in voice; muted just waits.
 */
export async function narrate(text: string, key: string | undefined, muted: boolean, onStatus?: (s: string) => void): Promise<void> {
  await loadNarration()
  stopNarration()
  if (muted) {
    await new Promise((r) => setTimeout(r, readingMs(text)))
    return
  }
  const entry = key && manifest ? manifest[key] : undefined
  if (entry) {
    const ok = await playUrl(`${import.meta.env.BASE_URL}audio/${entry.file}`)
    if (ok) return
  }
  const local = await localVoiceEnabled()
  if (local.on && !localVoiceDisabled()) {
    try {
      if (!localTtsReady()) onStatus?.('Loading the natural voice…')
      await loadLocalTts()
      const cachedKey = `tts:${local.voice}:${hashText(text)}`
      const already = await db.settings.get(cachedKey)
      if (!already) onStatus?.(`Preparing narration, about ${estimatePrepSeconds(text)} seconds…`)
      const blob = await cachedSynthesis(text, local.voice)
      onStatus?.('')
      currentUrl = URL.createObjectURL(blob)
      const ok = await playUrl(currentUrl)
      if (ok) return
    } catch {
      onStatus?.('')
    }
  }
  if (speechAvailable()) await speak(text)
  else await new Promise((r) => setTimeout(r, readingMs(text)))
}

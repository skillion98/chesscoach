// On-device narration via the Web Speech API. iOS needs the first call to come from a tap.
// Voice quality depends entirely on which voices are installed on the device; premium and
// enhanced voices are preferred automatically, and the user can pick one in Settings.

let preferredURI: string | null = null
let voice: SpeechSynthesisVoice | null = null
let current: SpeechSynthesisUtterance | null = null

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export interface VoiceOption {
  uri: string
  name: string
  lang: string
  quality: 'premium' | 'enhanced' | 'standard'
}

function qualityOf(v: SpeechSynthesisVoice): VoiceOption['quality'] {
  const n = v.name.toLowerCase()
  const id = v.voiceURI.toLowerCase()
  if (n.includes('premium') || id.includes('premium')) return 'premium'
  if (n.includes('enhanced') || id.includes('enhanced') || n.includes('neural') || n.includes('natural')) return 'enhanced'
  return 'standard'
}

const rank: Record<VoiceOption['quality'], number> = { premium: 0, enhanced: 1, standard: 2 }

/** English voices on this device, best quality first. */
export function listVoices(): VoiceOption[] {
  if (!speechAvailable()) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, quality: qualityOf(v) }))
    .sort((a, b) => rank[a.quality] - rank[b.quality] || a.name.localeCompare(b.name))
}

export function setPreferredVoice(uri: string | null): void {
  preferredURI = uri
  voice = null
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechAvailable()) return null
  if (voice) return voice
  const voices = window.speechSynthesis.getVoices()
  if (preferredURI) {
    const v = voices.find((x) => x.voiceURI === preferredURI)
    if (v) return (voice = v)
  }
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  const byQuality = [...english].sort((a, b) => rank[qualityOf(a)] - rank[qualityOf(b)])
  // among equal quality, prefer US/GB natural-sounding names
  const prefer = ['Ava', 'Zoe', 'Samantha', 'Evan', 'Nathan', 'Daniel', 'Karen', 'Moira', 'Serena', 'Aria', 'Jenny', 'Guy', 'Google US English']
  const top = byQuality.length ? byQuality.filter((v) => qualityOf(v) === qualityOf(byQuality[0])) : []
  for (const name of prefer) {
    const v = top.find((x) => x.name.includes(name))
    if (v) return (voice = v)
  }
  return (voice = top[0] ?? english.find((v) => v.localService) ?? english[0] ?? null)
}

if (speechAvailable()) {
  window.speechSynthesis.onvoiceschanged = () => {
    voice = null
    pickVoice()
  }
}

export function currentVoiceName(): string {
  return pickVoice()?.name ?? 'default'
}

/** Speak text; resolves when finished, cancelled, or if speech is unavailable. */
export function speak(text: string, rate = 0.95): Promise<void> {
  if (!speechAvailable()) return Promise.resolve()
  return new Promise((resolve) => {
    stopSpeech()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice()
    if (v) u.voice = v
    u.rate = rate
    u.pitch = 1
    u.onend = () => {
      if (current === u) current = null
      resolve()
    }
    u.onerror = () => {
      if (current === u) current = null
      resolve()
    }
    current = u
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeech(): void {
  if (!speechAvailable()) return
  current = null
  window.speechSynthesis.cancel()
}

/** Rough reading time for silent mode. */
export function readingMs(text: string): number {
  const words = text.split(/\s+/).length
  return Math.min(9000, Math.max(1500, words * 320))
}

// On-device narration via the Web Speech API. iOS needs the first call to come from a tap.

let voice: SpeechSynthesisVoice | null = null
let current: SpeechSynthesisUtterance | null = null

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechAvailable()) return null
  if (voice) return voice
  const voices = window.speechSynthesis.getVoices()
  const prefer = ['Samantha', 'Daniel', 'Karen', 'Moira', 'Google US English', 'Microsoft Aria', 'Microsoft Guy']
  for (const name of prefer) {
    const v = voices.find((x) => x.name.includes(name))
    if (v) return (voice = v)
  }
  const en = voices.find((x) => x.lang.startsWith('en') && x.localService) ?? voices.find((x) => x.lang.startsWith('en'))
  return (voice = en ?? null)
}

if (speechAvailable()) {
  window.speechSynthesis.onvoiceschanged = () => {
    voice = null
    pickVoice()
  }
}

/** Speak text; resolves when finished, cancelled, or if speech is unavailable. */
export function speak(text: string, rate = 1): Promise<void> {
  if (!speechAvailable()) return Promise.resolve()
  return new Promise((resolve) => {
    stopSpeech()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice()
    if (v) u.voice = v
    u.rate = rate
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

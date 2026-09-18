// Natural voice on the device: Kokoro (open-source, 82M params) running in the browser through
// transformers.js, on WebGPU when available, otherwise WebAssembly. Loaded only when enabled;
// the ~90 MB model downloads once and is cached by the browser.

export const LOCAL_VOICES: { id: string; label: string }[] = [
  { id: 'af_heart', label: 'Heart (American, female)' },
  { id: 'af_bella', label: 'Bella (American, female)' },
  { id: 'am_michael', label: 'Michael (American, male)' },
  { id: 'am_fenrir', label: 'Fenrir (American, male)' },
  { id: 'bf_emma', label: 'Emma (British, female)' },
  { id: 'bm_george', label: 'George (British, male)' },
]

type Kokoro = {
  generate: (text: string, opts: { voice: string; speed?: number }) => Promise<{ audio: Float32Array; sampling_rate: number }>
}

let engine: Kokoro | null = null
let loading: Promise<Kokoro> | null = null
let lastError: string | null = null

export function localTtsReady(): boolean {
  return engine !== null
}

export function localTtsError(): string | null {
  return lastError
}

/** Download size of the model the device will use. */
export function modelSizeMb(): number {
  const c = currentConfig()
  return c.dtype === 'fp32' ? 330 : c.dtype === 'fp16' ? 165 : 90
}

export function webgpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

export interface TtsConfig {
  device: 'webgpu' | 'wasm'
  dtype: 'fp32' | 'fp16' | 'q8'
  label: string
}

const LADDER: TtsConfig[] = [
  { device: 'webgpu', dtype: 'fp32', label: 'graphics chip, full precision (330 MB)' },
  { device: 'webgpu', dtype: 'fp16', label: 'graphics chip, half precision (165 MB)' },
  { device: 'wasm', dtype: 'q8', label: 'processor, compact model (90 MB)' },
]

/** Worker threads the CPU model can use: all cores once the page is cross-origin isolated, else one. */
export function threadsAvailable(): number {
  return typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated ? navigator.hardwareConcurrency || 2 : 1
}

const LOADING_KEY = 'ttsLoadInProgress'
const QUALITY_KEY = 'ttsQuality' // 'compact' | 'full'
const FULL_CRASHED_KEY = 'ttsFullCrashed'
const LEVEL_KEY = 'ttsLevel'
const DISABLED_KEY = 'ttsDisabled'

function isMobile(): boolean {
  return typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1)
}

function readLevel(): number {
  try {
    const v = localStorage.getItem(LEVEL_KEY)
    if (v !== null) return Number(v)
  } catch {
    /* ignore */
  }
  // phones start one step down: the full-precision model is too big for a Safari tab
  return isMobile() ? 1 : 0
}

// Crash guard: if a load was in progress when the page last died, step down a level.
try {
  if (localStorage.getItem(LOADING_KEY)) {
    const was = JSON.parse(localStorage.getItem(LOADING_KEY) || '{}')
    localStorage.removeItem(LOADING_KEY)
    if (was.device === 'wasm' && was.dtype === 'fp32') {
      localStorage.setItem(FULL_CRASHED_KEY, '1')
      localStorage.setItem(QUALITY_KEY, 'compact')
      throw new Error('handled')
    }
    const next = readLevel() + 1
    if (next >= LADDER.length) localStorage.setItem(DISABLED_KEY, '1')
    else localStorage.setItem(LEVEL_KEY, String(next))
  }
} catch {
  /* ignore */
}

/** The mode the device will use, after any crash step-downs. */
export function currentConfig(): TtsConfig {
  // phones: the full model crashes Safari and the half-precision one produces noise on its GPU,
  // so use the compact model on the CPU (multi-threaded once the page is cross-origin isolated)
  if (isMobile()) {
    return getQuality() === 'full'
      ? { device: 'wasm', dtype: 'fp32', label: 'processor, full model (330 MB)' }
      : LADDER[2]
  }
  const lvl = Math.min(LADDER.length - 1, Math.max(0, readLevel()))
  const c = LADDER[lvl]
  if (c.device === 'webgpu' && !webgpuAvailable()) return LADDER[2]
  return c
}

export type Quality = 'compact' | 'full'

export function getQuality(): Quality {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'full' ? 'full' : 'compact'
  } catch {
    return 'compact'
  }
}

export function setQuality(q: Quality): void {
  try {
    localStorage.setItem(QUALITY_KEY, q)
    if (q === 'full') localStorage.removeItem(FULL_CRASHED_KEY)
  } catch {
    /* ignore */
  }
  engine = null
  loading = null
}

/** True when the full model crashed on this phone and was switched back to compact. */
export function fullModelCrashed(): boolean {
  try {
    return localStorage.getItem(FULL_CRASHED_KEY) === '1'
  } catch {
    return false
  }
}

export function isPhoneDevice(): boolean {
  return isMobile()
}

/** True when every mode crashed on this device; the natural voice is then skipped. */
export function localVoiceDisabled(): boolean {
  try {
    return localStorage.getItem(DISABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function resetLocalVoice(): void {
  try {
    localStorage.removeItem(DISABLED_KEY)
    localStorage.removeItem(LEVEL_KEY)
    localStorage.removeItem(LOADING_KEY)
  } catch {
    /* ignore */
  }
  engine = null
  loading = null
}

/** Load (downloading on first use). Progress is 0..100. */
export function loadLocalTts(onProgress?: (pct: number, note: string) => void): Promise<Kokoro> {
  if (engine) return Promise.resolve(engine)
  if (loading) return loading
  lastError = null
  loading = (async () => {
    if (localVoiceDisabled()) throw new Error('The natural voice crashed on this device in every mode and is switched off.')
    const { KokoroTTS } = await import('kokoro-js')
    const { device, dtype } = currentConfig()
    try {
      localStorage.setItem(LOADING_KEY, JSON.stringify({ device, dtype, at: Date.now() }))
    } catch {
      /* ignore */
    }
    const files = new Map<string, { loaded: number; total: number }>()
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype,
      device,
      progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status === 'progress' && p.file && p.total) {
          files.set(p.file, { loaded: p.loaded ?? 0, total: p.total })
          let loaded = 0
          let total = 0
          for (const f of files.values()) {
            loaded += f.loaded
            total += f.total
          }
          onProgress?.(Math.round((loaded / total) * 100), `Downloading voice model (${Math.round(loaded / 1e6)} of ${Math.round(total / 1e6)} MB)`)
        } else if (p.status === 'ready') {
          onProgress?.(100, 'Ready')
        }
      },
    })
    engine = tts as unknown as Kokoro
    try {
      localStorage.removeItem(LOADING_KEY)
    } catch {
      /* ignore */
    }
    return engine
  })().catch((e) => {
    loading = null
    try {
      localStorage.removeItem(LOADING_KEY)
    } catch {
      /* ignore */
    }
    lastError = e instanceof Error ? e.message : String(e)
    throw e
  })
  return loading
}

function wavBlob(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  let o = 44
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

/** Synthesize text (split into sentences so long recaps work) into one WAV blob. */
export async function synthesizeLocal(text: string, voice: string, speed = 1): Promise<Blob> {
  const tts = await loadLocalTts()
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text]
  // group short sentences so each request is a comfortable length
  const chunks: string[] = []
  let cur = ''
  for (const s of sentences) {
    if ((cur + ' ' + s).length > 260 && cur) {
      chunks.push(cur)
      cur = s
    } else cur = cur ? cur + ' ' + s : s
  }
  if (cur) chunks.push(cur)
  const parts: Float32Array[] = []
  let rate = 24000
  for (const c of chunks) {
    const a = await tts.generate(c, { voice, speed })
    rate = a.sampling_rate
    parts.push(a.audio)
    parts.push(new Float32Array(Math.round(rate * 0.25))) // short pause between chunks
  }
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Float32Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return wavBlob(out, rate)
}

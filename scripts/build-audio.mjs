// Generates recorded narration for every opening course and writes
// public/audio/<clips> plus public/audio/manifest.json.
//
//   node scripts/build-audio.mjs --engine openai  [--voice ash]      needs OPENAI_API_KEY
//   node scripts/build-audio.mjs --engine gemini  [--voice Kore]     needs GEMINI_API_KEY (+ ffmpeg)
//   node scripts/build-audio.mjs --engine kokoro  [--voice af_heart] free, local (npm i -D kokoro-js, + ffmpeg)
//
// Keys are read from the environment or from .env.local (gitignored) in the project root.
// Clips whose text has not changed since the last run (same engine and voice) are skipped.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// .env.local -> process.env (never printed)
const envFile = join(root, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? args[i + 1] : def
}
const ENGINE = opt('engine', process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : 'kokoro')
const VOICE = opt('voice', ENGINE === 'openai' ? 'ash' : ENGINE === 'gemini' ? 'Kore' : 'af_heart')
const FFMPEG = opt('ffmpeg', process.env.FFMPEG || 'ffmpeg')
const ONLY = opt('only', null)
const SPEED = Number(opt('speed', '1.0'))
const LIMIT = Number(opt('limit', '0'))

const OUT = join(root, 'public', 'audio')
mkdirSync(OUT, { recursive: true })
const manifestPath = join(OUT, 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}

const { COURSES } = await import('../src/data/courses.ts')
const { speakable } = await import('../src/lib/speakable.ts')

const clips = new Map()
clips.set('common/drill', 'That is the line. Now drill it: play the moves yourself.')
for (const c of COURSES) {
  if (ONLY && c.slug !== ONLY) continue
  clips.set(`${c.slug}/intro`, c.intro)
  c.chapters.forEach((ch, i) => {
    clips.set(`${c.slug}/${i}/intro`, ch.intro)
    for (const [ply, note] of ch.notes) clips.set(`${c.slug}/${i}/${ply}`, note)
  })
}

const hash = (s) => createHash('sha1').update(`${ENGINE}|${VOICE}|${SPEED}|${s}`).digest('hex').slice(0, 12)
let todo = [...clips].filter(([key, text]) => !manifest[key] || manifest[key].hash !== hash(text))
if (LIMIT > 0) todo = todo.slice(0, LIMIT)
const totalChars = todo.reduce((a, [, t]) => a + t.length, 0)
console.log(`${clips.size} clips, ${todo.length} to generate with ${ENGINE}/${VOICE} (${totalChars} characters)`)
if (todo.length === 0) process.exit(0)

const INSTRUCTIONS =
  'You are a warm, calm chess coach narrating a lesson to an adult student. Speak clearly and unhurriedly, with natural pauses at commas and periods. Read chess squares like "e four" and pieces by name.'

// ---- engines: each returns { bytes: Buffer, ext: string, seconds: number|null } ----
async function openai(text) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'mp3', speed: SPEED }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`)
  return { bytes: Buffer.from(await r.arrayBuffer()), ext: 'mp3', seconds: null }
}

async function gemini(text) {
  const model = 'gemini-2.5-flash-preview-tts'
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Read this as a warm, calm chess coach, unhurried: ${text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
    }),
  })
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const j = await r.json()
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
  if (!part) throw new Error('Gemini returned no audio')
  const pcm = Buffer.from(part.inlineData.data, 'base64') // 24 kHz 16-bit mono PCM
  const tmp = join(OUT, '_tmp.pcm')
  const out = join(OUT, '_tmp.m4a')
  writeFileSync(tmp, pcm)
  const res = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmp, '-c:a', 'aac', '-b:a', '48k', out])
  if (res.status !== 0) throw new Error('ffmpeg failed: ' + res.stderr?.toString().slice(-200))
  const bytes = readFileSync(out)
  unlinkSync(tmp)
  unlinkSync(out)
  return { bytes, ext: 'm4a', seconds: Math.round((pcm.length / 2 / 24000) * 10) / 10 }
}

let kokoroTts = null
async function kokoro(text) {
  if (!kokoroTts) {
    const { KokoroTTS } = await import('kokoro-js')
    kokoroTts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
  }
  const audio = await kokoroTts.generate(text, { voice: VOICE, speed: SPEED })
  const wav = join(OUT, '_tmp.wav')
  const out = join(OUT, '_tmp.m4a')
  await audio.save(wav)
  const res = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-c:a', 'aac', '-b:a', '48k', out])
  if (res.status !== 0) throw new Error('ffmpeg failed: ' + res.stderr?.toString().slice(-200))
  const bytes = readFileSync(out)
  unlinkSync(wav)
  unlinkSync(out)
  return { bytes, ext: 'm4a', seconds: Math.round((audio.audio.length / audio.sampling_rate) * 10) / 10 }
}

const engines = { openai, gemini, kokoro }
const gen = engines[ENGINE]
if (!gen) throw new Error('unknown engine ' + ENGINE)
if (ENGINE === 'openai' && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing (put it in .env.local)')
if (ENGINE === 'gemini' && !process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing (put it in .env.local)')

let n = 0
for (const [key, text] of todo) {
  const t0 = Date.now()
  let result
  for (let attempt = 1; ; attempt++) {
    try {
      result = await gen(speakable(text))
      break
    } catch (e) {
      if (attempt >= 3) throw e
      console.warn(`retry ${attempt} for ${key}: ${e.message.slice(0, 120)}`)
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  const file = key.replace(/\//g, '_') + '.' + result.ext
  // remove a stale file with another extension from a previous engine
  for (const ext of ['mp3', 'm4a']) {
    const old = join(OUT, key.replace(/\//g, '_') + '.' + ext)
    if (ext !== result.ext && existsSync(old)) unlinkSync(old)
  }
  writeFileSync(join(OUT, file), result.bytes)
  manifest[key] = { file, seconds: result.seconds ?? Math.round((text.split(/\s+/).length / 2.6) * 10) / 10, hash: hash(text), engine: ENGINE, voice: VOICE }
  n++
  if (n % 5 === 0 || n === todo.length) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
    console.log(`${n}/${todo.length}  ${key}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
console.log('done')

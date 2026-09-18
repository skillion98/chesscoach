// Local collector for browser-side narration generation (GPU via WebGPU in the preview browser).
// Receives WAV clips from the page, encodes them to m4a, and maintains public/audio/manifest.json.
//
//   node scripts/collect-audio.mjs --ffmpeg path/to/ffmpeg.exe [--out dir]   (listens on http://localhost:5199)
//   Use --out outside the project while the dev server runs: Vite reloads the page when public/ changes.
// Then in the app's dev page run scripts/generate-in-browser.js (see that file).

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? args[i + 1] : def
}
const FFMPEG = opt('ffmpeg', process.env.FFMPEG || 'ffmpeg')
const PORT = Number(opt('port', '5199'))

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = opt('out', join(root, 'public', 'audio'))
mkdirSync(OUT, { recursive: true })
const manifestPath = join(OUT, 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}

const hash = (engine, voice, speed, text) => createHash('sha1').update(`${engine}|${voice}|${speed}|${text}`).digest('hex').slice(0, 12)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
let saved = 0
createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    return res.end()
  }
  if (req.method === 'GET' && req.url === '/manifest') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(manifest))
  }
  if (req.method === 'POST' && req.url === '/clip') {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const { key, text, voice, engine, speed, wavBase64, seconds } = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        const base = key.replace(/\//g, '_')
        const wav = join(OUT, base + '.wav')
        const m4a = join(OUT, base + '.m4a')
        writeFileSync(wav, Buffer.from(wavBase64, 'base64'))
        const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-c:a', 'aac', '-b:a', '48k', m4a])
        unlinkSync(wav)
        if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr?.toString().slice(-200))
        const mp3 = join(OUT, base + '.mp3')
        if (existsSync(mp3)) unlinkSync(mp3)
        manifest[key] = { file: base + '.m4a', seconds, hash: hash(engine, voice, speed, text), engine, voice }
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
        saved++
        if (saved % 10 === 0) console.log(`${saved} clips saved (${Object.keys(manifest).length} in manifest)`)
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, total: Object.keys(manifest).length }))
      } catch (e) {
        res.writeHead(500, { ...cors, 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }
  res.writeHead(404, cors)
  res.end()
}).listen(PORT, () => console.log(`collector on http://localhost:${PORT}, ${Object.keys(manifest).length} clips already in manifest`))

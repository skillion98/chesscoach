// Paste into the dev page's console (or run via the preview tool) while scripts/collect-audio.mjs
// is listening. Synthesizes every lesson clip with the in-app Kokoro voice on WebGPU and posts
// each one to the collector. Progress: window.__genStatus
;(async () => {
  const VOICE = window.__genVoice || 'af_heart'
  const SPEED = 1
  const { COURSES } = await import('/chesscoach/src/data/courses.ts')
  const { speakable } = await import('/chesscoach/src/lib/speakable.ts')
  const { loadLocalTts } = await import('/chesscoach/src/lib/localTts.ts')
  const clips = new Map()
  clips.set('common/drill', 'That is the line. Now drill it: play the moves yourself.')
  for (const c of COURSES) {
    clips.set(`${c.slug}/intro`, c.intro)
    c.chapters.forEach((ch, i) => {
      clips.set(`${c.slug}/${i}/intro`, ch.intro)
      for (const [ply, note] of ch.notes) clips.set(`${c.slug}/${i}/${ply}`, note)
    })
  }
  const enc = new TextEncoder()
  const sha1 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-1', enc.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
  const manifest = await (await fetch('http://localhost:5199/manifest')).json()
  const todo = []
  for (const [key, text] of clips) {
    const h = await sha1(`kokoro|${VOICE}|${SPEED}|${text}`)
    if (!manifest[key] || manifest[key].hash !== h) todo.push([key, text])
  }
  window.__genStatus = { total: clips.size, todo: todo.length, done: 0, key: '', errors: 0 }
  const tts = await loadLocalTts()
  const toWav = (samples, rate) => {
    const buf = new ArrayBuffer(44 + samples.length * 2)
    const v = new DataView(buf)
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true)
    let o = 44
    for (let i = 0; i < samples.length; i++, o += 2) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true) }
    return buf
  }
  const b64 = (buf) => { let s = ''; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s) }
  for (const [key, text] of todo) {
    window.__genStatus.key = key
    try {
      const a = await tts.generate(speakable(text), { voice: VOICE, speed: SPEED })
      const wav = toWav(a.audio, a.sampling_rate)
      const r = await fetch('http://localhost:5199/clip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, text, voice: VOICE, engine: 'kokoro', speed: SPEED, seconds: Math.round((a.audio.length / a.sampling_rate) * 10) / 10, wavBase64: b64(wav) }) })
      if (!r.ok) throw new Error('collector ' + r.status)
    } catch (e) {
      window.__genStatus.errors++
      console.warn('clip failed', key, e)
    }
    window.__genStatus.done++
  }
  window.__genStatus.key = 'finished'
})()

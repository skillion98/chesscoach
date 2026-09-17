// Builds compact puzzle sets from the Lichess puzzle database (CC0).
// Usage: node scripts/build-puzzles.mjs <lichess_db_puzzle.csv.zst>
// Output: public/data/puzzles/<band>.json as [[id, fen, moves, rating, themes], ...]
//
// The Lichess dump is written by pzstd: a sequence of [skippable frame][zstd frame] pairs,
// where the skippable frame's 4-byte payload is the size of the zstd frame that follows.
// Node's streaming decoder rejects skippable frames, so we walk the frames by hand.
import { closeSync, mkdirSync, openSync, readSync, statSync, writeFileSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

const src = process.argv[2]
if (!src) {
  console.error('usage: node scripts/build-puzzles.mjs <csv.zst>')
  process.exit(1)
}

const BANDS = [800, 1000, 1200, 1400, 1600, 1800, 2000] // band = lower bound, width 200
const PER_BAND = 4500
const MIN_POPULARITY = 85
const MIN_PLAYS = 800

let seed = 20260917
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

const reservoirs = new Map(BANDS.map((b) => [b, { seen: 0, items: [] }]))

function bandOf(rating) {
  for (let i = BANDS.length - 1; i >= 0; i--) if (rating >= BANDS[i]) return rating < BANDS[i] + 200 ? BANDS[i] : null
  return null
}

let lines = 0
let kept = 0
function handleLine(line) {
  lines++
  if (lines === 1) return // header
  const cols = line.split(',')
  if (cols.length < 8) return
  const [id, fen, moves, ratingS, , popS, playsS, themes] = cols
  const rating = Number(ratingS)
  if (Number(popS) < MIN_POPULARITY || Number(playsS) < MIN_PLAYS) return
  const band = bandOf(rating)
  if (band === null) return
  const r = reservoirs.get(band)
  r.seen++
  const item = [id, fen, moves, rating, themes]
  if (r.items.length < PER_BAND) r.items.push(item)
  else {
    const j = Math.floor(rand() * r.seen)
    if (j < PER_BAND) r.items[j] = item
  }
  kept++
}

const fd = openSync(src, 'r')
const size = statSync(src).size
let offset = 0
let carry = ''
let frames = 0
const head = Buffer.alloc(8)
while (offset < size) {
  readSync(fd, head, 0, 8, offset)
  const magic = head.readUInt32LE(0)
  let frameLen
  if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
    const skipLen = head.readUInt32LE(4)
    if (skipLen === 4) {
      const payload = Buffer.alloc(4)
      readSync(fd, payload, 0, 4, offset + 8)
      frameLen = payload.readUInt32LE(0)
      offset += 8 + skipLen
    } else {
      offset += 8 + skipLen
      continue
    }
  } else if (magic === 0xfd2fb528) {
    // a bare zstd frame with no size hint: read to the end (single-frame file)
    frameLen = size - offset
  } else {
    throw new Error(`unexpected magic ${magic.toString(16)} at ${offset}`)
  }
  const buf = Buffer.alloc(frameLen)
  readSync(fd, buf, 0, frameLen, offset)
  offset += frameLen
  const text = carry + zstdDecompressSync(buf).toString('utf8')
  const parts = text.split('\n')
  carry = parts.pop() ?? ''
  for (const l of parts) handleLine(l)
  frames++
  if (frames % 10 === 0) process.stderr.write(`\r${frames} frames, ${lines} lines`)
}
if (carry.trim()) handleLine(carry)
closeSync(fd)
process.stderr.write('\n')

mkdirSync('public/data/puzzles', { recursive: true })
let total = 0
for (const [band, r] of reservoirs) {
  r.items.sort((a, b) => a[3] - b[3])
  writeFileSync(`public/data/puzzles/${band}.json`, JSON.stringify(r.items))
  total += r.items.length
  console.log(`band ${band}: ${r.items.length} of ${r.seen} candidates`)
}
console.log(`read ${lines} lines in ${frames} frames, ${kept} passed quality filter, wrote ${total} puzzles`)

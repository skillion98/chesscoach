// Converts the lichess-org/chess-openings TSV files (CC0) into a compact JSON catalog.
// Usage: node scripts/build-eco.mjs <dir-with-a.tsv..e.tsv>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('usage: node scripts/build-eco.mjs <dir>')
  process.exit(1)
}
const rows = []
for (const v of ['a', 'b', 'c', 'd', 'e']) {
  const text = readFileSync(join(dir, `${v}.tsv`), 'utf8')
  for (const line of text.split('\n').slice(1)) {
    if (!line.trim()) continue
    const [eco, name, pgn] = line.split('\t')
    // strip move numbers: "1. e4 e5 2. Nf3" -> "e4 e5 Nf3"
    const sans = pgn
      .split(/\s+/)
      .filter((t) => t && !/^\d+\.(\.\.)?$/.test(t))
      .join(' ')
    rows.push([eco, name, sans])
  }
}
rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[2].length - b[2].length))
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/eco.json', JSON.stringify(rows))
console.log(`wrote ${rows.length} openings to src/data/eco.json`)

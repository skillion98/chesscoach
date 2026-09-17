// Thin promise wrapper around the Stockfish WASM worker (UCI protocol).
// Commands are serialized: one search at a time.

export interface PvLine {
  multipv: number
  /** centipawns from the side-to-move perspective; mate scores folded in as +-(10000 - n) */
  cp: number
  mate: number | null
  move: string
  pv: string[]
  depth: number
}

export interface SearchResult {
  bestMove: string
  lines: PvLine[]
}

export interface SearchOptions {
  movetime?: number
  depth?: number
  multipv?: number
}

type Listener = (line: string) => void

export class Engine {
  private worker: Worker
  private listeners: Listener[] = []
  private chain: Promise<unknown> = Promise.resolve()
  private initialized: Promise<void>
  private searching = false

  constructor(url: string = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`) {
    this.worker = new Worker(url)
    this.worker.onmessage = (e: MessageEvent) => {
      const line = String(e.data)
      for (const l of [...this.listeners]) l(line)
    }
    this.initialized = this.exec(['uci'], (l) => l === 'uciok')
      .then(() => this.exec(['isready'], (l) => l === 'readyok'))
      .then(() => undefined)
  }

  private exec(cmds: string[], done: (line: string) => boolean): Promise<string[]> {
    const p = this.chain.then(
      () =>
        new Promise<string[]>((resolve) => {
          const out: string[] = []
          const listener: Listener = (line) => {
            out.push(line)
            if (done(line)) {
              this.listeners = this.listeners.filter((x) => x !== listener)
              resolve(out)
            }
          }
          this.listeners.push(listener)
          for (const c of cmds) this.worker.postMessage(c)
        }),
    )
    this.chain = p.catch(() => undefined)
    return p
  }

  whenReady(): Promise<void> {
    return this.initialized
  }

  async setOptions(opts: Record<string, string | number | boolean>): Promise<void> {
    await this.initialized
    const cmds = Object.entries(opts).map(([k, v]) => `setoption name ${k} value ${v}`)
    await this.exec([...cmds, 'isready'], (l) => l === 'readyok')
  }

  async newGame(): Promise<void> {
    await this.initialized
    await this.exec(['ucinewgame', 'isready'], (l) => l === 'readyok')
  }

  async search(fen: string, opts: SearchOptions = {}): Promise<SearchResult> {
    await this.initialized
    const multipv = Math.max(1, opts.multipv ?? 1)
    const go = opts.depth ? `go depth ${opts.depth}` : `go movetime ${opts.movetime ?? 500}`
    this.searching = true
    const lines = await this.exec(
      [`setoption name MultiPV value ${multipv}`, `position fen ${fen}`, go],
      (l) => l.startsWith('bestmove'),
    )
    this.searching = false
    return parseSearch(lines)
  }

  /** Interrupt the current search (its promise still resolves with the bestmove Stockfish reports). */
  stop(): void {
    if (this.searching) this.worker.postMessage('stop')
  }

  terminate(): void {
    this.worker.terminate()
  }
}

export function parseSearch(lines: string[]): SearchResult {
  const byPv = new Map<number, PvLine>()
  let bestMove = ''
  for (const line of lines) {
    if (line.startsWith('bestmove')) {
      bestMove = line.split(/\s+/)[1] ?? ''
      continue
    }
    if (!line.startsWith('info') || !line.includes(' pv ')) continue
    if (/\b(lowerbound|upperbound)\b/.test(line)) continue
    const mpv = Number(/multipv (\d+)/.exec(line)?.[1] ?? 1)
    const depth = Number(/depth (\d+)/.exec(line)?.[1] ?? 0)
    const score = /score (cp|mate) (-?\d+)/.exec(line)
    if (!score) continue
    const pv = (/ pv (.+)$/.exec(line)?.[1] ?? '').trim().split(/\s+/)
    let cp: number
    let mate: number | null = null
    if (score[1] === 'mate') {
      mate = Number(score[2])
      cp = mate > 0 ? 10000 - mate : -10000 - mate
    } else {
      cp = Number(score[2])
    }
    const prev = byPv.get(mpv)
    if (!prev || depth >= prev.depth) byPv.set(mpv, { multipv: mpv, cp, mate, move: pv[0], pv, depth })
  }
  const result = [...byPv.values()].sort((a, b) => a.multipv - b.multipv)
  if (!bestMove && result[0]) bestMove = result[0].move
  return { bestMove, lines: result }
}

let shared: Engine | null = null
/** One engine instance for the whole app (the WASM takes a moment to boot). */
export function getEngine(): Engine {
  if (!shared) shared = new Engine()
  return shared
}

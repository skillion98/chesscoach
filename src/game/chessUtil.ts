import type { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import type { Result } from '../lib/db'

export interface Status {
  over: boolean
  result: Result
  termination: string
}

export function computeDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  for (const m of chess.moves({ verbose: true })) {
    const arr = dests.get(m.from as Key) ?? []
    arr.push(m.to as Key)
    dests.set(m.from as Key, arr)
  }
  return dests
}

export function legalUci(chess: Chess): string[] {
  return chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''))
}

export function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined }
}

export function isPromotion(chess: Chess, from: string, to: string): boolean {
  return chess.moves({ verbose: true }).some((m) => m.from === from && m.to === to && !!m.promotion)
}

export function gameStatus(chess: Chess): Status {
  if (chess.isCheckmate()) {
    return { over: true, result: chess.turn() === 'w' ? '0-1' : '1-0', termination: 'Checkmate' }
  }
  if (chess.isStalemate()) return { over: true, result: '1/2-1/2', termination: 'Stalemate' }
  if (chess.isInsufficientMaterial()) return { over: true, result: '1/2-1/2', termination: 'Insufficient material' }
  if (chess.isThreefoldRepetition()) return { over: true, result: '1/2-1/2', termination: 'Threefold repetition' }
  if (chess.isDraw()) return { over: true, result: '1/2-1/2', termination: 'Draw' }
  return { over: false, result: '*', termination: '' }
}

export function cgColor(c: 'w' | 'b'): 'white' | 'black' {
  return c === 'w' ? 'white' : 'black'
}

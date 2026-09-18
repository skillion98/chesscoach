// Turn chess notation in lesson text into words a voice can read naturally.
// "Nxf7+" -> "knight takes f7 check", "O-O" -> "castles kingside", "1...e5" -> "e5".

const PIECE: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' }

export function speakable(text: string): string {
  return (
    text
      .replace(/\bO-O-O\b/g, 'castles queenside')
      .replace(/\bO-O\b/g, 'castles kingside')
      // move numbers like "1." or "1..." before a move
      .replace(/\b\d+\.(\.\.)?\s*(?=[KQRBNa-h])/g, '')
      // piece moves: Nf3, Bxf7+, Qd8#, R1e1, Nbd7
      .replace(/\b([KQRBN])([a-h1-8])?(x)?([a-h][1-8])(=[QRBN])?([+#])?/g, (_m, p, disamb, x, sq, promo, suffix) => {
        let s = PIECE[p]
        if (disamb) s += ` on ${disamb}`
        s += x ? ` takes ${sq}` : ` to ${sq}`
        if (promo) s += `, promoting to a ${PIECE[promo[1]]}`
        if (suffix === '+') s += ', check'
        if (suffix === '#') s += ', checkmate'
        return s
      })
      // pawn captures: exd5, cxd4+
      .replace(/\b([a-h])x([a-h][1-8])(=[QRBN])?([+#])?/g, (_m, from, sq, promo, suffix) => {
        let s = `${from} takes ${sq}`
        if (promo) s += `, promoting to a ${PIECE[promo[1]]}`
        if (suffix === '+') s += ', check'
        if (suffix === '#') s += ', checkmate'
        return s
      })
      // bare pawn moves with check/mate marks
      .replace(/\b([a-h][1-8])([+#])/g, (_m, sq, suffix) => `${sq}${suffix === '+' ? ', check' : ', checkmate'}`)
      // squares read as "e four" rather than "e4" run together
      .replace(/\b([a-h])([1-8])\b/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

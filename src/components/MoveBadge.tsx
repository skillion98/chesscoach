import { JUDGMENT_META, type Judgment } from '../analysis/judge'

interface Props {
  square: string
  orientation: 'white' | 'black'
  judgment: Judgment
  /** re-triggers the pop animation */
  nonce?: number
}

/** Chess.com-style badge pinned to the top-right corner of a square. */
export default function MoveBadge({ square, orientation, judgment, nonce }: Props) {
  const f = 'abcdefgh'.indexOf(square[0])
  const r = Number(square[1])
  const col = orientation === 'white' ? f : 7 - f
  const row = orientation === 'white' ? 8 - r : r - 1
  const meta = JUDGMENT_META[judgment]
  return (
    <span
      key={nonce}
      className={'move-badge j-' + judgment}
      style={{ left: `calc(${(col + 1) * 12.5}% - 14px)`, top: `calc(${row * 12.5}% - 8px)`, background: meta.color }}
      title={meta.word}
      aria-label={meta.word}
    >
      {meta.symbol}
    </span>
  )
}

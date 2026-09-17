interface Props {
  hue: number
  glyph: string
  size?: number
  className?: string
}

/** Flat circular portrait: a hue-tinted disc with a piece glyph. */
export default function Avatar({ hue, glyph, size = 56, className }: Props) {
  return (
    <span
      className={'avatar' + (className ? ' ' + className : '')}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.56,
        background: `radial-gradient(circle at 35% 30%, hsl(${hue} 55% 62%), hsl(${hue} 45% 30%) 75%)`,
      }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  )
}

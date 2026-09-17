export type IconName =
  | 'play'
  | 'history'
  | 'puzzle'
  | 'book'
  | 'search'
  | 'coach'
  | 'gear'
  | 'lock'
  | 'bulb'
  | 'trophy'
  | 'flag'
  | 'sound'
  | 'mute'
  | 'pause'
  | 'restart'
  | 'check'
  | 'target'
  | 'video'
  | 'comment'
  | 'undo'

const PATHS: Record<IconName, string> = {
  play: 'M8 5v14l11-7z',
  history: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4.5h4.5M12 8v4l3 2',
  puzzle: 'M5 8h3.5a2 2 0 1 1 4 0H16v3.5a2 2 0 1 1 0 4V19h-3.5a2 2 0 1 1-4 0H5v-3.5a2 2 0 1 0 0-4z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13M9 7h6',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20',
  coach: 'M2 9l10-5 10 5-10 5zM6 11.5V16c0 2 12 2 12 0v-4.5M22 9v5',
  gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.4 1 2.5h6c0-1.1.3-1.9 1-2.5A6 6 0 0 0 12 3z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M9 17h6',
  flag: 'M6 21V4M6 4h10l-2 4 2 4H6',
  sound: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 10v4h4l5 4V6L8 10zM16 9l5 6M21 9l-5 6',
  pause: 'M8 5v14M16 5v14',
  restart: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4.5h4.5',
  check: 'M5 12l5 5L20 7',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3z',
  comment: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  undo: 'M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-3',
}

const FILLED: Partial<Record<IconName, boolean>> = { play: true, pause: true }

interface Props {
  name: IconName
  size?: number
  className?: string
}

export default function Icon({ name, size = 28, className }: Props) {
  const filled = !!FILLED[name]
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'play' ? 0 : name === 'pause' ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} fill={filled && name === 'play' ? 'currentColor' : 'none'} />
    </svg>
  )
}

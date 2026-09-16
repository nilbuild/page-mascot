import type { CSSProperties } from 'react'

const paths: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v5h16v-5',
  shuffle: 'M3 5h3l12 14h3 M17 15l4 4-4 4 M3 19h3l4-5 M14 9l4-4h3 M17 1l4 4-4 4',
  undo: 'M3 10h11a6 6 0 0 1 0 12 M3 10l6-6 M3 10l6 6',
  flip: 'M12 3v18 M8 6L2 18h6z M16 6l6 12h-6z',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12 M6 18L18 6',
  folder: 'M3 6h7l2 3h9v12H3z',
  plus: 'M12 5v14 M5 12h14',
  code: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',
  copy: 'M8 8h13v13H8z M16 8V3H3v13h5',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  cursor: 'M4 3l6 18 3-8 8-3z',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  save: 'M5 3h12l4 4v14H3V3z M8 3v6h8V3 M7 21v-8h10v8',
  chevron: 'M8 5l7 7-7 7',
  image: 'M3 3h18v18H3z M3 17l6-7 5 5 3-3 4 5 M16 7h.01',
}
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: string
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d={paths[name] ?? paths.plus} />
    </svg>
  )
}

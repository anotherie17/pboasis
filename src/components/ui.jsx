// Avatar + ikon SVG (no emoji). Semua ikon pakai stroke currentColor.

const GRADIENTS = [
  ['#9fd0ff', '#5aa0f0'],
  ['#a8f0d0', '#4ec79a'],
  ['#ffc7b0', '#f0855f'],
  ['#d3c4ff', '#8a73e8'],
  ['#ffd9a8', '#f0b15f'],
  ['#b0e0ff', '#5fbdf0'],
]

export function Avatar({ name = '?', size = 40, fontSize }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const [a, b] = GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length]
  return (
    <div className="av" style={{
      width: size, height: size,
      background: `linear-gradient(135deg, ${a}, ${b})`,
      fontSize: fontSize || Math.round(size * 0.36),
    }}>{initials}</div>
  )
}

const P = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9',
  plus: 'M12 5v14M5 12h14',
  grid: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
  wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 11h4M16 11a1.5 1.5 0 0 0 0 3h4',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
  back: 'M15 18l-6-6 6-6',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-4-4',
  user: 'M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM18 8v6M21 11h-6',
  calendar: 'M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM5 9h14M8 3v3M16 3v3',
  shuttle: 'M12 3l3 9-3 9-3-9zM9 12h6',
}

export function Icon({ name, size = 22, stroke = 2, style, fill }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={P[name] || ''} />
    </svg>
  )
}

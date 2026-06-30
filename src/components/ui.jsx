// Avatar + ikon SVG (no emoji) + Overlay (bottom sheet via portal) + CurrencyInput.
import { createPortal } from 'react-dom'

const GRADIENTS = [
  ['#9fd0ff', '#5aa0f0'],
  ['#a8f0d0', '#4ec79a'],
  ['#ffc7b0', '#f0855f'],
  ['#d3c4ff', '#8a73e8'],
  ['#ffd9a8', '#f0b15f'],
  ['#b0e0ff', '#5fbdf0'],
]

export function Avatar({ name = '?', size = 40, fontSize }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const [a, b] = GRADIENTS[((name || '?').charCodeAt(0) || 0) % GRADIENTS.length]
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
  logout: 'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  flag: 'M4 21V4M4 4h12l-2 4 2 4H4',
  chevron: 'M9 6l6 6-6 6',
}

export function Icon({ name, size = 22, stroke = 2, style, fill }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={P[name] || ''} />
    </svg>
  )
}

// Bottom sheet. Dirender lewat portal ke <body> supaya SELALU full-screen &
// di atas segalanya (memperbaiki tombol yang ketutup bar browser di HP).
export function Overlay({ children, onClose, noScroll }) {
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,12,32,0.62)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="fade-in"
        style={{ width: '100%', maxWidth: 430, maxHeight: '88dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(165deg,#0b2154,#0a1838)', borderTopLeftRadius: 28, borderTopRightRadius: 28, border: '1px solid var(--glass-border)', borderBottom: 'none' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '10px auto 4px', flexShrink: 0 }} />
        {children}
      </div>
    </div>,
    document.body
  )
}

// Input nominal rupiah dengan format ribuan otomatis (mis. 12.000).
// value = string angka ("12000"); onChange mengembalikan string angka tanpa titik.
export function CurrencyInput({ value, onChange, placeholder = '0' }) {
  const display = value ? Number(value).toLocaleString('id-ID') : ''
  return (
    <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, overflow: 'hidden' }}>
      <span style={{ padding: '14px 12px', color: 'var(--t-3)', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)' }}>Rp</span>
      <input type="text" inputMode="numeric" value={display}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        style={{ flex: 1, padding: '14px 14px 14px 2px', border: 'none', background: 'transparent', fontSize: 15, color: '#fff', fontWeight: 500 }} />
    </div>
  )
}

// Credit halus (dipakai di Login & Beranda).
export function Credit({ style }) {
  return (
    <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--t-3)', letterSpacing: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...style }}>
      <Icon name="shuttle" size={12} stroke={1.8} />
      Developed by <span style={{ color: 'var(--t-2)', fontWeight: 700 }}>@ri.rie_</span>
    </p>
  )
}

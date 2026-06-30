import { useState } from 'react'
import { Icon } from '../components/ui'
import TabHadir from './TabHadir'
import TabGame from './TabGame'
import TabIuran from './TabIuran'
import TabRekap from './TabRekap'

const TABS = [
  { key: 'hadir', label: 'Hadir', icon: 'user' },
  { key: 'game', label: 'Game', icon: 'grid' },
  { key: 'iuran', label: 'Iuran', icon: 'wallet' },
  { key: 'rekap', label: 'Rekap', icon: 'file' },
]

export default function SesiWorkspace({ sesi, onExit }) {
  const [tab, setTab] = useState('hadir')

  return (
    <>
      <div className="glass" style={{ position: 'relative', zIndex: 2, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <button onClick={onExit} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <Icon name="back" size={18} />
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sesi.name || 'Sesi'}</p>
          <p style={{ fontSize: 11, color: 'var(--t-3)' }}>
            {new Date(sesi.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      <div className="scroll" key={tab}>
        {tab === 'hadir' && <TabHadir sesi={sesi} />}
        {tab === 'game' && <TabGame sesi={sesi} />}
        {tab === 'iuran' && <TabIuran sesi={sesi} />}
        {tab === 'rekap' && <TabRekap sesi={sesi} />}
      </div>

      <div className="tabbar glass">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={20} stroke={tab === t.key ? 2.2 : 1.9} />
            <span className="lb">{t.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

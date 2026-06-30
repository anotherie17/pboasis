import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui'
import { rupiah } from '../lib/iuran'
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

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,12,32,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="fade-in"
        style={{ width: '100%', maxWidth: 430, maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(165deg,#0b2154,#0a1838)', borderTopLeftRadius: 28, borderTopRightRadius: 28, border: '1px solid var(--glass-border)', borderBottom: 'none', padding: '10px 18px calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '6px auto 14px' }} />
        {children}
      </div>
    </div>
  )
}

function RupiahInput({ value, onChange }) {
  return (
    <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, overflow: 'hidden' }}>
      <span style={{ padding: '14px 12px', color: 'var(--t-3)', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)' }}>Rp</span>
      <input type="number" min="0" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)}
        placeholder="0" style={{ flex: 1, padding: '14px 14px 14px 2px', border: 'none', background: 'transparent', fontSize: 15, color: '#fff', fontWeight: 500 }} />
    </div>
  )
}

function EditSesiSheet({ sesi, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState(sesi.name || '')
  const [date, setDate] = useState(sesi.date)
  const [cockPrice, setCockPrice] = useState(String(sesi.cock_price_per_piece ?? ''))
  const [courtFee, setCourtFee] = useState(String(sesi.court_fee_nonmember ?? ''))
  const [busy, setBusy] = useState(false)

  async function simpan() {
    if (!name.trim() || cockPrice === '' || courtFee === '') { alert('Isi semua field dulu ya.'); return }
    setBusy(true)
    const patch = { name: name.trim(), date, cock_price_per_piece: parseInt(cockPrice), court_fee_nonmember: parseInt(courtFee) }
    const { data, error } = await supabase.from('sessions').update(patch).eq('id', sesi.id).select().single()
    setBusy(false)
    if (error || !data) { alert('Gagal menyimpan. Coba lagi.'); return }
    onSaved(data)
  }

  async function hapus() {
    if (!confirm('Hapus sesi ini? SEMUA data hadir, game, dan iuran sesi ini akan ikut terhapus permanen.')) return
    if (!confirm('Yakin betul? Tindakan ini tidak bisa dibatalkan.')) return
    setBusy(true)
    // attendees, games, game_players ikut terhapus otomatis (ON DELETE CASCADE).
    const { error } = await supabase.from('sessions').delete().eq('id', sesi.id)
    setBusy(false)
    if (error) { alert('Gagal menghapus. Coba lagi.'); return }
    onDeleted()
  }

  return (
    <Overlay onClose={busy ? () => {} : onClose}>
      <h2 className="h2" style={{ color: '#fff', marginBottom: 14 }}>Edit sesi</h2>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nama sesi</label>
        <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Mabar Rabu" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tanggal main</label>
        <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Harga cock per biji</label>
        <RupiahInput value={cockPrice} onChange={setCockPrice} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tarif lapangan non-member</label>
        <RupiahInput value={courtFee} onChange={setCourtFee} />
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--t-3)', margin: '4px 2px 16px' }}>Ubah harga di sini langsung memperbarui hitungan iuran sesi.</p>

      <button className="cta" disabled={busy} onClick={simpan} style={{ marginBottom: 10 }}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
      <button className="btn-ghost" disabled={busy} onClick={hapus} style={{ color: 'var(--rose)', borderColor: 'rgba(255,140,140,0.3)' }}>
        <Icon name="trash" size={17} /> Hapus sesi
      </button>
    </Overlay>
  )
}

export default function SesiWorkspace({ sesi, onExit, onSesiUpdated }) {
  const [tab, setTab] = useState('hadir')
  const [editing, setEditing] = useState(false)

  return (
    <>
      <div className="glass" style={{ position: 'relative', zIndex: 2, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <button onClick={onExit} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <Icon name="back" size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sesi.name || 'Sesi'}</p>
          <p style={{ fontSize: 11, color: 'var(--t-3)' }}>
            {new Date(sesi.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button onClick={() => setEditing(true)} title="Edit sesi" style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-2)', flexShrink: 0 }}>
          <Icon name="edit" size={17} />
        </button>
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

      {editing && (
        <EditSesiSheet
          sesi={sesi}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { onSesiUpdated?.(updated); setEditing(false) }}
          onDeleted={() => { setEditing(false); onExit() }}
        />
      )}
    </>
  )
}

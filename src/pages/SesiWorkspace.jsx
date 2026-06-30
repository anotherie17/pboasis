import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon, Overlay, CurrencyInput } from '../components/ui'
import { useDialog } from '../components/Dialog'
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

function Lbl({ children }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</label>
}

function EditSesiSheet({ sesi, onClose, onSaved, onDeleted }) {
  const dlg = useDialog()
  const [name, setName] = useState(sesi.name || '')
  const [date, setDate] = useState(sesi.date)
  const [cockPrice, setCockPrice] = useState(String(sesi.cock_price_per_piece ?? ''))
  const [courtFee, setCourtFee] = useState(String(sesi.court_fee_nonmember ?? ''))
  const [busy, setBusy] = useState(false)
  const closed = !!sesi.closed

  async function simpan() {
    if (!name.trim() || cockPrice === '' || courtFee === '') { dlg.alert('Isi semua field dulu ya.'); return }
    setBusy(true)
    const patch = { name: name.trim(), date, cock_price_per_piece: parseInt(cockPrice), court_fee_nonmember: parseInt(courtFee) }
    const { data, error } = await supabase.from('sessions').update(patch).eq('id', sesi.id).select().single()
    setBusy(false)
    if (error || !data) { dlg.alert('Gagal menyimpan. Coba lagi.'); return }
    onSaved(data)
  }

  async function toggleSelesai() {
    setBusy(true)
    const { data, error } = await supabase.from('sessions').update({ closed: !closed }).eq('id', sesi.id).select().single()
    setBusy(false)
    if (error || !data) { dlg.alert('Gagal mengubah status. Coba lagi.'); return }
    onSaved(data)
  }

  async function hapus() {
    const ok1 = await dlg.confirm('Hapus sesi ini? SEMUA data hadir, game, dan iuran sesi ini akan ikut terhapus permanen.', { title: 'Hapus sesi', danger: true, okText: 'Lanjut' })
    if (!ok1) return
    const ok2 = await dlg.confirm('Yakin betul? Tindakan ini tidak bisa dibatalkan.', { title: 'Hapus sesi', danger: true, okText: 'Hapus' })
    if (!ok2) return
    setBusy(true)
    const { error } = await supabase.from('sessions').delete().eq('id', sesi.id)
    setBusy(false)
    if (error) { dlg.alert('Gagal menghapus. Coba lagi.'); return }
    onDeleted()
  }

  return (
    <Overlay onClose={busy ? () => {} : onClose}>
      <div style={{ padding: '4px 18px calc(24px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
        <h2 className="h2" style={{ color: '#fff', marginBottom: 14 }}>Edit sesi</h2>

        <div style={{ marginBottom: 14 }}><Lbl>Nama sesi</Lbl>
          <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Mabar Rabu" /></div>
        <div style={{ marginBottom: 14 }}><Lbl>Tanggal main</Lbl>
          <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} style={{ colorScheme: 'dark' }} /></div>
        <div style={{ marginBottom: 14 }}><Lbl>Harga cock per biji</Lbl>
          <CurrencyInput value={cockPrice} onChange={setCockPrice} /></div>
        <div style={{ marginBottom: 8 }}><Lbl>Tarif lapangan non-member</Lbl>
          <CurrencyInput value={courtFee} onChange={setCourtFee} /></div>
        <p style={{ fontSize: 11.5, color: 'var(--t-3)', margin: '4px 2px 16px' }}>Ubah harga di sini langsung memperbarui hitungan iuran sesi.</p>

        <button className="cta" disabled={busy} onClick={simpan} style={{ marginBottom: 10 }}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>

        <button className="btn-ghost" disabled={busy} onClick={toggleSelesai} style={{ marginBottom: 10 }}>
          <Icon name={closed ? 'clock' : 'flag'} size={17} /> {closed ? 'Aktifkan sesi lagi' : 'Tandai sesi selesai'}
        </button>

        <button className="btn-ghost" disabled={busy} onClick={hapus} style={{ color: 'var(--rose)', borderColor: 'rgba(255,140,140,0.3)' }}>
          <Icon name="trash" size={17} /> Hapus sesi
        </button>
      </div>
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
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sesi.name || 'Sesi'}{sesi.closed ? ' · Selesai' : ''}
          </p>
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

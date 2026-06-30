import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'
import { useDialog } from '../components/Dialog'

const todayIso = () => new Date().toISOString().split('T')[0]
const rapikan = s => s.trim().replace(/\s+/g, ' ')
const tglPendek = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
function rangeLabel(p) {
  if (p.ended_at) return `${tglPendek(p.started_at)} – ${tglPendek(p.ended_at)}`
  return `Mulai ${tglPendek(p.started_at)}`
}

function Switch({ on, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label="toggle"
      style={{ width: 48, height: 28, borderRadius: 20, background: on ? 'linear-gradient(135deg,#5aa0f0,#1368C8)' : 'rgba(255,255,255,0.12)', border: '1px solid var(--glass-border)', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .18s' }} />
    </button>
  )
}

export default function DaftarMember({ onBack }) {
  const dlg = useDialog()
  const [periods, setPeriods] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [sel, setSel] = useState(null)
  const [memberIds, setMemberIds] = useState(new Set())
  const [search, setSearch] = useState('')
  // form edit periode
  const [fLabel, setFLabel] = useState('')
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  // tambah pemain baru
  const [newName, setNewName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const addRef = useRef(null)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (showAdd) setTimeout(() => addRef.current?.focus(), 80) }, [showAdd])

  async function fetchAll() {
    setLoading(true)
    const [{ data: per }, { data: pl }] = await Promise.all([
      supabase.from('member_periods').select('id, period_number, label, started_at, ended_at, active, member_list(count)').order('started_at', { ascending: false }).order('period_number', { ascending: false }),
      supabase.from('players').select('id, name').order('name'),
    ])
    setPeriods((per || []).map(p => ({ ...p, count: p.member_list?.[0]?.count || 0 })))
    setPlayers(pl || [])
    setLoading(false)
  }

  function titleOf(p) { return p.label?.trim() || `Periode ${p.period_number}` }

  async function openPeriod(p) {
    setSel(p); setSearch(''); setShowAdd(false); setNewName('')
    setFLabel(p.label || ''); setFStart(p.started_at || todayIso()); setFEnd(p.ended_at || '')
    const { data: ml } = await supabase.from('member_list').select('player_id').eq('period_id', p.id)
    setMemberIds(new Set((ml || []).map(m => m.player_id)))
  }

  async function buatPeriode() {
    const ok = await dlg.confirm('Buat periode member baru? Bisa diatur nama & tanggalnya setelah dibuat.', { title: 'Periode baru', okText: 'Buat' })
    if (!ok) return
    setBusy(true)
    const next = (periods.reduce((m, p) => Math.max(m, p.period_number), 0)) + 1
    const { data, error } = await supabase.from('member_periods')
      .insert({ period_number: next, started_at: todayIso(), active: true }).select().single()
    setBusy(false)
    if (error || !data) { dlg.alert('Gagal membuat periode. Coba lagi.'); return }
    const p = { ...data, count: 0 }
    setPeriods(prev => [p, ...prev])
    openPeriod(p)
  }

  async function simpanInfo() {
    if (!fStart) { dlg.alert('Tanggal mulai harus diisi.'); return }
    if (fEnd && fEnd < fStart) { dlg.alert('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return }
    setBusy(true)
    const patch = { label: rapikan(fLabel) || null, started_at: fStart, ended_at: fEnd || null }
    const { data, error } = await supabase.from('member_periods').update(patch).eq('id', sel.id).select('id, period_number, label, started_at, ended_at, active').single()
    setBusy(false)
    if (error || !data) { dlg.alert('Gagal menyimpan. Coba lagi.'); return }
    const merged = { ...sel, ...data }
    setSel(merged)
    setPeriods(prev => prev.map(p => p.id === sel.id ? { ...p, ...data } : p).sort((a, b) => (b.started_at || '').localeCompare(a.started_at || '') || b.period_number - a.period_number))
    dlg.alert('Tersimpan.', { title: 'Periode' })
  }

  async function toggleAktif() {
    const v = !sel.active
    setSel(s => ({ ...s, active: v }))
    setPeriods(prev => prev.map(p => p.id === sel.id ? { ...p, active: v } : p))
    const { error } = await supabase.from('member_periods').update({ active: v }).eq('id', sel.id)
    if (error) {
      setSel(s => ({ ...s, active: !v }))
      setPeriods(prev => prev.map(p => p.id === sel.id ? { ...p, active: !v } : p))
      dlg.alert('Gagal mengubah status. Coba lagi.')
    }
  }

  async function hapusPeriode() {
    const ok = await dlg.confirm(`Hapus "${titleOf(sel)}"? Daftar membernya akan ikut terhapus.`, { title: 'Hapus periode', danger: true, okText: 'Hapus' })
    if (!ok) return
    setBusy(true)
    const { error } = await supabase.from('member_periods').delete().eq('id', sel.id)
    setBusy(false)
    if (error) { dlg.alert('Gagal menghapus. Coba lagi.'); return }
    setPeriods(prev => prev.filter(p => p.id !== sel.id))
    setSel(null)
  }

  async function toggleMember(playerId) {
    const isMember = memberIds.has(playerId)
    const next = new Set(memberIds)
    if (isMember) next.delete(playerId); else next.add(playerId)
    setMemberIds(next)
    setPeriods(prev => prev.map(p => p.id === sel.id ? { ...p, count: next.size } : p))
    let error
    if (isMember) ({ error } = await supabase.from('member_list').delete().eq('period_id', sel.id).eq('player_id', playerId))
    else ({ error } = await supabase.from('member_list').insert({ period_id: sel.id, player_id: playerId }))
    if (error) {
      const back = new Set(memberIds); setMemberIds(back)
      setPeriods(prev => prev.map(p => p.id === sel.id ? { ...p, count: back.size } : p))
      dlg.alert('Gagal menyimpan. Coba lagi.')
    }
  }

  async function tambahPemain() {
    const nama = rapikan(newName)
    if (!nama) return
    const dup = players.find(p => rapikan(p.name).toLowerCase() === nama.toLowerCase())
    if (dup) {
      dlg.alert(`Nama "${dup.name}" sudah ada. Tinggal centang di daftar bawah.`, { title: 'Nama sudah ada' })
      setNewName(''); setShowAdd(false); return
    }
    setBusy(true)
    const { data, error } = await supabase.from('players').insert({ name: nama }).select().single()
    if (error || !data) { setBusy(false); dlg.alert('Gagal menambah pemain.'); return }
    setPlayers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName(''); setShowAdd(false)
    // langsung jadikan member periode ini
    const { error: e2 } = await supabase.from('member_list').insert({ period_id: sel.id, player_id: data.id })
    setBusy(false)
    if (!e2) {
      const next = new Set(memberIds); next.add(data.id); setMemberIds(next)
      setPeriods(prev => prev.map(p => p.id === sel.id ? { ...p, count: next.size } : p))
    }
  }

  // ---------- LAYAR KELOLA SATU PERIODE ----------
  if (sel) {
    const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    return (
      <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
        <button className="btn-ghost" onClick={() => setSel(null)} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
          <Icon name="back" size={18} /> Semua periode
        </button>

        <div style={{ padding: '0 6px 14px' }}>
          <p className="eyebrow">Kelola periode</p>
          <h1 className="h1" style={{ marginTop: 4 }}>{titleOf(sel)}</h1>
        </div>

        {/* SETELAN PERIODE */}
        <div className="glass" style={{ borderRadius: 20, padding: 18, marginBottom: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nama periode</label>
            <input className="field" value={fLabel} onChange={e => setFLabel(e.target.value)} placeholder={`Periode ${sel.period_number}`} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Mulai</label>
              <input type="date" className="field" value={fStart} onChange={e => setFStart(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Selesai</label>
              <input type="date" className="field" value={fEnd} onChange={e => setFEnd(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--t-3)', marginBottom: 14 }}>Kosongkan "Selesai" kalau belum tahu kapan periode berakhir.</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', marginBottom: 14 }}>
            <div style={{ minWidth: 0, paddingRight: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Aktif</p>
              <p style={{ fontSize: 11.5, color: 'var(--t-3)' }}>Kalau aktif, member periode ini otomatis kepakai pas check-in (sesuai rentang tanggal).</p>
            </div>
            <Switch on={!!sel.active} onClick={toggleAktif} disabled={busy} />
          </div>

          <button className="cta" disabled={busy} onClick={simpanInfo}>{busy ? 'Menyimpan…' : 'Simpan setelan'}</button>
        </div>

        {/* MEMBER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 4px 10px' }}>
          <p className="section-label">Member · {memberIds.size}</p>
        </div>

        {showAdd ? (
          <div className="glass" style={{ borderRadius: 18, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Tambah pemain baru (langsung jadi member)</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={addRef} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && tambahPemain()}
                placeholder="Nama lengkap..." className="field" style={{ flex: 1 }} />
              <button className="cta" onClick={tambahPemain} disabled={busy || !newName.trim()} style={{ width: 'auto', padding: '0 18px' }}>{busy ? '...' : 'Add'}</button>
            </div>
            <button onClick={() => { setShowAdd(false); setNewName('') }} style={{ marginTop: 10, fontSize: 13, color: 'var(--t-3)' }}>Batal</button>
          </div>
        ) : (
          <button className="glass" onClick={() => setShowAdd(true)}
            style={{ width: '100%', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#bdd8ff', fontSize: 14, fontWeight: 600, marginBottom: 12, textAlign: 'left' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(90,160,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="plus" size={17} /></span>
            Tambah pemain baru
          </button>
        )}

        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon name="search" size={18} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama..." style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 15 }} />
        </div>

        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 18 }}>
          {filtered.map((p, i) => {
            const on = memberIds.has(p.id)
            return (
              <button key={p.id} onClick={() => toggleMember(p.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: on ? 'rgba(90,160,255,0.14)' : 'transparent', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', textAlign: 'left' }}>
                <Avatar name={p.name} size={38} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: on ? 600 : 500, color: on ? '#fff' : 'var(--t-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'linear-gradient(135deg,#5aa0f0,#1368C8)' : 'rgba(255,255,255,0.08)', border: on ? 'none' : '1px solid var(--glass-border)', color: '#fff' }}>
                  {on && <Icon name="check" size={15} stroke={2.5} />}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Tidak ada pemain.</p>}
        </div>

        <button className="btn-ghost" disabled={busy} onClick={hapusPeriode} style={{ color: 'var(--rose)', borderColor: 'rgba(255,140,140,0.3)' }}>
          <Icon name="trash" size={17} /> Hapus periode ini
        </button>
      </div>
    )
  }

  // ---------- LAYAR DAFTAR PERIODE ----------
  return (
    <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
        <Icon name="back" size={18} /> Beranda
      </button>

      <div style={{ padding: '0 6px 18px' }}>
        <p className="eyebrow">Member</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Periode member</h1>
        <p style={{ fontSize: 12.5, color: 'var(--t-2)', marginTop: 8, lineHeight: 1.5 }}>
          Tiap periode = satu batch member (mis. 4x main). Atur nama, tanggal, & member-nya. Periode yang "Aktif" otomatis kepakai pas check-in sesuai rentang tanggalnya.
        </p>
      </div>

      <button className="cta" onClick={buatPeriode} disabled={busy} style={{ marginBottom: 18 }}>
        <Icon name="plus" size={18} /> {busy ? 'Membuat…' : 'Periode baru'}
      </button>

      {loading ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Memuat...</p>
      ) : periods.length === 0 ? (
        <div className="glass" style={{ borderRadius: 20, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t-2)' }}>Belum ada periode. Buat periode pertama buat mulai nandain member.</p>
        </div>
      ) : (
        <>
          <p className="section-label" style={{ margin: '0 6px 12px' }}>Semua periode · {periods.length}</p>
          {periods.map(p => (
            <button key={p.id} onClick={() => openPeriod(p)} className="glass"
              style={{ width: '100%', borderRadius: 20, padding: '15px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', opacity: p.active ? 1 : 0.62 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: p.active ? 'linear-gradient(135deg,#5aa0f0,#1368C8)' : 'rgba(255,255,255,0.08)', border: p.active ? 'none' : '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.active ? '#fff' : 'var(--t-2)', flexShrink: 0 }}>
                <Icon name="folder" size={21} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleOf(p)}</span>
                  {p.active && <span className="tag tag-live" style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0 }}>● Aktif</span>}
                </span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--t-3)', marginTop: 2 }}>{rangeLabel(p)} · {p.count} member</span>
              </span>
              <Icon name="chevron" size={18} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
            </button>
          ))}
        </>
      )}
    </div>
  )
}

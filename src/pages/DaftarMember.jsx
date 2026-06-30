import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'
import { useDialog } from '../components/Dialog'

const todayIso = () => new Date().toISOString().split('T')[0]
const tglPendek = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function DaftarMember({ onBack }) {
  const dlg = useDialog()
  const [periods, setPeriods] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Layar kelola satu periode (folder)
  const [sel, setSel] = useState(null)              // periode yang dibuka
  const [memberIds, setMemberIds] = useState(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: per }, { data: pl }] = await Promise.all([
      supabase.from('member_periods').select('id, period_number, started_at, member_list(count)').order('started_at', { ascending: false }).order('period_number', { ascending: false }),
      supabase.from('players').select('id, name').order('name'),
    ])
    setPeriods((per || []).map(p => ({ id: p.id, period_number: p.period_number, started_at: p.started_at, count: p.member_list?.[0]?.count || 0 })))
    setPlayers(pl || [])
    setLoading(false)
  }

  async function openPeriod(p) {
    setSel(p); setSearch('')
    const { data: ml } = await supabase.from('member_list').select('player_id').eq('period_id', p.id)
    setMemberIds(new Set((ml || []).map(m => m.player_id)))
  }

  async function mulaiPeriode() {
    const ok = await dlg.confirm('Buat periode member baru mulai hari ini? Periode sebelumnya tetap tersimpan.', { title: 'Periode baru', okText: 'Buat' })
    if (!ok) return
    setBusy(true)
    const next = (periods.reduce((m, p) => Math.max(m, p.period_number), 0)) + 1
    const { data, error } = await supabase.from('member_periods')
      .insert({ period_number: next, started_at: todayIso() }).select().single()
    setBusy(false)
    if (error || !data) { dlg.alert('Gagal membuat periode. Coba lagi.'); return }
    const p = { id: data.id, period_number: data.period_number, started_at: data.started_at, count: 0 }
    setPeriods(prev => [p, ...prev])
    openPeriod(p)
  }

  async function hapusPeriode() {
    if (!sel) return
    const ok = await dlg.confirm(`Hapus Periode ${sel.period_number} (mulai ${tglPendek(sel.started_at)})? Daftar membernya akan ikut terhapus.`, { title: 'Hapus periode', danger: true, okText: 'Hapus' })
    if (!ok) return
    setBusy(true)
    const { error } = await supabase.from('member_periods').delete().eq('id', sel.id)
    setBusy(false)
    if (error) { dlg.alert('Gagal menghapus. Coba lagi.'); return }
    setPeriods(prev => prev.filter(p => p.id !== sel.id))
    setSel(null)
  }

  async function toggle(playerId) {
    if (!sel) return
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

  // ---------- LAYAR KELOLA SATU PERIODE ----------
  if (sel) {
    const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    return (
      <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
        <button className="btn-ghost" onClick={() => setSel(null)} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
          <Icon name="back" size={18} /> Semua periode
        </button>

        <div style={{ padding: '0 6px 14px' }}>
          <p className="eyebrow">Kelola member</p>
          <h1 className="h1" style={{ marginTop: 4 }}>Periode {sel.period_number}</h1>
          <p style={{ fontSize: 12.5, color: 'var(--t-2)', marginTop: 6 }}>Mulai {tglPendek(sel.started_at)} · {memberIds.size} member</p>
        </div>

        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="search" size={18} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama..."
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 15 }} />
        </div>

        <p className="section-label" style={{ margin: '6px 6px 10px' }}>Tap buat tandai member · {filtered.length}</p>
        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
          {filtered.map((p, i) => {
            const on = memberIds.has(p.id)
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
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

        <button className="btn-ghost" disabled={busy} onClick={hapusPeriode} style={{ marginTop: 18, color: 'var(--rose)', borderColor: 'rgba(255,140,140,0.3)' }}>
          <Icon name="trash" size={17} /> Hapus periode ini
        </button>
      </div>
    )
  }

  // ---------- LAYAR DAFTAR PERIODE (FOLDER) ----------
  return (
    <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
        <Icon name="back" size={18} /> Beranda
      </button>

      <div style={{ padding: '0 6px 18px' }}>
        <p className="eyebrow">Member</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Periode member</h1>
        <p style={{ fontSize: 12.5, color: 'var(--t-2)', marginTop: 8, lineHeight: 1.5 }}>
          Tiap periode = satu "batch" member (mis. 4x main). Buat periode baru tiap mulai batch baru. Pas mabar, member dari periode teraktif otomatis dapat badge & gratis lapangan.
        </p>
      </div>

      <button className="cta" onClick={mulaiPeriode} disabled={busy} style={{ marginBottom: 18 }}>
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
          {periods.map((p, i) => (
            <button key={p.id} onClick={() => openPeriod(p)} className="glass"
              style={{ width: '100%', borderRadius: 20, padding: '15px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left' }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: i === 0 ? 'linear-gradient(135deg,#5aa0f0,#1368C8)' : 'rgba(255,255,255,0.08)', border: i === 0 ? 'none' : '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? '#fff' : 'var(--t-2)', flexShrink: 0 }}>
                <Icon name="folder" size={21} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Periode {p.period_number}</span>
                  {i === 0 && <span className="tag tag-live" style={{ fontSize: 10, padding: '3px 8px' }}>● Aktif</span>}
                </span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--t-3)', marginTop: 2 }}>Mulai {tglPendek(p.started_at)} · {p.count} member</span>
              </span>
              <Icon name="chevron" size={18} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
            </button>
          ))}
        </>
      )}
    </div>
  )
}

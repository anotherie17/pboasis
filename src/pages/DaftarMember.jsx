import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'
import { namaBulan } from '../lib/iuran'

const monthKey = iso => (iso || '').slice(0, 7) // "2026-06"
const todayIso = () => new Date().toISOString().split('T')[0]

export default function DaftarMember({ onBack }) {
  const [period, setPeriod] = useState(null)
  const [players, setPlayers] = useState([])
  const [memberIds, setMemberIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: per }, { data: pl }] = await Promise.all([
      // "Periode aktif" = yang paling baru. Urut started_at lalu period_number
      // supaya pasti (tidak bergantung pada urutan acak saat tanggalnya seri).
      supabase.from('member_periods').select('*').order('started_at', { ascending: false }).order('period_number', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('players').select('id, name').order('name'),
    ])
    setPlayers(pl || [])
    setPeriod(per || null)
    if (per) {
      const { data: ml } = await supabase.from('member_list').select('player_id').eq('period_id', per.id)
      setMemberIds(new Set((ml || []).map(m => m.player_id)))
    } else {
      setMemberIds(new Set())
    }
    setLoading(false)
  }

  async function mulaiBulanBaru() {
    // Sudah ada daftar untuk bulan ini? Jangan bikin baru — pakai yang ada.
    if (period && monthKey(period.started_at) === monthKey(todayIso())) {
      alert(`Daftar member ${namaBulan(period.started_at)} sudah ada. Tinggal centang namanya di bawah.`)
      return
    }
    if (!confirm(`Mulai daftar member baru untuk ${namaBulan(todayIso())}? Daftar bulan sebelumnya tetap tersimpan.`)) return
    setBusy(true)
    const { data: last } = await supabase.from('member_periods').select('period_number').order('period_number', { ascending: false }).limit(1).maybeSingle()
    const next = (last?.period_number || 0) + 1
    const { data, error } = await supabase.from('member_periods')
      .insert({ period_number: next, started_at: todayIso() })
      .select().single()
    if (!error) { setPeriod(data); setMemberIds(new Set()) }
    else alert('Gagal membuat daftar baru. Coba lagi.')
    setBusy(false)
  }

  async function toggle(playerId) {
    if (!period) return
    const isMember = memberIds.has(playerId)
    const next = new Set(memberIds)
    if (isMember) {
      next.delete(playerId); setMemberIds(next)
      const { error } = await supabase.from('member_list').delete().eq('period_id', period.id).eq('player_id', playerId)
      if (error) { next.add(playerId); setMemberIds(new Set(next)); alert('Gagal menyimpan. Coba lagi.') }
    } else {
      next.add(playerId); setMemberIds(next)
      const { error } = await supabase.from('member_list').insert({ period_id: period.id, player_id: playerId })
      if (error) { next.delete(playerId); setMemberIds(new Set(next)); alert('Gagal menyimpan. Coba lagi.') }
    }
  }

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const labelBulan = period ? `Member ${namaBulan(period.started_at)}` : null
  const bulanIniSudahAda = period && monthKey(period.started_at) === monthKey(todayIso())

  return (
    <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
        <Icon name="back" size={18} /> Beranda
      </button>

      <div style={{ padding: '0 6px 18px' }}>
        <p className="eyebrow">Member bulanan</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Daftar member</h1>
        <p style={{ fontSize: 12.5, color: 'var(--t-2)', marginTop: 8, lineHeight: 1.5 }}>
          Tandai siapa saja yang jadi member bulan ini. Pas mabar, member otomatis dapat badge & gratis biaya lapangan.
        </p>
      </div>

      {loading ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Memuat...</p>
      ) : !period ? (
        <div className="glass" style={{ borderRadius: 22, padding: 22, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t-2)', marginBottom: 16 }}>Belum ada daftar member. Mulai daftar bulan ini buat nandain siapa aja yang member.</p>
          <button className="cta" onClick={mulaiBulanBaru} disabled={busy}>{busy ? '...' : `Mulai daftar ${namaBulan(todayIso())}`}</button>
        </div>
      ) : (
        <>
          <div className="glass" style={{ borderRadius: 20, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{labelBulan}</p>
              <p style={{ fontSize: 12, color: 'var(--t-3)', marginTop: 1 }}>{memberIds.size} member{bulanIniSudahAda ? '' : ' · bulan lalu'}</p>
            </div>
            {!bulanIniSudahAda && (
              <button className="btn-ghost" onClick={mulaiBulanBaru} disabled={busy} style={{ width: 'auto', padding: '9px 13px', fontSize: 12.5, flexShrink: 0 }}>
                <Icon name="plus" size={15} /> Bulan ini
              </button>
            )}
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
        </>
      )}
    </div>
  )
}

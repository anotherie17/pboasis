import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'

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
      supabase.from('member_periods').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
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

  async function mulaiPeriode() {
    setBusy(true)
    const { data: last } = await supabase.from('member_periods').select('period_number').order('period_number', { ascending: false }).limit(1).maybeSingle()
    const next = (last?.period_number || 0) + 1
    const { data, error } = await supabase.from('member_periods')
      .insert({ period_number: next, started_at: new Date().toISOString().split('T')[0] })
      .select().single()
    if (!error) { setPeriod(data); setMemberIds(new Set()) }
    setBusy(false)
  }

  async function toggle(playerId) {
    if (!period) return
    const isMember = memberIds.has(playerId)
    const next = new Set(memberIds)
    if (isMember) { next.delete(playerId); await supabase.from('member_list').delete().eq('period_id', period.id).eq('player_id', playerId) }
    else { next.add(playerId); await supabase.from('member_list').insert({ period_id: period.id, player_id: playerId }) }
    setMemberIds(next)
  }

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const periodLabel = period ? `Periode ${period.period_number}` : null
  const periodDate = period ? new Date(period.started_at + 'T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : ''

  return (
    <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
        <Icon name="back" size={18} /> Beranda
      </button>

      <div style={{ padding: '0 6px 18px' }}>
        <p className="eyebrow">Member bulanan</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Daftar member</h1>
      </div>

      {loading ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Memuat...</p>
      ) : !period ? (
        <div className="glass" style={{ borderRadius: 22, padding: 22, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t-2)', marginBottom: 16 }}>Belum ada periode member. Mulai periode pertama buat nandain siapa aja yang member bulan ini.</p>
          <button className="cta" onClick={mulaiPeriode} disabled={busy}>{busy ? '...' : 'Mulai periode member'}</button>
        </div>
      ) : (
        <>
          <div className="glass" style={{ borderRadius: 20, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{periodLabel}</p>
              <p style={{ fontSize: 12, color: 'var(--t-3)', marginTop: 1, textTransform: 'capitalize' }}>{periodDate} · {memberIds.size} member</p>
            </div>
            <button className="btn-ghost" onClick={mulaiPeriode} disabled={busy} style={{ width: 'auto', padding: '9px 13px', fontSize: 12.5 }}>
              <Icon name="plus" size={15} /> Periode baru
            </button>
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

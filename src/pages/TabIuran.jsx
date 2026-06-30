import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'
import { hitungIuran, rupiah } from '../lib/iuran'

export default function TabIuran({ sesi }) {
  const [attendees, setAttendees] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: att }, { data: gms }] = await Promise.all([
      supabase.from('attendees').select('player_id, is_member_this_session, paid, players(name)').eq('session_id', sesi.id),
      supabase.from('games').select('id, cock_used, game_players(player_id)').eq('session_id', sesi.id),
    ])
    setAttendees((att || []).map(a => ({ player_id: a.player_id, name: a.players?.name || '—', is_member: a.is_member_this_session, paid: a.paid })))
    setGames((gms || []).map(g => ({ id: g.id, cock_used: g.cock_used, playerIds: (g.game_players || []).map(p => p.player_id) })))
    setLoading(false)
  }

  async function toggleBayar(playerId, paid) {
    const v = !paid
    setAttendees(prev => prev.map(a => a.player_id === playerId ? { ...a, paid: v } : a))
    const { error } = await supabase.from('attendees').update({ paid: v }).eq('session_id', sesi.id).eq('player_id', playerId)
    if (error) {
      // Kembalikan tampilan kalau gagal simpan ke server (mis. sinyal jelek).
      setAttendees(prev => prev.map(a => a.player_id === playerId ? { ...a, paid } : a))
      alert('Gagal menyimpan status bayar. Cek sinyal lalu coba lagi.')
    }
  }

  if (loading) return <p className="muted" style={{ padding: 30, textAlign: 'center' }}>Memuat...</p>
  const h = hitungIuran(sesi, attendees, games)

  return (
    <div className="fade-in" style={{ padding: '14px 16px 24px' }}>
      <div style={{ padding: '4px 4px 14px' }}>
        <h1 className="h1">Iuran</h1>
        <div className="glass" style={{ borderRadius: 18, padding: '14px 16px', marginTop: 14, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Total tagihan</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{rupiah(h.totalTagihan)}</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Terkumpul</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 20, fontWeight: 700, color: 'var(--mint)', marginTop: 2 }}>{rupiah(h.totalLunas)}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="shuttle" size={15} style={{ color: '#bdd8ff', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'var(--t-2)', lineHeight: 1.5 }}>
          Cock dibagi per game: tiap game biayanya dibagi 4 pemainnya. Tagihan = lapangan (non-member) + cock yang dia pakai.
        </p>
      </div>

      <p className="section-label" style={{ margin: '6px 4px 10px' }}>Pemain · {h.rows.length}</p>
      <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
        {h.rows.map((r, i) => (
          <div key={r.player_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: r.paid ? 'rgba(70,230,150,0.10)' : 'transparent', borderBottom: i < h.rows.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <Avatar name={r.name} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</p>
              <p style={{ fontSize: 11.5, color: 'var(--t-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.is_member ? 'Member' : 'Non'} · {r.gamesPlayed}g · {r.courtShare > 0 ? `lap ${rupiah(r.courtShare)} + ` : ''}cock {rupiah(r.cockShare)}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 5 }}>{rupiah(r.total)}</p>
              <button onClick={() => toggleBayar(r.player_id, r.paid)}
                style={{ padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 700, color: r.paid ? '#0a1838' : 'var(--t-2)', background: r.paid ? 'var(--mint)' : 'rgba(255,255,255,0.08)', border: r.paid ? 'none' : '1px solid var(--glass-border)' }}>
                {r.paid ? '✓ Lunas' : 'Belum'}
              </button>
            </div>
          </div>
        ))}
        {h.rows.length === 0 && <p className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 14 }}>Belum ada pemain.</p>}
      </div>

      {h.totalBelum > 0 && (
        <div className="glass" style={{ borderRadius: 16, padding: '13px 16px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>Sisa belum bayar</span>
          <span style={{ fontSize: 15, color: 'var(--rose)', fontWeight: 700 }}>{rupiah(h.totalBelum)}</span>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hitungIuran, rupiah } from '../lib/iuran'

function Avatar({ name, size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    ['#E8F0FE', '#1368C8'], ['#E6F4EA', '#137333'], ['#FCE8E6', '#C5221F'],
    ['#FEF3E2', '#B06000'], ['#F3E8FD', '#7B1FA2'], ['#E8F5E9', '#2E7D32'],
  ]
  const idx = name.charCodeAt(0) % colors.length
  const [bg, fg] = colors[idx]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '600', fontSize: '14px', flexShrink: 0,
    }}>{initials}</div>
  )
}

export default function Iuran({ sesi, onBack, onLanjut }) {
  const [attendees, setAttendees] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: att }, { data: gms }] = await Promise.all([
      supabase
        .from('attendees')
        .select('player_id, is_member_this_session, paid, players(id, name)')
        .eq('session_id', sesi.id),
      supabase
        .from('games')
        .select('id, cock_used, played_at, game_players(player_id)')
        .eq('session_id', sesi.id),
    ])
    setAttendees((att || []).map(a => ({
      player_id: a.player_id,
      name: a.players?.name || '—',
      is_member: a.is_member_this_session,
      paid: a.paid,
    })))
    setGames((gms || []).map(g => ({
      id: g.id, cock_used: g.cock_used, played_at: g.played_at,
      playerIds: (g.game_players || []).map(gp => gp.player_id),
    })))
    setLoading(false)
  }

  async function toggleBayar(playerId, paid) {
    const newVal = !paid
    setAttendees(prev => prev.map(a =>
      a.player_id === playerId ? { ...a, paid: newVal } : a
    ))
    await supabase.from('attendees')
      .update({ paid: newVal })
      .eq('session_id', sesi.id).eq('player_id', playerId)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--gray-400)' }}>Memuat...</p>
    </div>
  )

  const h = hitungIuran(sesi, attendees, games)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '18px 16px 18px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'var(--white)',
              width: '34px', height: '34px', borderRadius: '50%', fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>‹</button>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {sesi.name || 'Sesi'}
            </p>
            <h1 style={{ color: 'var(--white)', fontSize: '20px', fontWeight: '600', marginTop: '2px' }}>
              Iuran
            </h1>
          </div>
        </div>

        {/* Ringkasan uang */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginBottom: '2px' }}>Total tagihan</p>
            <p style={{ color: 'var(--white)', fontSize: '16px', fontWeight: '700' }}>{rupiah(h.totalTagihan)}</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginBottom: '2px' }}>Terkumpul</p>
            <p style={{ color: '#7EE2A8', fontSize: '16px', fontWeight: '700' }}>{rupiah(h.totalLunas)}</p>
          </div>
        </div>
      </div>

      {/* Info perhitungan cock */}
      <div style={{ margin: '12px', padding: '12px 14px', background: 'var(--blue-light)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ fontSize: '12px', color: 'var(--blue)', lineHeight: 1.6 }}>
          {h.totalCock} cock × {rupiah(h.cockPrice)} = <b>{rupiah(h.totalBiayaCock)}</b><br />
          dibagi {h.totalSlot} slot main → <b>{rupiah(Math.round(h.perSlot))}</b>/game per orang
        </p>
      </div>

      {/* Daftar pemain */}
      <p style={{
        padding: '6px 16px 8px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.6px',
        color: 'var(--gray-400)', textTransform: 'uppercase',
      }}>Pemain · {h.rows.length}</p>

      <div style={{ background: 'var(--white)' }}>
        {h.rows.map(r => (
          <div key={r.player_id} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
            background: r.paid ? 'var(--success-light)' : 'var(--white)',
            borderBottom: '1px solid var(--gray-100)',
          }}>
            <Avatar name={r.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontWeight: '600', color: 'var(--navy)', fontSize: '15px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{r.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '1px' }}>
                {r.is_member ? 'Member' : 'Non-member'} · {r.gamesPlayed} game
                {r.courtShare > 0
                  ? ` · lapangan ${rupiah(r.courtShare)} + cock ${rupiah(r.cockShare)}`
                  : ` · cock ${rupiah(r.cockShare)}`}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '15px', marginBottom: '4px' }}>
                {rupiah(r.total)}
              </p>
              <button onClick={() => toggleBayar(r.player_id, r.paid)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  border: `1.5px solid ${r.paid ? 'var(--success)' : 'var(--gray-200)'}`,
                  background: r.paid ? 'var(--success)' : 'var(--white)',
                  color: r.paid ? 'var(--white)' : 'var(--gray-400)',
                }}>
                {r.paid ? 'Lunas ✓' : 'Belum'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {h.rows.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>Belum ada pemain.</p>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px',
        background: 'var(--white)', borderTop: '1px solid var(--gray-100)',
        boxShadow: '0 -4px 16px rgba(3,30,83,0.08)',
      }}>
        {h.totalBelum > 0 && (
          <p style={{ fontSize: '13px', color: 'var(--gray-600)', textAlign: 'center', marginBottom: '8px' }}>
            Sisa belum bayar: <b style={{ color: 'var(--danger)' }}>{rupiah(h.totalBelum)}</b>
          </p>
        )}
        <button onClick={onLanjut}
          style={{
            width: '100%', padding: '15px', background: 'var(--navy)', color: 'var(--white)',
            borderRadius: 'var(--radius-sm)', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.2px',
          }}>
          Lihat Rekap →
        </button>
      </div>
    </div>
  )
}

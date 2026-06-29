import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Avatar({ name, size = 40, selectedNumber = null }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    ['#E8F0FE', '#1368C8'],
    ['#E6F4EA', '#137333'],
    ['#FCE8E6', '#C5221F'],
    ['#FEF3E2', '#B06000'],
    ['#F3E8FD', '#7B1FA2'],
    ['#E8F5E9', '#2E7D32'],
  ]
  const idx = name.charCodeAt(0) % colors.length
  const [bg, fg] = colors[idx]
  if (selectedNumber) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--blue)', color: 'var(--white)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '700', fontSize: '17px', flexShrink: 0,
      }}>{selectedNumber}</div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '600', fontSize: size > 36 ? '14px' : '12px', flexShrink: 0,
    }}>{initials}</div>
  )
}

// Format "X menit lalu" sederhana
function waktuLalu(iso) {
  if (!iso) return 'Belum main'
  const diffMs = Date.now() - new Date(iso).getTime()
  const menit = Math.floor(diffMs / 60000)
  if (menit < 1) return 'Baru aja'
  if (menit < 60) return `${menit} mnt lalu`
  const jam = Math.floor(menit / 60)
  return `${jam} jam lalu`
}

export default function CatatGame({ sesi, onBack, onLanjut }) {
  const [attendees, setAttendees] = useState([]) // {player_id, name, is_member}
  const [games, setGames] = useState([])         // {id, cock_used, played_at, playerIds:[]}
  const [selected, setSelected] = useState([])   // array of player_id (max 4, urut)
  const [cockOn, setCockOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [historyFor, setHistoryFor] = useState(null) // player_id atau null

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: att }, { data: gms }] = await Promise.all([
      supabase
        .from('attendees')
        .select('player_id, is_member_this_session, players(id, name)')
        .eq('session_id', sesi.id),
      supabase
        .from('games')
        .select('id, cock_used, played_at, game_players(player_id)')
        .eq('session_id', sesi.id)
        .order('played_at', { ascending: true }),
    ])

    const attMapped = (att || []).map(a => ({
      player_id: a.player_id,
      name: a.players?.name || '—',
      is_member: a.is_member_this_session,
    }))
    const gmsMapped = (gms || []).map(g => ({
      id: g.id,
      cock_used: g.cock_used,
      played_at: g.played_at,
      playerIds: (g.game_players || []).map(gp => gp.player_id),
    }))

    setAttendees(attMapped)
    setGames(gmsMapped)
    setLoading(false)
  }

  // Hitung statistik per pemain dari daftar games
  function statPemain(playerId) {
    let count = 0
    let lastPlayed = null
    for (const g of games) {
      if (g.playerIds.includes(playerId)) {
        count++
        if (!lastPlayed || new Date(g.played_at) > new Date(lastPlayed)) {
          lastPlayed = g.played_at
        }
      }
    }
    return { count, lastPlayed }
  }

  // Urutkan pemain: gabungan paling sedikit game + paling lama nunggu
  const ranked = attendees
    .map(p => {
      const s = statPemain(p.player_id)
      return { ...p, ...s }
    })
    .sort((a, b) => {
      // 1) game paling sedikit duluan
      if (a.count !== b.count) return a.count - b.count
      // 2) yang paling lama nunggu duluan (belum main = paling lama)
      const ta = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
      const tb = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
      if (ta !== tb) return ta - tb
      // 3) tie-break nama
      return a.name.localeCompare(b.name)
    })

  // 4 teratas = saran giliran
  const saran = ranked.slice(0, 4)

  function toggleSelect(playerId) {
    setSelected(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId)
      if (prev.length >= 4) return prev // sudah penuh
      return [...prev, playerId]
    })
  }

  function pilihSaran() {
    setSelected(saran.map(p => p.player_id))
  }

  async function catatGame() {
    if (selected.length !== 4 || saving) return
    setSaving(true)

    const { data: g, error } = await supabase
      .from('games')
      .insert({ session_id: sesi.id, cock_used: cockOn ? 1 : 0 })
      .select()
      .single()

    if (error || !g) {
      alert('Gagal mencatat game. Coba lagi.')
      setSaving(false)
      return
    }

    const rows = selected.map(pid => ({ game_id: g.id, player_id: pid }))
    await supabase.from('game_players').insert(rows)

    // Update state lokal
    setGames(prev => [...prev, {
      id: g.id,
      cock_used: g.cock_used,
      played_at: g.played_at,
      playerIds: [...selected],
    }])
    setSelected([])
    setCockOn(false)
    setSaving(false)
  }

  const totalGames = games.length
  const totalCock = games.reduce((s, g) => s + (g.cock_used || 0), 0)

  const namaById = id => attendees.find(a => a.player_id === id)?.name || '—'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--gray-400)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: '140px' }}>

      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: '18px 16px 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'var(--white)',
                width: '34px', height: '34px', borderRadius: '50%',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>‹</button>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sesi.name || 'Catat Game'}
              </p>
              <h1 style={{ color: 'var(--white)', fontSize: '20px', fontWeight: '600', marginTop: '2px' }}>
                Catat Game
              </h1>
            </div>
          </div>
          <button onClick={onLanjut}
            style={{
              background: 'rgba(255,255,255,0.14)', color: 'var(--white)',
              padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            Iuran →
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginLeft: '44px' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600' }}>
            🏸 {totalGames} game
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
            {totalCock} cock terpakai
          </span>
        </div>
      </div>

      {/* Saran giliran */}
      {saran.length === 4 && (
        <div style={{
          margin: '12px', padding: '14px',
          background: 'var(--white)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.6px', color: 'var(--blue)', textTransform: 'uppercase' }}>
              ⏱ Saran giliran
            </p>
            <button onClick={pilihSaran}
              style={{
                fontSize: '12px', fontWeight: '600', color: 'var(--blue)',
                background: 'var(--blue-light)', padding: '5px 12px', borderRadius: '20px',
              }}>
              Pilih 4 ini
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {saran.map(p => (
              <div key={p.player_id} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--gray-50)', borderRadius: '20px', padding: '4px 10px 4px 4px',
              }}>
                <Avatar name={p.name} size={24} />
                <span style={{ fontSize: '13px', color: 'var(--gray-800)', fontWeight: '500' }}>
                  {p.name.split(' ')[0]}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{p.count}g</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '10px' }}>
            Cuma saran — kamu bebas pilih siapa aja di bawah.
          </p>
        </div>
      )}

      {/* Daftar pemain */}
      <p style={{
        padding: '8px 16px 8px',
        fontSize: '11px', fontWeight: '600', letterSpacing: '0.6px',
        color: 'var(--gray-400)', textTransform: 'uppercase',
      }}>Pilih 4 pemain · {ranked.length} hadir</p>

      <div style={{ background: 'var(--white)' }}>
        {ranked.map(p => {
          const selIdx = selected.indexOf(p.player_id)
          const isSel = selIdx !== -1
          const penuh = selected.length >= 4 && !isSel
          return (
            <div key={p.player_id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px',
                background: isSel ? '#F0F6FF' : 'var(--white)',
                borderBottom: '1px solid var(--gray-100)',
                opacity: penuh ? 0.45 : 1,
                transition: 'background var(--transition)',
              }}>
              <div onClick={() => toggleSelect(p.player_id)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <Avatar name={p.name} selectedNumber={isSel ? selIdx + 1 : null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: isSel ? '600' : '500',
                    color: isSel ? 'var(--navy)' : 'var(--gray-800)',
                    fontSize: '15px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.name}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '1px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                      {p.count} game
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-200)' }}>·</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                      {waktuLalu(p.lastPlayed)}
                    </span>
                    {p.is_member && (
                      <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: '600' }}>Member</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tombol riwayat */}
              <button onClick={() => setHistoryFor(p.player_id)}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--gray-50)', color: 'var(--gray-400)',
                  fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>🕑</button>
            </div>
          )
        })}
      </div>

      {ranked.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>Belum ada pemain hadir.</p>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 16px 24px',
        background: 'var(--white)',
        borderTop: '1px solid var(--gray-100)',
        boxShadow: '0 -4px 16px rgba(3,30,83,0.08)',
      }}>
        {/* Toggle cock */}
        <button onClick={() => setCockOn(v => !v)}
          style={{
            width: '100%', padding: '11px',
            marginBottom: '10px',
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${cockOn ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: cockOn ? 'var(--blue-light)' : 'var(--white)',
            color: cockOn ? 'var(--blue)' : 'var(--gray-600)',
            fontSize: '14px', fontWeight: '600',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          <span style={{ fontSize: '16px' }}>{cockOn ? '🏸' : '🏸'}</span>
          {cockOn ? '+1 cock terpakai di game ini' : 'Tambah cock? (tap kalau ada)'}
        </button>

        <button onClick={catatGame}
          disabled={selected.length !== 4 || saving}
          style={{
            width: '100%', padding: '15px',
            background: selected.length === 4 && !saving ? 'var(--navy)' : 'var(--gray-200)',
            color: selected.length === 4 && !saving ? 'var(--white)' : 'var(--gray-400)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '16px', fontWeight: '600',
            letterSpacing: '-0.2px',
          }}>
          {saving ? 'Menyimpan...' : `Catat Game · ${selected.length}/4`}
        </button>
      </div>

      {/* Bottom sheet riwayat */}
      {historyFor && (
        <RiwayatSheet
          playerId={historyFor}
          name={namaById(historyFor)}
          games={games}
          namaById={namaById}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  )
}

function RiwayatSheet({ playerId, name, games, namaById, onClose }) {
  const mine = games
    .filter(g => g.playerIds.includes(playerId))
    .slice()
    .reverse()

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(3,30,83,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)', width: '100%',
          borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)',
          maxHeight: '70vh', overflowY: 'auto',
          padding: '8px 0 24px',
        }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--gray-200)' }} />
        </div>

        <div style={{ padding: '8px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--navy)' }}>{name}</h2>
            <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '2px' }}>
              {mine.length} game dimainkan
            </p>
          </div>
          <button onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
        </div>

        {mine.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>
            Belum main satu game pun.
          </p>
        ) : (
          mine.map((g, i) => {
            const partners = g.playerIds.filter(id => id !== playerId).map(namaById)
            return (
              <div key={g.id} style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--gray-100)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '2px' }}>
                    Game {mine.length - i}
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--gray-800)' }}>
                    bareng {partners.join(', ')}
                  </p>
                </div>
                {g.cock_used > 0 && (
                  <span style={{
                    fontSize: '12px', color: 'var(--blue)', fontWeight: '600',
                    background: 'var(--blue-light)', padding: '4px 10px', borderRadius: '20px',
                    flexShrink: 0, marginLeft: '8px',
                  }}>🏸 cock</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

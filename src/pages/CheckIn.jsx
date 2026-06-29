import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

function Avatar({ name }) {
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
  return (
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '600', fontSize: '14px', flexShrink: 0,
    }}>{initials}</div>
  )
}

function PlayerRow({ player, attendee, onToggleCheckIn, onToggleMember }) {
  const hadir = !!attendee
  const isMember = attendee?.is_member_this_session ?? false

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px',
      background: hadir ? '#F0F6FF' : 'var(--white)',
      borderBottom: '1px solid var(--gray-100)',
      transition: 'background var(--transition)',
    }}>
      <Avatar name={player.name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: hadir ? '600' : '400',
          color: hadir ? 'var(--navy)' : 'var(--gray-600)',
          fontSize: '15px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{player.name}</p>
        {hadir && (
          <p style={{ fontSize: '12px', color: isMember ? 'var(--blue)' : 'var(--gray-400)', marginTop: '1px' }}>
            {isMember ? 'Member' : 'Non-member'}
          </p>
        )}
      </div>

      {hadir && (
        <button
          onClick={() => onToggleMember(player.id, isMember)}
          style={{
            padding: '5px 10px',
            borderRadius: '20px',
            border: `1.5px solid ${isMember ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: isMember ? 'var(--blue)' : 'var(--white)',
            color: isMember ? 'var(--white)' : 'var(--gray-400)',
            fontSize: '12px', fontWeight: '600',
            whiteSpace: 'nowrap',
          }}
        >
          {isMember ? 'Member ✓' : 'Member?'}
        </button>
      )}

      <button
        onClick={() => onToggleCheckIn(player, hadir)}
        style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          border: hadir ? 'none' : '1.5px solid var(--gray-200)',
          background: hadir ? 'var(--blue)' : 'var(--white)',
          color: hadir ? 'var(--white)' : 'var(--gray-400)',
          fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {hadir ? '✓' : '+'}
      </button>
    </div>
  )
}

export default function CheckIn({ sesi, onLanjut }) {
  const [players, setPlayers] = useState([])
  const [attendees, setAttendees] = useState([])
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const addInputRef = useRef(null)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (showAddForm) setTimeout(() => addInputRef.current?.focus(), 100)
  }, [showAddForm])

  async function fetchData() {
    setLoading(true)
    const [{ data: pData }, { data: aData }] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('attendees').select('*').eq('session_id', sesi.id),
    ])
    setPlayers(pData || [])
    setAttendees(aData || [])
    setLoading(false)
  }

  async function tambahPemain() {
    const nama = newName.trim()
    if (!nama) return
    setSaving(true)
    const { data, error } = await supabase
      .from('players').insert({ name: nama }).select().single()
    if (!error) {
      const sorted = [...players, data].sort((a, b) => a.name.localeCompare(b.name))
      setPlayers(sorted)
      setNewName('')
      setShowAddForm(false)
      // Langsung check-in
      await checkIn(data)
    } else {
      alert('Nama sudah ada atau gagal ditambahkan.')
    }
    setSaving(false)
  }

  async function checkIn(player) {
    const { data } = await supabase
      .from('attendees')
      .insert({ session_id: sesi.id, player_id: player.id, is_member_this_session: false })
      .select().single()
    setAttendees(prev => [...prev, data])
  }

  async function checkOut(playerId) {
    await supabase.from('attendees')
      .delete().eq('session_id', sesi.id).eq('player_id', playerId)
    setAttendees(prev => prev.filter(a => a.player_id !== playerId))
  }

  async function toggleCheckIn(player, hadir) {
    if (hadir) await checkOut(player.id)
    else await checkIn(player)
  }

  async function toggleMember(playerId, isMember) {
    const newVal = !isMember
    await supabase.from('attendees')
      .update({ is_member_this_session: newVal })
      .eq('session_id', sesi.id).eq('player_id', playerId)
    setAttendees(prev =>
      prev.map(a => a.player_id === playerId ? { ...a, is_member_this_session: newVal } : a)
    )
  }

  const hadirIds = new Set(attendees.map(a => a.player_id))
  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const hadirList = filtered.filter(p => hadirIds.has(p.id))
  const belumList = filtered.filter(p => !hadirIds.has(p.id))
  const jumlahHadir = attendees.length

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--gray-400)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: '20px 16px 16px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Check-in</p>
            <h1 style={{ color: 'var(--white)', fontSize: '20px', fontWeight: '600', marginTop: '2px' }}>
              {jumlahHadir} pemain hadir
            </h1>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: '20px',
            padding: '6px 14px', display: 'flex', gap: '8px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              {attendees.filter(a => a.is_member_this_session).length} member
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              {attendees.filter(a => !a.is_member_this_session).length} non
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
        }}>
          <span style={{ fontSize: '16px', opacity: 0.5 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              color: 'var(--white)', fontSize: '15px',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tambah pemain baru */}
      {showAddForm ? (
        <div style={{
          background: 'var(--white)', padding: '16px',
          borderBottom: '1px solid var(--gray-100)',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)', marginBottom: '10px' }}>
            Tambah pemain baru
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={addInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tambahPemain()}
              placeholder="Nama lengkap..."
              style={{
                flex: 1, padding: '11px 14px',
                border: '1.5px solid var(--blue)', borderRadius: 'var(--radius-sm)',
                fontSize: '15px', color: 'var(--gray-800)',
              }}
            />
            <button onClick={tambahPemain} disabled={saving || !newName.trim()}
              style={{
                padding: '11px 16px', borderRadius: 'var(--radius-sm)',
                background: newName.trim() ? 'var(--blue)' : 'var(--gray-200)',
                color: newName.trim() ? 'var(--white)' : 'var(--gray-400)',
                fontWeight: '600', fontSize: '14px',
              }}>
              {saving ? '...' : 'Tambah'}
            </button>
            <button onClick={() => { setShowAddForm(false); setNewName('') }}
              style={{
                padding: '11px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--gray-100)', color: 'var(--gray-600)',
                fontSize: '14px',
              }}>
              Batal
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'var(--white)', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', alignItems: 'center', gap: '10px',
            color: 'var(--blue)', fontSize: '14px', fontWeight: '500',
          }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', color: 'var(--blue)',
          }}>+</span>
          Tambah pemain baru
        </button>
      )}

      {/* Hadir */}
      {hadirList.length > 0 && (
        <div>
          <p style={{
            padding: '12px 16px 8px',
            fontSize: '11px', fontWeight: '600', letterSpacing: '0.6px',
            color: 'var(--gray-400)', textTransform: 'uppercase',
          }}>Hadir · {hadirList.length}</p>
          <div style={{ background: 'var(--white)' }}>
            {hadirList.map(p => (
              <PlayerRow key={p.id} player={p}
                attendee={attendees.find(a => a.player_id === p.id)}
                onToggleCheckIn={toggleCheckIn} onToggleMember={toggleMember}
              />
            ))}
          </div>
        </div>
      )}

      {/* Belum hadir */}
      {belumList.length > 0 && (
        <div>
          <p style={{
            padding: '16px 16px 8px',
            fontSize: '11px', fontWeight: '600', letterSpacing: '0.6px',
            color: 'var(--gray-400)', textTransform: 'uppercase',
          }}>Belum hadir · {belumList.length}</p>
          <div style={{ background: 'var(--white)' }}>
            {belumList.map(p => (
              <PlayerRow key={p.id} player={p}
                attendee={null}
                onToggleCheckIn={toggleCheckIn} onToggleMember={toggleMember}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>
            {search ? `Tidak ada pemain "${search}"` : 'Belum ada pemain'}
          </p>
        </div>
      )}

      {/* Bottom CTA */}
      {jumlahHadir > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 16px 28px',
          background: 'var(--white)',
          borderTop: '1px solid var(--gray-100)',
          boxShadow: '0 -4px 16px rgba(3,30,83,0.08)',
        }}>
          <button
            onClick={onLanjut}
            style={{
              width: '100%', padding: '15px',
              background: 'var(--navy)', color: 'var(--white)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '16px', fontWeight: '600',
              letterSpacing: '-0.2px',
            }}>
            Mulai Sesi → {jumlahHadir} pemain
          </button>
        </div>
      )}
    </div>
  )
}

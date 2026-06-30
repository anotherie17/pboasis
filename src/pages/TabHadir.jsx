import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'

export default function TabHadir({ sesi }) {
  const [players, setPlayers] = useState([])
  const [attendees, setAttendees] = useState([])
  const [memberSet, setMemberSet] = useState(new Set())
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const addRef = useRef(null)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (showAdd) setTimeout(() => addRef.current?.focus(), 80) }, [showAdd])

  async function fetchData() {
    setLoading(true)
    const [{ data: pData }, { data: aData }, { data: per }] = await Promise.all([
      supabase.from('players').select('id, name').order('name'),
      supabase.from('attendees').select('player_id, is_member_this_session, paid').eq('session_id', sesi.id),
      supabase.from('member_periods').select('id').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setPlayers(pData || [])
    setAttendees(aData || [])
    if (per) {
      const { data: ml } = await supabase.from('member_list').select('player_id').eq('period_id', per.id)
      setMemberSet(new Set((ml || []).map(m => m.player_id)))
    }
    setLoading(false)
  }

  async function checkIn(player) {
    const isMember = memberSet.has(player.id)
    const { data } = await supabase.from('attendees')
      .insert({ session_id: sesi.id, player_id: player.id, is_member_this_session: isMember })
      .select().single()
    setAttendees(prev => [...prev, data])
  }
  async function checkOut(playerId) {
    await supabase.from('attendees').delete().eq('session_id', sesi.id).eq('player_id', playerId)
    setAttendees(prev => prev.filter(a => a.player_id !== playerId))
  }
  async function toggleMember(playerId, cur) {
    const v = !cur
    setAttendees(prev => prev.map(a => a.player_id === playerId ? { ...a, is_member_this_session: v } : a))
    await supabase.from('attendees').update({ is_member_this_session: v }).eq('session_id', sesi.id).eq('player_id', playerId)
  }
  async function tambah() {
    const nama = newName.trim()
    if (!nama) return
    setSaving(true)
    const { data, error } = await supabase.from('players').insert({ name: nama }).select().single()
    if (!error) {
      setPlayers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName(''); setShowAdd(false)
      await checkIn(data)
    } else alert('Nama sudah ada atau gagal ditambahkan.')
    setSaving(false)
  }

  const hadirIds = new Set(attendees.map(a => a.player_id))
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const hadirList = filtered.filter(p => hadirIds.has(p.id))
  const belumList = filtered.filter(p => !hadirIds.has(p.id))
  const nMember = attendees.filter(a => a.is_member_this_session).length

  if (loading) return <p className="muted" style={{ padding: 30, textAlign: 'center' }}>Memuat...</p>

  return (
    <div className="fade-in" style={{ padding: '14px 16px 24px' }}>
      <div style={{ padding: '4px 4px 14px' }}>
        <h1 className="h1">Hadir</h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div className="glass" style={{ flex: 1, borderRadius: 16, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Hadir</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 21, fontWeight: 700, color: '#fff', marginTop: 2 }}>{attendees.length}</p>
          </div>
          <div className="glass" style={{ flex: 1, borderRadius: 16, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Member / non</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 21, fontWeight: 700, color: '#fff', marginTop: 2 }}>{nMember} / {attendees.length - nMember}</p>
          </div>
        </div>
      </div>

      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="search" size={18} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama..."
          style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 15 }} />
        {search && <button onClick={() => setSearch('')} style={{ color: 'var(--t-3)', display: 'flex' }}><Icon name="x" size={16} /></button>}
      </div>

      {showAdd ? (
        <div className="glass" style={{ borderRadius: 18, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Tambah pemain baru</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={addRef} value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tambah()} placeholder="Nama lengkap..."
              className="field" style={{ flex: 1 }} />
            <button className="cta" onClick={tambah} disabled={saving || !newName.trim()} style={{ width: 'auto', padding: '0 18px' }}>{saving ? '...' : 'Add'}</button>
          </div>
          <button onClick={() => { setShowAdd(false); setNewName('') }} style={{ marginTop: 10, fontSize: 13, color: 'var(--t-3)' }}>Batal</button>
        </div>
      ) : (
        <button className="glass" onClick={() => setShowAdd(true)}
          style={{ width: '100%', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#bdd8ff', fontSize: 14, fontWeight: 600, marginBottom: 16, textAlign: 'left' }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(90,160,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="plus" size={17} /></span>
          Tambah pemain baru
        </button>
      )}

      {hadirList.length > 0 && <>
        <p className="section-label" style={{ margin: '4px 4px 8px' }}>Hadir · {hadirList.length}</p>
        <div className="glass" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
          {hadirList.map((p, i) => {
            const a = attendees.find(x => x.player_id === p.id)
            const isMember = a?.is_member_this_session
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(90,160,255,0.10)', borderBottom: i < hadirList.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <Avatar name={p.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: isMember ? '#bdd8ff' : 'var(--t-3)', marginTop: 1 }}>{isMember ? 'Member' : 'Non-member'}</p>
                </div>
                <button onClick={() => toggleMember(p.id, isMember)} className={`chip ${isMember ? 'on' : ''}`} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>{isMember ? 'Member' : 'Member?'}</button>
                <button onClick={() => checkOut(p.id)} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#5aa0f0,#1368C8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="check" size={17} stroke={2.5} /></button>
              </div>
            )
          })}
        </div>
      </>}

      {belumList.length > 0 && <>
        <p className="section-label" style={{ margin: '4px 4px 8px' }}>Belum hadir · {belumList.length}</p>
        <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
          {belumList.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: i < belumList.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <Avatar name={p.name} size={40} />
              <p style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--t-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
              <button onClick={() => checkIn(p)} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-2)' }}><Icon name="plus" size={17} /></button>
            </div>
          ))}
        </div>
      </>}

      {filtered.length === 0 && <p className="muted" style={{ padding: 30, textAlign: 'center', fontSize: 14 }}>{search ? `Tidak ada "${search}"` : 'Belum ada pemain'}</p>}
    </div>
  )
}

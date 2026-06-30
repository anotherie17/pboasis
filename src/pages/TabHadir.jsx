import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon } from '../components/ui'

// Rapikan nama: buang spasi depan/belakang + spasi ganda jadi satu.
const rapikan = s => s.trim().replace(/\s+/g, ' ')

export default function TabHadir({ sesi }) {
  const [players, setPlayers] = useState([])
  const [attendees, setAttendees] = useState([])
  const [memberSet, setMemberSet] = useState(new Set())
  const [gameCount, setGameCount] = useState({}) // player_id -> jumlah game di sesi ini
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
    // Periode member yang berlaku untuk TANGGAL sesi ini (bukan sekadar yang terbaru).
    // Jadi sesi lama tetap memakai daftar member yang benar saat sesi itu.
    const [{ data: pData }, { data: aData }, { data: per }, { data: gms }] = await Promise.all([
      supabase.from('players').select('id, name').order('name'),
      supabase.from('attendees').select('player_id, is_member_this_session, paid').eq('session_id', sesi.id),
      supabase.from('member_periods').select('id').lte('started_at', sesi.date).order('started_at', { ascending: false }).order('period_number', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('games').select('id, game_players(player_id)').eq('session_id', sesi.id),
    ])
    setPlayers(pData || [])
    setAttendees((aData || []).filter(Boolean))
    if (per) {
      const { data: ml } = await supabase.from('member_list').select('player_id').eq('period_id', per.id)
      setMemberSet(new Set((ml || []).map(m => m.player_id)))
    } else {
      setMemberSet(new Set())
    }
    const gc = {}
    for (const g of (gms || [])) for (const gp of (g.game_players || [])) gc[gp.player_id] = (gc[gp.player_id] || 0) + 1
    setGameCount(gc)
    setLoading(false)
  }

  async function checkIn(player) {
    const isMember = memberSet.has(player.id)
    const { data, error } = await supabase.from('attendees')
      .insert({ session_id: sesi.id, player_id: player.id, is_member_this_session: isMember })
      .select().single()
    if (error || !data) { alert('Gagal mencatat kehadiran. Cek sinyal lalu coba lagi.'); return }
    setAttendees(prev => [...prev, data])
  }

  async function checkOut(playerId) {
    const n = gameCount[playerId] || 0
    if (n > 0) {
      alert(`Pemain ini sudah main ${n} game. Hapus dulu game-game itu di tab Game sebelum mengeluarkannya, supaya tagihan & catatan tidak kacau.`)
      return
    }
    if (!confirm('Keluarkan pemain ini dari daftar hadir?')) return
    const { error } = await supabase.from('attendees').delete().eq('session_id', sesi.id).eq('player_id', playerId)
    if (error) { alert('Gagal mengeluarkan. Coba lagi.'); return }
    setAttendees(prev => prev.filter(a => a.player_id !== playerId))
  }

  async function toggleMember(playerId, cur) {
    const v = !cur
    setAttendees(prev => prev.map(a => a.player_id === playerId ? { ...a, is_member_this_session: v } : a))
    const { error } = await supabase.from('attendees').update({ is_member_this_session: v }).eq('session_id', sesi.id).eq('player_id', playerId)
    if (error) {
      setAttendees(prev => prev.map(a => a.player_id === playerId ? { ...a, is_member_this_session: cur } : a))
      alert('Gagal menyimpan. Coba lagi.')
    }
  }

  async function tambah() {
    const nama = rapikan(newName)
    if (!nama) return
    // Cek duplikat tanpa peduli huruf besar/kecil & spasi.
    const dup = players.find(p => rapikan(p.name).toLowerCase() === nama.toLowerCase())
    if (dup) {
      alert(`Nama "${dup.name}" sudah ada di daftar. Pakai yang itu aja ya.`)
      setNewName(''); setShowAdd(false)
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('players').insert({ name: nama }).select().single()
    if (!error && data) {
      setPlayers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName(''); setShowAdd(false)
      await checkIn(data)
    } else alert('Gagal menambah pemain. Mungkin namanya sudah ada.')
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
            const sudahMain = (gameCount[p.id] || 0) > 0
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(90,160,255,0.10)', borderBottom: i < hadirList.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <Avatar name={p.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: isMember ? '#bdd8ff' : 'var(--t-3)', marginTop: 1 }}>{isMember ? 'Member' : 'Non-member'}{sudahMain ? ` · ${gameCount[p.id]} game` : ''}</p>
                </div>
                <button onClick={() => toggleMember(p.id, isMember)} className={`chip ${isMember ? 'on' : ''}`} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>{isMember ? 'Member' : 'Member?'}</button>
                <button onClick={() => checkOut(p.id)} title="Keluarkan dari hadir"
                  style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: sudahMain ? 'rgba(255,255,255,0.06)' : 'rgba(255,140,140,0.14)', border: '1px solid rgba(255,140,140,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sudahMain ? 'var(--t-3)' : 'var(--rose)' }}>
                  <Icon name="x" size={17} stroke={2.4} />
                </button>
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
              <button onClick={() => checkIn(p)} title="Catat hadir"
                style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#5aa0f0,#1368C8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="plus" size={18} stroke={2.4} /></button>
            </div>
          ))}
        </div>
      </>}

      {filtered.length === 0 && <p className="muted" style={{ padding: 30, textAlign: 'center', fontSize: 14 }}>{search ? `Tidak ada "${search}"` : 'Belum ada pemain'}</p>}
    </div>
  )
}

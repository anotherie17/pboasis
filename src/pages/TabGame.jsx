import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon, Overlay } from '../components/ui'
import { useDialog } from '../components/Dialog'
import { waktuLalu } from '../lib/iuran'

export default function TabGame({ sesi }) {
  const [attendees, setAttendees] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [openGame, setOpenGame] = useState(null)
  const [historyId, setHistoryId] = useState(null)
  const dlg = useDialog()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: att }, { data: gms }] = await Promise.all([
      supabase.from('attendees').select('player_id, players(name)').eq('session_id', sesi.id),
      supabase.from('games').select('id, cock_used, played_at, finished, game_players(player_id)').eq('session_id', sesi.id).order('played_at', { ascending: true }),
    ])
    setAttendees((att || []).map(a => ({ player_id: a.player_id, name: a.players?.name || '—' })))
    setGames((gms || []).map(g => ({ id: g.id, cock_used: g.cock_used, played_at: g.played_at, finished: g.finished !== false, playerIds: (g.game_players || []).map(p => p.player_id) })))
    setLoading(false)
  }

  const nama = id => attendees.find(a => a.player_id === id)?.name || '—'

  // Siapa yang LAGI main (ada di game yang belum selesai) — dikecualikan dari saran giliran.
  const bermainSet = new Set()
  for (const g of games) if (!g.finished) for (const pid of g.playerIds) bermainSet.add(pid)

  function stat(pid) {
    let count = 0, last = null
    for (const g of games) if (g.playerIds.includes(pid)) { count++; if (!last || new Date(g.played_at) > new Date(last)) last = g.played_at }
    return { count, last }
  }
  const ranked = attendees.map(a => ({ ...a, ...stat(a.player_id), main: bermainSet.has(a.player_id) }))
    .sort((a, b) => a.count - b.count || (a.last ? new Date(a.last).getTime() : 0) - (b.last ? new Date(b.last).getTime() : 0) || a.name.localeCompare(b.name))

  // Mengembalikan true kalau sukses. finished=false => game "lagi main".
  async function saveGame(playerIds, cock, finished) {
    const { data: g, error } = await supabase.from('games').insert({ session_id: sesi.id, cock_used: cock, finished }).select().single()
    if (error || !g) { dlg.alert('Gagal menyimpan game. Cek sinyal lalu coba lagi.'); return false }
    const { error: gpErr } = await supabase.from('game_players').insert(playerIds.map(pid => ({ game_id: g.id, player_id: pid })))
    if (gpErr) {
      await supabase.from('games').delete().eq('id', g.id) // batalkan supaya tidak ada game kosong
      dlg.alert('Gagal menyimpan pemain. Game dibatalkan, coba lagi.')
      return false
    }
    setGames(prev => [...prev, { id: g.id, cock_used: cock, played_at: g.played_at, finished, playerIds: [...playerIds] }])
    setAdding(false)
    return true
  }
  // Tandai game selesai + simpan cock.
  async function finishGame(gameId, cock) {
    const { error } = await supabase.from('games').update({ cock_used: cock, finished: true }).eq('id', gameId)
    if (error) { dlg.alert('Gagal menyimpan. Coba lagi.'); return }
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, cock_used: cock, finished: true } : g))
    setOpenGame(null)
  }
  async function updateCock(gameId, cock) {
    const { error } = await supabase.from('games').update({ cock_used: cock }).eq('id', gameId)
    if (error) { dlg.alert('Gagal menyimpan perubahan. Coba lagi.'); return }
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, cock_used: cock } : g))
    setOpenGame(null)
  }
  async function deleteGame(gameId) {
    const { error } = await supabase.from('games').delete().eq('id', gameId) // game_players ikut (CASCADE)
    if (error) { dlg.alert('Gagal menghapus game. Coba lagi.'); return }
    setGames(prev => prev.filter(g => g.id !== gameId))
    setOpenGame(null)
  }

  const totalCock = games.reduce((s, g) => s + (g.cock_used || 0), 0)
  const lagiMain = games.filter(g => !g.finished).length
  const gamesDesc = games.map((g, i) => ({ ...g, no: i + 1 })).reverse()

  if (loading) return <p className="muted" style={{ padding: 30, textAlign: 'center' }}>Memuat...</p>

  return (
    <div className="fade-in" style={{ padding: '14px 16px 24px' }}>
      <div style={{ padding: '4px 4px 14px' }}>
        <h1 className="h1">Game</h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div className="glass" style={{ flex: 1, borderRadius: 16, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Total game</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 21, fontWeight: 700, color: '#fff', marginTop: 2 }}>{games.length}{lagiMain > 0 && <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 600 }}> · {lagiMain} jalan</span>}</p>
          </div>
          <div className="glass" style={{ flex: 1, borderRadius: 16, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Cock kepakai</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 21, fontWeight: 700, color: '#fff', marginTop: 2 }}>{totalCock}</p>
          </div>
        </div>
      </div>

      <button className="cta" onClick={() => setAdding(true)} disabled={attendees.length < 4} style={{ marginBottom: attendees.length < 4 ? 8 : 18 }}>
        <Icon name="plus" size={18} /> Mulai game baru
      </button>
      {attendees.length < 4 && <p style={{ fontSize: 12, color: 'var(--t-3)', textAlign: 'center', marginBottom: 16 }}>Minimal 4 pemain hadir buat mulai game.</p>}

      {gamesDesc.length > 0 && <>
        <p className="section-label" style={{ margin: '4px 4px 10px' }}>Match hari ini · {games.length}</p>
        {gamesDesc.map(g => (
          <button key={g.id} onClick={() => setOpenGame(g)} className="glass"
            style={{ width: '100%', borderRadius: 20, padding: '14px 16px', marginBottom: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', border: g.finished ? undefined : '1px solid rgba(126,240,184,0.4)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={{ width: 40, height: 40, borderRadius: 13, background: g.finished ? 'rgba(120,170,255,0.18)' : 'rgba(126,240,184,0.18)', border: `1px solid ${g.finished ? 'rgba(140,180,255,0.25)' : 'rgba(126,240,184,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 15, color: g.finished ? '#cfe4ff' : 'var(--mint)', flexShrink: 0 }}>{g.no}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.playerIds.map(nama).join(', ')}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--t-3)', marginTop: 2 }}>{waktuLalu(g.played_at)}</span>
              </span>
            </span>
            {g.finished
              ? <span className="badge-cock">{g.cock_used} cock</span>
              : <span className="tag tag-live" style={{ flexShrink: 0 }}>● Lagi main</span>}
          </button>
        ))}
      </>}

      {ranked.length > 0 && <>
        <p className="section-label" style={{ margin: '18px 4px 10px' }}>Statistik pemain · tap buat history</p>
        <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
          {ranked.map((p, i) => (
            <button key={p.player_id} onClick={() => setHistoryId(p.player_id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: i < ranked.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', textAlign: 'left', background: 'transparent' }}>
              <Avatar name={p.name} size={36} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              {p.main && <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 600 }}>lagi main</span>}
              <span style={{ fontSize: 12.5, color: 'var(--t-2)' }}>{p.count} game</span>
              <Icon name="clock" size={17} style={{ color: 'var(--t-3)' }} />
            </button>
          ))}
        </div>
      </>}

      {adding && <AddGameSheet ranked={ranked} onClose={() => setAdding(false)} onSave={saveGame} />}
      {openGame && <GameSheet game={openGame} nama={nama} onClose={() => setOpenGame(null)} onFinish={finishGame} onUpdate={updateCock} onDelete={deleteGame} />}
      {historyId && <HistorySheet playerId={historyId} name={nama(historyId)} games={games} nama={nama} onClose={() => setHistoryId(null)} />}
    </div>
  )
}

function CockStepper({ value, setValue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, margin: '6px 0 4px' }}>
      <button onClick={() => setValue(Math.max(0, value - 1))} style={{ width: 46, height: 46, borderRadius: 16, background: 'rgba(255,255,255,0.10)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <div style={{ textAlign: 'center', minWidth: 60 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 11, color: 'var(--t-3)', marginTop: 2 }}>cock</p>
      </div>
      <button onClick={() => setValue(value + 1)} style={{ width: 46, height: 46, borderRadius: 16, background: 'linear-gradient(135deg,#5aa0f0,#1368C8)', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
    </div>
  )
}

function AddGameSheet({ ranked, onClose, onSave }) {
  const [sel, setSel] = useState([])
  const [cock, setCock] = useState(0)
  const [saving, setSaving] = useState(false)
  // Saran & pilihan hanya dari yang TIDAK lagi main (biar 2 lapangan nggak bentrok).
  const tersedia = ranked.filter(p => !p.main)
  const saran = tersedia.slice(0, 4).map(p => p.player_id)

  function toggle(p) {
    if (saving || p.main) return
    setSel(prev => prev.includes(p.player_id) ? prev.filter(x => x !== p.player_id) : prev.length >= 4 ? prev : [...prev, p.player_id])
  }

  async function handleSave(finished) {
    if (sel.length !== 4 || saving) return
    setSaving(true)
    const ok = await onSave(sel, cock, finished)
    if (!ok) setSaving(false)
  }

  const lengkap = sel.length === 4

  return (
    <Overlay onClose={saving ? () => {} : onClose}>
      <div style={{ padding: '4px 18px 0', flexShrink: 0 }}>
        <h2 className="h2" style={{ color: '#fff', marginBottom: 4 }}>Mulai game</h2>
        <p style={{ fontSize: 13, color: 'var(--t-3)', marginBottom: 12 }}>Pilih 4 pemain · cock diisi pas selesai</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="section-label">⏱ Saran giliran</span>
          <button onClick={() => !saving && setSel(saran)} className="chip on" style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>Pilih 4 ini</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 18px', margin: '0 0 4px' }}>
        {ranked.map(p => {
          const idx = sel.indexOf(p.player_id)
          const on = idx !== -1
          const disabled = p.main || (sel.length >= 4 && !on)
          return (
            <button key={p.player_id} onClick={() => toggle(p)} disabled={p.main}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, marginBottom: 6, background: on ? 'rgba(90,160,255,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${on ? 'rgba(120,170,255,0.45)' : 'transparent'}`, opacity: disabled ? 0.4 : 1, textAlign: 'left' }}>
              {on
                ? <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#5aa0f0,#1368C8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{idx + 1}</span>
                : <Avatar name={p.name} size={36} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: on ? 700 : 500, color: on ? '#fff' : 'var(--t-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              {p.main
                ? <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 600 }}>lagi main</span>
                : <span style={{ fontSize: 12, color: 'var(--t-3)' }}>{p.count}g</span>}
            </button>
          )
        })}
      </div>

      <div style={{ flexShrink: 0, padding: '10px 18px calc(16px + env(safe-area-inset-bottom))', background: '#0a1838', borderTop: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -12px 24px -8px rgba(0,0,0,0.5)' }}>
        <button className="cta" onClick={() => handleSave(false)} disabled={saving}
          style={!lengkap && !saving ? { background: 'rgba(255,255,255,0.12)', boxShadow: 'none', border: '1px solid var(--glass-border)' } : undefined}>
          {saving ? 'Menyimpan…' : lengkap ? <>Mulai main <Icon name="check" size={18} stroke={2.5} /></> : `Pilih ${4 - sel.length} pemain lagi`}
        </button>
        {lengkap && !saving && (
          <button onClick={() => handleSave(true)} style={{ width: '100%', marginTop: 10, fontSize: 13, color: 'var(--t-3)', fontWeight: 600 }}>
            atau langsung catat selesai
          </button>
        )}
      </div>
    </Overlay>
  )
}

// Sheet gabungan: game "lagi main" -> tombol Selesai; game selesai -> edit cock.
function GameSheet({ game, nama, onClose, onFinish, onUpdate, onDelete }) {
  const dlg = useDialog()
  const [cock, setCock] = useState(game.cock_used)
  const [busy, setBusy] = useState(false)
  const jalan = !game.finished
  return (
    <Overlay onClose={busy ? () => {} : onClose}>
      <div style={{ flex: '1 1 auto', minHeight: 0, padding: '4px 18px calc(24px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h2 className="h2" style={{ color: '#fff' }}>Game {game.no}</h2>
          {jalan && <span className="tag tag-live">● Lagi main</span>}
        </div>
        <p style={{ fontSize: 13, color: 'var(--t-2)', marginBottom: 16 }}>{game.playerIds.map(nama).join(', ')}</p>
        <p style={{ fontSize: 12, color: 'var(--t-3)', marginBottom: 6 }}>{jalan ? 'Berapa cock yang kepakai di game ini?' : 'Jumlah cock'}</p>
        <div className="glass" style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}><CockStepper value={cock} setValue={setCock} /></div>

        {jalan ? (
          <button className="cta" disabled={busy} onClick={async () => { setBusy(true); await onFinish(game.id, cock) }} style={{ marginBottom: 10 }}>
            {busy ? 'Menyimpan…' : <>Selesai <Icon name="check" size={18} stroke={2.5} /></>}
          </button>
        ) : (
          <button className="cta" disabled={busy} onClick={async () => { setBusy(true); await onUpdate(game.id, cock); setBusy(false) }} style={{ marginBottom: 10 }}>
            {busy ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
        )}

        <button className="btn-ghost" disabled={busy} onClick={async () => { if (await dlg.confirm(jalan ? 'Batalkan game ini? Catatannya akan dihapus.' : 'Hapus game ini? Cock & statistik game ini akan ikut hilang.', { title: jalan ? 'Batalkan game' : 'Hapus game', danger: true, okText: jalan ? 'Batalkan' : 'Hapus' })) { setBusy(true); await onDelete(game.id) } }} style={{ color: 'var(--rose)', borderColor: 'rgba(255,140,140,0.3)' }}>
          <Icon name="trash" size={17} /> {jalan ? 'Batalkan game' : 'Hapus game'}
        </button>
        <p style={{ fontSize: 11.5, color: 'var(--t-3)', textAlign: 'center', marginTop: 12 }}>Mau ganti pemainnya? Hapus game ini lalu mulai ulang.</p>
      </div>
    </Overlay>
  )
}

function HistorySheet({ playerId, name, games, nama, onClose }) {
  const mine = games.map((g, i) => ({ ...g, no: i + 1 })).filter(g => g.playerIds.includes(playerId)).reverse()
  return (
    <Overlay onClose={onClose}>
      <div style={{ flex: '1 1 auto', minHeight: 0, padding: '4px 18px calc(24px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Avatar name={name} size={44} />
          <div>
            <h2 className="h2" style={{ color: '#fff' }}>{name}</h2>
            <p style={{ fontSize: 13, color: 'var(--t-3)' }}>{mine.length} game dimainkan</p>
          </div>
        </div>
        {mine.length === 0 ? (
          <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Belum main satu game pun.</p>
        ) : mine.map(g => (
          <div key={g.id} className="glass" style={{ borderRadius: 16, padding: '12px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, color: 'var(--t-3)', marginBottom: 2 }}>Game {g.no}{!g.finished && ' · lagi main'}</p>
              <p style={{ fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>bareng {g.playerIds.filter(id => id !== playerId).map(nama).join(', ')}</p>
            </div>
            {g.finished && g.cock_used > 0 && <span className="badge-cock">{g.cock_used} cock</span>}
          </div>
        ))}
      </div>
    </Overlay>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Icon, Overlay } from '../components/ui'
import { useDialog } from '../components/Dialog'

const rapikan = s => s.trim().replace(/\s+/g, ' ')

export default function KelolaPemain({ onBack }) {
  const dlg = useDialog()
  const [players, setPlayers] = useState([])
  const [usage, setUsage] = useState({})   // id -> { att, game }
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState(null)    // pemain yang lagi dibuka

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: pl }, { data: att }, { data: gp }] = await Promise.all([
      supabase.from('players').select('id, name').order('name'),
      supabase.from('attendees').select('player_id'),
      supabase.from('game_players').select('player_id'),
    ])
    const u = {}
    for (const a of (att || [])) { u[a.player_id] = u[a.player_id] || { att: 0, game: 0 }; u[a.player_id].att++ }
    for (const g of (gp || [])) { u[g.player_id] = u[g.player_id] || { att: 0, game: 0 }; u[g.player_id].game++ }
    setPlayers(pl || []); setUsage(u); setLoading(false)
  }

  async function rename(player, nama) {
    const bersih = rapikan(nama)
    if (!bersih) { dlg.alert('Nama tidak boleh kosong.'); return false }
    const dup = players.find(p => p.id !== player.id && rapikan(p.name).toLowerCase() === bersih.toLowerCase())
    if (dup) { dlg.alert(`Nama "${dup.name}" sudah dipakai pemain lain.`, { title: 'Nama bentrok' }); return false }
    const { error } = await supabase.from('players').update({ name: bersih }).eq('id', player.id)
    if (error) { dlg.alert('Gagal menyimpan nama. Coba lagi.'); return false }
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, name: bersih } : p).sort((a, b) => a.name.localeCompare(b.name)))
    return true
  }

  async function hapus(player) {
    const u = usage[player.id] || { att: 0, game: 0 }
    if (u.att > 0 || u.game > 0) {
      await dlg.alert(`"${player.name}" sudah punya riwayat (${u.att} kali hadir, ikut ${u.game} game), jadi tidak bisa dihapus supaya data & rekap sesi lama tetap utuh. Kalau cuma salah ketik nama, pakai "Ubah nama" aja.`, { title: 'Tidak bisa dihapus' })
      return false
    }
    const ok = await dlg.confirm(`Hapus pemain "${player.name}" permanen? (Pemain ini belum pernah dipakai, jadi aman.)`, { title: 'Hapus pemain', danger: true, okText: 'Hapus' })
    if (!ok) return false
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) { dlg.alert('Gagal menghapus. Coba lagi.'); return false }
    setPlayers(prev => prev.filter(p => p.id !== player.id))
    return true
  }

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
        <Icon name="back" size={18} /> Beranda
      </button>

      <div style={{ padding: '0 6px 16px' }}>
        <p className="eyebrow">Data pemain</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Kelola pemain</h1>
        <p style={{ fontSize: 12.5, color: 'var(--t-2)', marginTop: 8, lineHeight: 1.5 }}>
          Ubah nama atau hapus pemain. Pemain yang sudah punya riwayat tidak bisa dihapus biar rekap lama tetap utuh.
        </p>
      </div>

      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon name="search" size={18} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama..." style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 15 }} />
      </div>

      {loading ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Memuat...</p>
      ) : (
        <>
          <p className="section-label" style={{ margin: '6px 6px 10px' }}>Semua pemain · {filtered.length}</p>
          <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
            {filtered.map((p, i) => {
              const u = usage[p.id] || { att: 0, game: 0 }
              const dipakai = u.att > 0 || u.game > 0
              return (
                <button key={p.id} onClick={() => setEdit(p)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'transparent', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', textAlign: 'left' }}>
                  <Avatar name={p.name} size={40} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--t-3)', marginTop: 1 }}>{dipakai ? `${u.att} hadir · ${u.game} game` : 'Belum dipakai'}</span>
                  </span>
                  <Icon name="edit" size={17} style={{ color: 'var(--t-3)', flexShrink: 0 }} />
                </button>
              )
            })}
            {filtered.length === 0 && <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>{search ? `Tidak ada "${search}"` : 'Belum ada pemain'}</p>}
          </div>
        </>
      )}

      {edit && (
        <EditPemainSheet
          player={edit}
          usage={usage[edit.id] || { att: 0, game: 0 }}
          onClose={() => setEdit(null)}
          onRename={rename}
          onDelete={hapus}
        />
      )}
    </div>
  )
}

function EditPemainSheet({ player, usage, onClose, onRename, onDelete }) {
  const [name, setName] = useState(player.name)
  const [busy, setBusy] = useState(false)
  const dipakai = usage.att > 0 || usage.game > 0

  return (
    <Overlay onClose={busy ? () => {} : onClose}>
      <div style={{ padding: '4px 18px calc(24px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
        <h2 className="h2" style={{ color: '#fff', marginBottom: 4 }}>Ubah pemain</h2>
        <p style={{ fontSize: 12.5, color: 'var(--t-3)', marginBottom: 16 }}>{dipakai ? `${usage.att} kali hadir · ikut ${usage.game} game` : 'Belum pernah dipakai'}</p>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nama</label>
        <input className="field" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />

        <button className="cta" disabled={busy} onClick={async () => { setBusy(true); const ok = await onRename(player, name); setBusy(false); if (ok) onClose() }} style={{ marginBottom: 10 }}>
          {busy ? 'Menyimpan…' : 'Simpan nama'}
        </button>

        <button className="btn-ghost" disabled={busy} onClick={async () => { setBusy(true); const ok = await onDelete(player); setBusy(false); if (ok) onClose() }}
          style={{ color: dipakai ? 'var(--t-3)' : 'var(--rose)', borderColor: dipakai ? 'var(--glass-border)' : 'rgba(255,140,140,0.3)' }}>
          <Icon name="trash" size={17} /> Hapus pemain
        </button>
        {dipakai && <p style={{ fontSize: 11.5, color: 'var(--t-3)', textAlign: 'center', marginTop: 10 }}>Pemain berriwayat tidak bisa dihapus (biar rekap lama aman).</p>}
      </div>
    </Overlay>
  )
}

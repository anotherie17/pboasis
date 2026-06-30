import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui'

function formatTanggal(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function isToday(iso) {
  return iso === new Date().toISOString().split('T')[0]
}

export default function Beranda({ onSesiBaru, onBukaSesi, onMember }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    setLoading(true)
    const { data } = await supabase
      .from('sessions')
      .select('id, name, date, court_fee_nonmember, cock_price_per_piece, attendees(player_id, paid), games(id)')
      .order('date', { ascending: false })
      .limit(30)
    setSessions(data || [])
    setLoading(false)
  }

  return (
    <div className="scroll fade-in" style={{ padding: '18px 18px 28px' }}>
      <div style={{ padding: '8px 6px 18px' }}>
        <p className="eyebrow">PB Oasis</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Beranda</h1>
      </div>

      <button className="glass" onClick={onSesiBaru}
        style={{ width: '100%', borderRadius: 20, padding: 15, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12, textAlign: 'left' }}>
        <span style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#2f86ff,#0e54a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 18px -6px rgba(28,120,240,0.7)', flexShrink: 0 }}>
          <Icon name="plus" size={22} />
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#fff' }}>Sesi baru</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--t-3)', marginTop: 1 }}>Mulai mabar hari ini</span>
        </span>
      </button>

      <button className="glass" onClick={onMember}
        style={{ width: '100%', borderRadius: 20, padding: 15, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20, textAlign: 'left' }}>
        <span style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#6f5ae0,#4233a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <Icon name="star" size={20} />
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#fff' }}>Daftar member</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--t-3)', marginTop: 1 }}>Atur member bulan ini</span>
        </span>
      </button>

      <p className="section-label" style={{ margin: '0 6px 12px' }}>Riwayat sesi</p>

      {loading ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>Memuat...</p>
      ) : sessions.length === 0 ? (
        <div className="glass" style={{ borderRadius: 20, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--t-2)' }}>Belum ada sesi. Bikin sesi baru buat mulai.</p>
        </div>
      ) : (
        sessions.map(s => {
          const hadir = s.attendees?.length || 0
          const totalG = s.games?.length || 0
          const adaBelum = (s.attendees || []).some(a => !a.paid)
          const today = isToday(s.date)
          return (
            <button key={s.id} onClick={() => onBukaSesi(s)} className="glass"
              style={{ width: '100%', borderRadius: 24, padding: '18px 19px', marginBottom: 14, position: 'relative', textAlign: 'left', display: 'block' }}>
              <span className={`tag ${today ? 'tag-live' : 'tag-done'}`} style={{ position: 'absolute', top: 18, right: 18 }}>
                {today ? '● Berlangsung' : 'Selesai'}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--t-3)', fontWeight: 500 }}>{formatTanggal(s.date)}</span>
              <span className="h2" style={{ display: 'block', color: '#fff', marginTop: 3 }}>{s.name || 'Sesi'}</span>
              <span style={{ display: 'flex', gap: 16, marginTop: 13, fontSize: 12.5, color: 'var(--t-2)' }}>
                <span><b style={{ color: '#fff' }}>{hadir}</b> hadir</span>
                <span><b style={{ color: '#fff' }}>{totalG}</b> game</span>
                <span style={{ color: adaBelum ? 'var(--rose)' : 'var(--mint)' }}>
                  {hadir === 0 ? '—' : adaBelum ? 'ada belum bayar' : 'lunas semua'}
                </span>
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}

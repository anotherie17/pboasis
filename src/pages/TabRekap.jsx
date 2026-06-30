import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui'
import { hitungIuran, rupiah } from '../lib/iuran'

function formatTanggal(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function Stat({ label, value, accent }) {
  return (
    <div className="glass" style={{ flex: 1, minWidth: 0, borderRadius: 16, padding: '13px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--t-3)', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 700, color: accent || '#fff' }}>{value}</p>
    </div>
  )
}

export default function TabRekap({ sesi }) {
  const [attendees, setAttendees] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

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

  function exportPDF() {
    const lib = window.jspdf
    if (!lib || !lib.jsPDF) { alert('Modul PDF belum termuat. Refresh halaman lalu ulangi.'); return }
    setExporting(true)
    try {
      const h = hitungIuran(sesi, attendees, games)
      const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' })
      const navy = [3, 30, 83], blue = [19, 104, 200], gray = [120, 128, 140], M = 16, W = 210
      let y = 0
      doc.setFillColor(...navy); doc.rect(0, 0, W, 30, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('PB OASIS', M, 14)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 215, 240); doc.text('Rekap Sesi Mabar', M, 21)
      y = 42; doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(sesi.name || 'Sesi Mabar', M, y)
      y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...gray); doc.text(formatTanggal(sesi.date), M, y)

      y += 10
      const sum = [
        ['Jumlah pemain', `${h.rows.length} (${h.jumlahMember} member / ${h.jumlahNon} non)`],
        ['Total game', `${h.jumlahGame}`],
        ['Cock terpakai', `${h.totalCock} biji = ${rupiah(h.totalBiayaCock)}`],
        ['Tarif lapangan (non-member)', rupiah(h.courtFee)],
        ['Total tagihan', rupiah(h.totalTagihan)],
        ['Terkumpul', rupiah(h.totalLunas)],
        ['Sisa belum bayar', rupiah(h.totalBelum)],
      ]
      doc.setFillColor(247, 249, 251); doc.rect(M, y, W - M * 2, sum.length * 7 + 4, 'F'); y += 7
      sum.forEach(([k, v]) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...gray); doc.text(k, M + 4, y)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy); doc.text(String(v), W - M - 4, y, { align: 'right' }); y += 7
      })

      y += 8; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...navy); doc.text('Rincian per pemain', M, y); y += 5
      const cols = [{ x: M }, { x: M + 11 }, { x: M + 70 }, { x: M + 96 }, { x: M + 138 }, { x: W - M }]
      const heads = ['No', 'Nama', 'Status', 'Game', 'Iuran', 'Bayar']
      const al = ['left', 'left', 'left', 'right', 'right', 'right']
      function head() {
        doc.setFillColor(...blue); doc.rect(M, y, W - M * 2, 8, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        heads.forEach((t, i) => doc.text(t, cols[i].x, y + 5.5, { align: al[i] })); y += 8
      }
      head(); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      h.rows.forEach((r, i) => {
        if (y > 280) { doc.addPage(); y = 18; head(); doc.setFont('helvetica', 'normal'); doc.setFontSize(9) }
        if (i % 2) { doc.setFillColor(247, 249, 251); doc.rect(M, y, W - M * 2, 7, 'F') }
        doc.setTextColor(60, 66, 78)
        doc.text(String(i + 1), cols[0].x, y + 5)
        doc.text(r.name.length > 32 ? r.name.slice(0, 31) + '…' : r.name, cols[1].x, y + 5)
        doc.text(r.is_member ? 'Member' : 'Non-mbr', cols[2].x, y + 5)
        doc.text(String(r.gamesPlayed), cols[3].x, y + 5, { align: 'right' })
        doc.text(rupiah(r.total), cols[4].x, y + 5, { align: 'right' })
        doc.setTextColor(...(r.paid ? [5, 150, 105] : [220, 38, 38])); doc.text(r.paid ? 'Lunas' : 'Belum', cols[5].x, y + 5, { align: 'right' }); y += 7
      })
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...gray); doc.text(`Dibuat ${new Date().toLocaleString('id-ID')} · MabarKas`, M, 290)
      doc.save(`Rekap ${(sesi.name || 'Sesi').replace(/[^\w\s-]/g, '').trim()} ${sesi.date}.pdf`)
    } catch (e) { alert('Gagal membuat PDF: ' + e.message) } finally { setExporting(false) }
  }

  if (loading) return <p className="muted" style={{ padding: 30, textAlign: 'center' }}>Memuat...</p>
  const h = hitungIuran(sesi, attendees, games)

  return (
    <div className="fade-in" style={{ padding: '14px 16px 24px' }}>
      <div style={{ padding: '4px 4px 14px' }}>
        <h1 className="h1">Rekap sesi</h1>
        <p style={{ fontSize: 13, color: 'var(--t-3)', marginTop: 4, textTransform: 'capitalize' }}>{formatTanggal(sesi.date)}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Stat label="Pemain" value={`${h.rows.length}`} />
        <Stat label="Game" value={`${h.jumlahGame}`} />
        <Stat label="Cock" value={`${h.totalCock}`} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Stat label="Total tagihan" value={rupiah(h.totalTagihan)} />
        <Stat label="Terkumpul" value={rupiah(h.totalLunas)} accent="var(--mint)" />
      </div>
      {h.totalBelum > 0 && (
        <div className="glass" style={{ borderRadius: 16, padding: '13px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>Sisa belum bayar</span>
          <span style={{ fontSize: 15, color: 'var(--rose)', fontWeight: 700 }}>{rupiah(h.totalBelum)}</span>
        </div>
      )}

      <p className="section-label" style={{ margin: '14px 4px 10px' }}>Rincian · {h.rows.length} pemain</p>
      <div className="glass" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 18 }}>
        {h.rows.map((r, i) => (
          <div key={r.player_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < h.rows.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--t-3)', width: 16, flexShrink: 0 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</p>
              <p style={{ fontSize: 12, color: 'var(--t-3)' }}>{r.is_member ? 'Member' : 'Non-member'} · {r.gamesPlayed} game</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{rupiah(r.total)}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: r.paid ? 'var(--mint)' : 'var(--rose)' }}>{r.paid ? 'Lunas' : 'Belum'}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="cta" onClick={exportPDF} disabled={exporting}>
        <Icon name="file" size={18} /> {exporting ? 'Membuat PDF...' : 'Export rekap PDF'}
      </button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Icon } from '../components/ui'
import { useDialog } from '../components/Dialog'
import { supabase } from '../lib/supabase'
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
  const dlg = useDialog()
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
    if (!lib || !lib.jsPDF) { dlg.alert('Modul PDF belum termuat. Refresh halaman lalu ulangi.'); return }
    setExporting(true)
    try {
      const h = hitungIuran(sesi, attendees, games)
      const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' })
      const navy = [3, 30, 83], blue = [19, 104, 200], gray = [120, 128, 140], dark = [40, 46, 58]
      const M = 14, W = 210, RIGHT = W - M

      // ---- Header band ----
      doc.setFillColor(...navy); doc.rect(0, 0, W, 30, 'F')
      doc.setFillColor(...blue); doc.rect(0, 30, W, 1.2, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text('PB OASIS', M, 14)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 215, 240); doc.text('Rekap Sesi Mabar', M, 21)
      doc.setFontSize(9); doc.setTextColor(180, 200, 235)
      doc.text(formatTanggal(sesi.date), RIGHT, 14, { align: 'right' })
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255)
      doc.text(sesi.name || 'Sesi Mabar', RIGHT, 21, { align: 'right' })

      let y = 42

      // ---- Dua kartu pemasukan: Lapangan & Cock ----
      const cardW = (RIGHT - M - 6) / 2, cardH = 22
      function incomeCard(x, label, amount, sub, tint, txt) {
        doc.setFillColor(...tint); doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F')
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gray); doc.text(label, x + 6, y + 7)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...txt); doc.text(rupiah(amount), x + 6, y + 15)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray); doc.text(sub, x + 6, y + 19.5)
      }
      incomeCard(M, 'Pemasukan lapangan', h.totalCourt, `${h.jumlahNon} non-member x ${rupiah(h.courtFee)}`, [233, 240, 251], navy)
      incomeCard(M + cardW + 6, 'Pemasukan cock', h.totalBiayaCock, `${h.totalCock} biji x ${rupiah(h.cockPrice)}`, [251, 244, 224], [140, 95, 10])
      y += cardH + 6

      // ---- Ringkasan ----
      const sum = [
        ['Jumlah pemain', `${h.rows.length} (${h.jumlahMember} member / ${h.jumlahNon} non)`],
        ['Total game', `${h.jumlahGame}`],
        ['Cock terpakai', `${h.totalCock} biji`],
        ['Total tagihan', rupiah(h.totalTagihan), 'bold'],
        ['Terkumpul', rupiah(h.totalLunas), 'green'],
        ['Sisa belum bayar', rupiah(h.totalBelum), 'red'],
      ]
      const sumH = sum.length * 7 + 6
      doc.setFillColor(247, 249, 251); doc.roundedRect(M, y, RIGHT - M, sumH, 3, 3, 'F')
      y += 8
      sum.forEach(([k, v, style]) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...gray); doc.text(k, M + 5, y)
        if (style === 'green') doc.setTextColor(5, 150, 105)
        else if (style === 'red') doc.setTextColor(200, 45, 45)
        else doc.setTextColor(...navy)
        doc.setFont('helvetica', 'bold'); doc.text(String(v), RIGHT - 5, y, { align: 'right' }); y += 7
      })
      y += 8

      // ---- Rincian per pemain ----
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...navy); doc.text('Rincian per pemain', M, y); y += 4
      // kolom: No | Nama | Game | Biji | Lapangan | Cock | Total | Bayar
      const cx = { no: M, nama: M + 7, game: 76, biji: 90, lap: 122, cock: 152, total: 182, bayar: RIGHT }
      function head() {
        doc.setFillColor(...blue); doc.rect(M, y, RIGHT - M, 8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.3)
        doc.text('No', cx.no + 1, y + 5.4)
        doc.text('Nama', cx.nama, y + 5.4)
        doc.text('Game', cx.game, y + 5.4, { align: 'right' })
        doc.text('Biji', cx.biji, y + 5.4, { align: 'right' })
        doc.text('Lapangan', cx.lap, y + 5.4, { align: 'right' })
        doc.text('Cock', cx.cock, y + 5.4, { align: 'right' })
        doc.text('Total', cx.total, y + 5.4, { align: 'right' })
        doc.text('Bayar', cx.bayar, y + 5.4, { align: 'right' })
        y += 8
      }
      head(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3)
      h.rows.forEach((r, i) => {
        if (y > 274) { doc.addPage(); y = 16; head(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3) }
        if (i % 2) { doc.setFillColor(245, 248, 251); doc.rect(M, y, RIGHT - M, 7, 'F') }
        const nm = (r.is_member ? r.name + ' (M)' : r.name)
        doc.setTextColor(...dark)
        doc.text(String(i + 1), cx.no + 1, y + 5)
        doc.text(nm.length > 26 ? nm.slice(0, 25) + '…' : nm, cx.nama, y + 5)
        doc.text(String(r.gamesPlayed), cx.game, y + 5, { align: 'right' })
        doc.text(String(r.cockCount), cx.biji, y + 5, { align: 'right' })
        doc.text(r.courtShare > 0 ? rupiah(r.courtShare) : '–', cx.lap, y + 5, { align: 'right' })
        doc.text(r.cockShare > 0 ? rupiah(r.cockShare) : '–', cx.cock, y + 5, { align: 'right' })
        doc.setFont('helvetica', 'bold'); doc.text(rupiah(r.total), cx.total, y + 5, { align: 'right' }); doc.setFont('helvetica', 'normal')
        doc.setTextColor(...(r.paid ? [5, 150, 105] : [200, 45, 45])); doc.text(r.paid ? 'Lunas' : 'Belum', cx.bayar, y + 5, { align: 'right' })
        y += 7
      })
      // garis penutup
      doc.setDrawColor(...blue); doc.setLineWidth(0.4); doc.line(M, y, RIGHT, y)

      doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...gray)
      doc.text(`Dibuat ${new Date().toLocaleString('id-ID')} - MabarKas - Dikembangkan oleh Rie`, M, 290)

      const fname = `Rekap ${(sesi.name || 'Sesi').replace(/[^\w\s-]/g, '').trim()} ${sesi.date}.pdf`
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      if (isIOS) { const url = doc.output('bloburl'); const w = window.open(url, '_blank'); if (!w) doc.save(fname) }
      else doc.save(fname)
    } catch (e) { dlg.alert('Gagal membuat PDF: ' + e.message) } finally { setExporting(false) }
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

      {/* Pemasukan dipisah */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div className="glass" style={{ flex: 1, borderRadius: 16, padding: '13px 14px' }}>
          <p style={{ fontSize: 11, color: 'var(--t-3)', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>Dari lapangan</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 17, fontWeight: 700, color: '#bdd8ff' }}>{rupiah(h.totalCourt)}</p>
          <p style={{ fontSize: 11, color: 'var(--t-3)', marginTop: 2 }}>{h.jumlahNon} non-member</p>
        </div>
        <div className="glass" style={{ flex: 1, borderRadius: 16, padding: '13px 14px' }}>
          <p style={{ fontSize: 11, color: 'var(--t-3)', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>Dari cock</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 17, fontWeight: 700, color: 'var(--gold)' }}>{rupiah(h.totalBiayaCock)}</p>
          <p style={{ fontSize: 11, color: 'var(--t-3)', marginTop: 2 }}>{h.totalCock} biji</p>
        </div>
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
              <p style={{ fontSize: 11.5, color: 'var(--t-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.is_member ? 'Member' : 'Non'} · {r.gamesPlayed}g · {r.cockCount} biji{r.courtShare > 0 ? ` · lap ${rupiah(r.courtShare)}` : ''} · cock {rupiah(r.cockShare)}
              </p>
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

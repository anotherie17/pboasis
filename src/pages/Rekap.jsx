import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hitungIuran, rupiah } from '../lib/iuran'

function formatTanggal(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function StatBox({ label, value, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: 'var(--white)', borderRadius: 'var(--radius-md)',
      padding: '14px', boxShadow: 'var(--shadow-sm)',
    }}>
      <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '4px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: '18px', fontWeight: '700', color: accent || 'var(--navy)' }}>{value}</p>
    </div>
  )
}

export default function Rekap({ sesi, onBack }) {
  const [attendees, setAttendees] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

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

  function exportPDF() {
    const lib = window.jspdf
    if (!lib || !lib.jsPDF) {
      alert('Modul PDF belum termuat. Coba refresh halaman lalu ulangi.')
      return
    }
    setExporting(true)
    try {
      const h = hitungIuran(sesi, attendees, games)
      const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' })
      const navy = [3, 30, 83]
      const blue = [19, 104, 200]
      const gray = [120, 128, 140]
      const M = 16            // margin kiri
      const W = 210           // lebar a4
      let y = 0

      // Banner
      doc.setFillColor(...navy)
      doc.rect(0, 0, W, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
      doc.text('PB OASIS', M, 14)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.setTextColor(200, 215, 240)
      doc.text('Rekap Sesi Mabar', M, 21)

      y = 42
      doc.setTextColor(...navy)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
      doc.text(sesi.name || 'Sesi Mabar', M, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.setTextColor(...gray)
      y += 6
      doc.text(formatTanggal(sesi.date), M, y)

      // Ringkasan
      y += 10
      const sumRows = [
        ['Jumlah pemain', `${h.rows.length} (${h.jumlahMember} member / ${h.jumlahNon} non)`],
        ['Total game', `${h.jumlahGame}`],
        ['Cock terpakai', `${h.totalCock} biji = ${rupiah(h.totalBiayaCock)}`],
        ['Tarif lapangan (non-member)', rupiah(h.courtFee)],
        ['Total tagihan', rupiah(h.totalTagihan)],
        ['Terkumpul', rupiah(h.totalLunas)],
        ['Sisa belum bayar', rupiah(h.totalBelum)],
      ]
      doc.setDrawColor(225, 230, 238)
      doc.setFillColor(247, 249, 251)
      doc.rect(M, y, W - M * 2, sumRows.length * 7 + 4, 'F')
      y += 7
      sumRows.forEach(([k, v]) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        doc.setTextColor(...gray)
        doc.text(k, M + 4, y)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy)
        doc.text(String(v), W - M - 4, y, { align: 'right' })
        y += 7
      })

      // Tabel pemain
      y += 8
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...navy)
      doc.text('Rincian per pemain', M, y)
      y += 5

      const cols = [
        { t: 'No', x: M, w: 10, align: 'left' },
        { t: 'Nama', x: M + 11, w: 58, align: 'left' },
        { t: 'Status', x: M + 70, w: 24, align: 'left' },
        { t: 'Game', x: M + 96, w: 14, align: 'right' },
        { t: 'Iuran', x: M + 138, w: 24, align: 'right' },
        { t: 'Bayar', x: W - M, w: 16, align: 'right' },
      ]
      function drawHead() {
        doc.setFillColor(...blue)
        doc.rect(M, y, W - M * 2, 8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        cols.forEach(c => doc.text(c.t, c.align === 'right' ? c.x : c.x, y + 5.5, { align: c.align }))
        y += 8
      }
      drawHead()

      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      h.rows.forEach((r, i) => {
        if (y > 280) { doc.addPage(); y = 18; drawHead(); doc.setFont('helvetica', 'normal'); doc.setFontSize(9) }
        if (i % 2 === 1) { doc.setFillColor(247, 249, 251); doc.rect(M, y, W - M * 2, 7, 'F') }
        doc.setTextColor(60, 66, 78)
        doc.text(String(i + 1), cols[0].x, y + 5)
        const nama = r.name.length > 32 ? r.name.slice(0, 31) + '…' : r.name
        doc.text(nama, cols[1].x, y + 5)
        doc.text(r.is_member ? 'Member' : 'Non-mbr', cols[2].x, y + 5)
        doc.text(String(r.gamesPlayed), cols[3].x, y + 5, { align: 'right' })
        doc.text(rupiah(r.total), cols[4].x, y + 5, { align: 'right' })
        doc.setTextColor(...(r.paid ? [5, 150, 105] : [220, 38, 38]))
        doc.text(r.paid ? 'Lunas' : 'Belum', cols[5].x, y + 5, { align: 'right' })
        y += 7
      })

      // Footer
      const now = new Date().toLocaleString('id-ID')
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...gray)
      doc.text(`Dibuat ${now} · MabarKas`, M, 290)

      const safeName = (sesi.name || 'Sesi').replace(/[^\w\s-]/g, '').trim()
      doc.save(`Rekap ${safeName} ${sesi.date}.pdf`)
    } catch (e) {
      alert('Gagal membuat PDF: ' + e.message)
    } finally {
      setExporting(false)
    }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              Rekap Sesi
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '8px', marginLeft: '44px' }}>
          {formatTanggal(sesi.date)}
        </p>
      </div>

      {/* Stat boxes */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <StatBox label="Pemain" value={`${h.rows.length}`} />
          <StatBox label="Total game" value={`${h.jumlahGame}`} />
          <StatBox label="Cock" value={`${h.totalCock}`} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <StatBox label="Total tagihan" value={rupiah(h.totalTagihan)} />
          <StatBox label="Terkumpul" value={rupiah(h.totalLunas)} accent="var(--success)" />
        </div>
        {h.totalBelum > 0 && (
          <div style={{
            background: 'var(--danger-light)', borderRadius: 'var(--radius-md)', padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: '600' }}>Sisa belum bayar</span>
            <span style={{ fontSize: '15px', color: 'var(--danger)', fontWeight: '700' }}>{rupiah(h.totalBelum)}</span>
          </div>
        )}
      </div>

      {/* Rincian pemain */}
      <p style={{
        padding: '6px 16px 8px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.6px',
        color: 'var(--gray-400)', textTransform: 'uppercase',
      }}>Rincian · {h.rows.length} pemain</p>

      <div style={{ background: 'var(--white)' }}>
        {h.rows.map((r, i) => (
          <div key={r.player_id} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px',
            borderBottom: '1px solid var(--gray-100)',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--gray-400)', width: '18px', flexShrink: 0 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontWeight: '600', color: 'var(--navy)', fontSize: '14px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{r.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                {r.is_member ? 'Member' : 'Non-member'} · {r.gamesPlayed} game
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '14px' }}>{rupiah(r.total)}</p>
              <p style={{ fontSize: '11px', fontWeight: '600', color: r.paid ? 'var(--success)' : 'var(--danger)' }}>
                {r.paid ? 'Lunas' : 'Belum'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px',
        background: 'var(--white)', borderTop: '1px solid var(--gray-100)',
        boxShadow: '0 -4px 16px rgba(3,30,83,0.08)',
      }}>
        <button onClick={exportPDF} disabled={exporting}
          style={{
            width: '100%', padding: '15px', background: 'var(--navy)', color: 'var(--white)',
            borderRadius: 'var(--radius-sm)', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: exporting ? 0.7 : 1,
          }}>
          {exporting ? 'Membuat PDF...' : '📄 Export Rekap PDF'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui'
import { rupiah } from '../lib/iuran'

function Label({ children, hint }) {
  return (
    <>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t-2)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--t-3)', marginBottom: 8 }}>{hint}</p>}
    </>
  )
}

function RupiahInput({ value, onChange }) {
  return (
    <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, overflow: 'hidden' }}>
      <span style={{ padding: '14px 12px', color: 'var(--t-3)', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)' }}>Rp</span>
      <input type="number" min="0" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)}
        placeholder="0" style={{ flex: 1, padding: '14px 14px 14px 2px', border: 'none', background: 'transparent', fontSize: 15, color: '#fff', fontWeight: 500 }} />
    </div>
  )
}

export default function SetupSesi({ onSesiDibuat, onBack }) {
  const todayIso = new Date().toISOString().split('T')[0]
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayIso)
  const [cockPrice, setCockPrice] = useState('')
  const [courtFee, setCourtFee] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleMulai(e) {
    e.preventDefault()
    if (!name.trim() || !cockPrice || !courtFee) { setError('Isi semua field dulu ya.'); return }
    setLoading(true); setError('')

    const { data: existing } = await supabase.from('sessions').select('*').eq('date', date).maybeSingle()
    if (existing) {
      setLoading(false)
      alert(`Sudah ada sesi "${existing.name || 'Sesi'}" di tanggal ini. Sesi itu yang dibuka ya (harga/nama yang barusan diketik tidak dipakai). Mau sesi terpisah? Ganti tanggalnya.`)
      onSesiDibuat(existing); return
    }

    const { data, error: err } = await supabase.from('sessions').insert({
      name: name.trim(), date,
      cock_price_per_piece: parseInt(cockPrice),
      court_fee_nonmember: parseInt(courtFee),
    }).select().single()

    if (err) { setError('Gagal membuat sesi. Coba lagi.'); setLoading(false) }
    else onSesiDibuat(data)
  }

  return (
    <div className="scroll fade-in" style={{ padding: '14px 18px 28px' }}>
      <button className="btn-ghost" onClick={onBack} style={{ width: 'auto', padding: '8px 14px 8px 10px', marginBottom: 16 }}>
        <Icon name="back" size={18} /> Beranda
      </button>

      <div style={{ padding: '0 6px 22px' }}>
        <p className="eyebrow">Sesi baru</p>
        <h1 className="h1" style={{ marginTop: 4 }}>Setup sesi</h1>
      </div>

      <form onSubmit={handleMulai}>
        <div className="glass" style={{ borderRadius: 24, padding: 22 }}>
          <div style={{ marginBottom: 18 }}>
            <Label hint="Mis. Mabar Rabu, Mabar Pagi">Nama sesi</Label>
            <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Mabar Rabu" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <Label>Tanggal main (match day)</Label>
            <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <Label hint="Sesuai merek yang dipakai">Harga cock per biji</Label>
            <RupiahInput value={cockPrice} onChange={setCockPrice} />
          </div>
          <div>
            <Label hint="Flat per orang, dari panitia">Tarif lapangan non-member</Label>
            <RupiahInput value={courtFee} onChange={setCourtFee} />
          </div>

          {error && <p style={{ color: 'var(--rose)', fontSize: 13, marginTop: 14, fontWeight: 500 }}>{error}</p>}

          {name.trim() && cockPrice && courtFee && (
            <div style={{ marginTop: 18, padding: 14, borderRadius: 16, background: 'rgba(90,160,255,0.14)', border: '1px solid rgba(120,170,255,0.25)' }}>
              <p style={{ fontSize: 11, color: '#bdd8ff', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Ringkasan</p>
              {[['Sesi', name.trim()], ['Cock/biji', rupiah(cockPrice)], ['Tarif non-member', rupiah(courtFee)]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--t-2)' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="cta" disabled={loading || !name.trim() || !cockPrice || !courtFee} style={{ marginTop: 16 }}>
          {loading ? 'Menyimpan...' : 'Mulai sesi'} <Icon name="back" size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </form>
    </div>
  )
}

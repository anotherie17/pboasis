import { useState } from 'react'
import { supabase } from '../lib/supabase'

function InputField({ label, hint, value, onChange, prefix = 'Rp' }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: '600',
        color: 'var(--gray-600)',
        marginBottom: '6px',
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
      }}>{label}</label>
      {hint && (
        <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '8px' }}>{hint}</p>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: focused ? '1.5px solid var(--blue)' : '1.5px solid var(--gray-200)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--gray-50)',
        overflow: 'hidden',
        transition: 'border-color var(--transition)',
      }}>
        <span style={{
          padding: '12px 12px 12px 14px',
          color: 'var(--gray-400)',
          fontSize: '14px',
          fontWeight: '500',
          borderRight: '1px solid var(--gray-200)',
          background: 'var(--gray-100)',
        }}>{prefix}</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            padding: '12px 14px',
            border: 'none',
            background: 'transparent',
            fontSize: '15px',
            color: 'var(--gray-800)',
            fontWeight: '500',
          }}
          placeholder="0"
        />
      </div>
    </div>
  )
}

export default function SetupSesi({ onSesiDibuat }) {
  const [cockPrice, setCockPrice] = useState('')
  const [courtFee, setCourtFee] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  async function handleMulai(e) {
    e.preventDefault()
    if (!cockPrice || !courtFee) {
      setError('Isi semua field dulu ya.')
      return
    }
    setLoading(true)
    setError('')

    // Cek apakah sesi hari ini sudah ada
    const todayIso = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('sessions')
      .select('*')
      .eq('date', todayIso)
      .maybeSingle()

    if (existing) {
      onSesiDibuat(existing)
      return
    }

    const { data, error: err } = await supabase
      .from('sessions')
      .insert({
        date: todayIso,
        cock_price_per_piece: parseInt(cockPrice),
        court_fee_nonmember: parseInt(courtFee),
      })
      .select()
      .single()

    if (err) {
      setError('Gagal membuat sesi. Coba lagi.')
      setLoading(false)
    } else {
      onSesiDibuat(data)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gray-50)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--blue)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>Sesi Baru</p>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '600',
          color: 'var(--navy)',
          letterSpacing: '-0.3px',
        }}>Setup Sesi</h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--gray-400)',
          marginTop: '4px',
        }}>{today}</p>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: '480px',
        width: '100%',
      }}>
        <form onSubmit={handleMulai}>
          <InputField
            label="Harga cock per biji"
            hint="Sesuai merek yang dipakai hari ini"
            value={cockPrice}
            onChange={setCockPrice}
          />
          <InputField
            label="Tarif lapangan non-member"
            hint="Flat per orang per sesi"
            value={courtFee}
            onChange={setCourtFee}
          />

          {error && (
            <p style={{
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '16px',
              fontWeight: '500',
            }}>{error}</p>
          )}

          {/* Preview perhitungan */}
          {cockPrice && courtFee && (
            <div style={{
              background: 'var(--blue-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '20px',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: '600', marginBottom: '8px' }}>
                RINGKASAN
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Cock per biji</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>
                  Rp {parseInt(cockPrice || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Tarif non-member</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>
                  Rp {parseInt(courtFee || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !cockPrice || !courtFee}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !cockPrice || !courtFee ? 'var(--gray-200)' : 'var(--navy)',
              color: loading || !cockPrice || !courtFee ? 'var(--gray-400)' : 'var(--white)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '15px',
              fontWeight: '600',
              letterSpacing: '-0.1px',
            }}
          >
            {loading ? 'Menyimpan...' : 'Mulai Sesi →'}
          </button>
        </form>
      </div>
    </div>
  )
}

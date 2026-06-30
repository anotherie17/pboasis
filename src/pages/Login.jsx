import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon, Credit } from '../components/ui'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'pboasis@mabarkas.app', password,
    })
    if (error) { setError('Password salah. Coba lagi.'); setLoading(false) }
    else onLogin(data.session)
  }

  return (
    <div className="scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div className="glass" style={{ width: 72, height: 72, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: '#cfe4ff' }}>
          <Icon name="shuttle" size={34} stroke={1.8} />
        </div>
        <h1 className="h1">MabarKas</h1>
        <p className="eyebrow" style={{ marginTop: 6 }}>PB Oasis</p>
      </div>

      <div className="glass fade-in" style={{ borderRadius: 26, padding: 26, width: '100%', maxWidth: 360 }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 18, fontWeight: 500 }}>Masuk sebagai pengurus</p>
        <form onSubmit={handleLogin}>
          <input
            type="password" className="field" value={password} autoFocus
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••"
            style={error ? { borderColor: 'rgba(255,140,140,0.8)' } : undefined}
          />
          {error && <p style={{ color: 'var(--rose)', fontSize: 12, marginTop: 8, fontWeight: 500 }}>{error}</p>}
          <button type="submit" className="cta" disabled={loading || !password} style={{ marginTop: 16 }}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>

      <Credit style={{ marginTop: 26 }} />
    </div>
  )
}

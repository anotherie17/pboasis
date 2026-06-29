import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'pboasis@mabarkas.app',
      password,
    })

    if (error) {
      setError('Password salah. Coba lagi.')
      setLoading(false)
    } else {
      onLogin(data.session)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--navy)',
      padding: '24px',
    }}>
      {/* Logo area */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '28px',
        }}>
          🏸
        </div>
        <h1 style={{
          color: 'var(--white)',
          fontSize: '24px',
          fontWeight: '600',
          letterSpacing: '-0.3px',
        }}>MabarKas</h1>
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '13px',
          marginTop: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>PB Oasis</p>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        width: '100%',
        maxWidth: '360px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <p style={{
          fontSize: '13px',
          color: 'var(--gray-600)',
          marginBottom: '20px',
          fontWeight: '500',
        }}>Masuk sebagai pengurus</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--gray-600)',
              marginBottom: '6px',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                border: error ? '1.5px solid var(--danger)' : '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '15px',
                color: 'var(--gray-800)',
                background: error ? 'var(--danger-light)' : 'var(--gray-50)',
                transition: 'all var(--transition)',
              }}
            />
            {error && (
              <p style={{
                color: 'var(--danger)',
                fontSize: '12px',
                marginTop: '6px',
                fontWeight: '500',
              }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '13px',
              background: loading || !password ? 'var(--gray-200)' : 'var(--blue)',
              color: loading || !password ? 'var(--gray-400)' : 'var(--white)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '15px',
              fontWeight: '600',
              letterSpacing: '-0.1px',
            }}
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}

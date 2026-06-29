import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import SetupSesi from './pages/SetupSesi'
import CheckIn from './pages/CheckIn'

export default function App() {
  const [session, setSession] = useState(null)
  const [sesi, setSesi] = useState(null)
  const [page, setPage] = useState('checkin') // checkin | main
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (authLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--navy)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏸</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Memuat...</p>
      </div>
    </div>
  )

  if (!session) return <Login onLogin={setSession} />
  if (!sesi) return <SetupSesi onSesiDibuat={setSesi} />

  if (page === 'checkin') return (
    <CheckIn sesi={sesi} onLanjut={() => setPage('main')} />
  )

  // Placeholder sprint 3
  return (
    <div style={{ padding: '24px' }}>
      <p style={{ color: 'var(--navy)', fontWeight: '600' }}>
        ✅ Check-in selesai — Sprint 3: Catat Game
      </p>
      <button
        onClick={() => setPage('checkin')}
        style={{
          marginTop: '12px', padding: '10px 16px',
          background: 'var(--blue)', color: 'var(--white)',
          borderRadius: 'var(--radius-sm)', fontSize: '14px',
        }}>
        ← Balik ke Check-in
      </button>
    </div>
  )
}

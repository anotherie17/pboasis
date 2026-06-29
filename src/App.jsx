import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import SetupSesi from './pages/SetupSesi'
import CheckIn from './pages/CheckIn'
import CatatGame from './pages/CatatGame'
import Iuran from './pages/Iuran'
import Rekap from './pages/Rekap'

export default function App() {
  const [session, setSession] = useState(null)
  const [sesi, setSesi] = useState(null)
  const [page, setPage] = useState('checkin') // checkin | game | iuran | rekap
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
    <CheckIn sesi={sesi} onLanjut={() => setPage('game')} />
  )

  if (page === 'game') return (
    <CatatGame
      sesi={sesi}
      onBack={() => setPage('checkin')}
      onLanjut={() => setPage('iuran')}
    />
  )

  if (page === 'iuran') return (
    <Iuran
      sesi={sesi}
      onBack={() => setPage('game')}
      onLanjut={() => setPage('rekap')}
    />
  )

  // page === 'rekap'
  return (
    <Rekap sesi={sesi} onBack={() => setPage('iuran')} />
  )
}

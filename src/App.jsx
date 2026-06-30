import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Icon } from './components/ui'
import Login from './pages/Login'
import Beranda from './pages/Beranda'
import SetupSesi from './pages/SetupSesi'
import DaftarMember from './pages/DaftarMember'
import SesiWorkspace from './pages/SesiWorkspace'

function Shell({ children }) {
  return (
    <div className="app-shell">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      {children}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState('beranda') // beranda | setup | member | sesi
  const [sesi, setSesi] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => l.subscription.unsubscribe()
  }, [])

  if (authLoading) return (
    <Shell>
      <div className="scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#cfe4ff' }}>
          <Icon name="shuttle" size={36} stroke={1.8} />
          <p style={{ color: 'var(--t-3)', fontSize: 13, marginTop: 10 }}>Memuat...</p>
        </div>
      </div>
    </Shell>
  )

  if (!session) return <Shell><Login onLogin={setSession} /></Shell>

  function bukaSesi(s) { setSesi(s); setView('sesi') }

  return (
    <Shell>
      {view === 'beranda' && (
        <Beranda
          onSesiBaru={() => setView('setup')}
          onMember={() => setView('member')}
          onBukaSesi={bukaSesi}
        />
      )}
      {view === 'setup' && (
        <SetupSesi onBack={() => setView('beranda')} onSesiDibuat={bukaSesi} />
      )}
      {view === 'member' && (
        <DaftarMember onBack={() => setView('beranda')} />
      )}
      {view === 'sesi' && sesi && (
        <SesiWorkspace sesi={sesi} onExit={() => { setView('beranda'); setSesi(null) }} />
      )}
    </Shell>
  )
}

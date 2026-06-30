// Pop-up konfirmasi/alert bergaya kaca (pengganti confirm()/alert() bawaan browser).
import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './ui'

const Ctx = createContext(null)
export function useDialog() { return useContext(Ctx) }

export function DialogProvider({ children }) {
  const [d, setD] = useState(null)

  const confirm = useCallback((message, opts = {}) => new Promise(resolve => {
    setD({ kind: 'confirm', message, title: opts.title || 'Konfirmasi', danger: opts.danger,
      okText: opts.okText || 'Oke', cancelText: opts.cancelText || 'Batal', resolve })
  }), [])

  const alert = useCallback((message, opts = {}) => new Promise(resolve => {
    setD({ kind: 'alert', message, title: opts.title || 'Info', okText: opts.okText || 'Oke', resolve })
  }), [])

  function done(val) { d?.resolve(val); setD(null) }

  return (
    <Ctx.Provider value={{ confirm, alert }}>
      {children}
      {d && createPortal(
        <div onClick={() => done(d.kind === 'confirm' ? false : true)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(4,12,32,0.66)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="glass-strong fade-in"
            style={{ width: '100%', maxWidth: 340, borderRadius: 24, padding: 22, textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: d.danger ? 'rgba(255,140,140,0.16)' : 'rgba(90,160,255,0.18)', color: d.danger ? 'var(--rose)' : '#bdd8ff', border: `1px solid ${d.danger ? 'rgba(255,140,140,0.3)' : 'rgba(120,170,255,0.3)'}` }}>
              <Icon name={d.danger ? 'trash' : 'shuttle'} size={24} stroke={1.9} />
            </div>
            {d.title && <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 7 }}>{d.title}</p>}
            <p style={{ fontSize: 14, color: 'var(--t-2)', lineHeight: 1.5, marginBottom: 20 }}>{d.message}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {d.kind === 'confirm' && (
                <button className="btn-ghost" onClick={() => done(false)} style={{ flex: 1 }}>{d.cancelText}</button>
              )}
              <button className="cta" onClick={() => done(true)} style={{ flex: 1, ...(d.danger ? { background: 'linear-gradient(135deg,#ff7a7a,#e24a4a)', boxShadow: '0 12px 28px -10px rgba(230,80,80,0.6)' } : {}) }}>
                {d.okText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Ctx.Provider>
  )
}

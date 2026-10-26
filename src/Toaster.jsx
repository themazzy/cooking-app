import { useEffect, useRef, useState } from 'react'
import { dismissToast, onToast } from './lib/toast.js'
import Icon from './Icon.jsx'

const ICON = { ok: 'check', error: 'close', info: 'info' }

/** The toasts from lib/toast.js, stacked above the tab bar, and the bar shown while syncing. */
export default function Toaster() {
  const [toasts, setToasts] = useState([])
  const [working, setWorking] = useState(false)
  const timers = useRef(new Map())

  useEffect(() => {
    const hide = (id) => {
      clearTimeout(timers.current.get(id))
      timers.current.delete(id)
      // Marked as leaving first so it can fade out
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id || !t.leaving)), 200)
    }
    const off = onToast((e) => {
      if (e.type === 'working') return setWorking(e.on)
      if (e.type === 'hide') return hide(e.id)
      const t = e.toast
      clearTimeout(timers.current.get(t.id))
      if (t.ms) timers.current.set(t.id, setTimeout(() => hide(t.id), t.ms))
      setToasts((list) => [...list.filter((x) => x.id !== t.id), t].slice(-3))
    })
    const all = timers.current
    return () => {
      off()
      for (const timer of all.values()) clearTimeout(timer)
    }
  }, [])

  return (
    <>
      {working && <div className="top-progress" role="progressbar" aria-label="Syncing" />}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}${t.leaving ? ' leaving' : ''}`} role={t.kind === 'error' ? 'alert' : 'status'} onClick={() => dismissToast(t.id)}>
            {t.kind === 'loading' ? <span className="toast-spin" aria-hidden="true" /> : <span className="toast-icon" aria-hidden="true"><Icon name={ICON[t.kind]} size={14} strokeWidth={3} /></span>}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  )
}

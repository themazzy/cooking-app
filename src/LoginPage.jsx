import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import Icon from './Icon.jsx'

/** First screen when nobody is signed in: sign in or create an account. */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) {
          // Accounts are confirmed on the server, so signing in works right away
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) throw signInError
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMessage(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="login-logo" aria-hidden="true">
        <Icon name="pot" size={52} />
      </div>
      <h1>Simmer</h1>
      <p className="sub">Recipes from reels and websites, shared with your household.</p>
      <form className="card account" onSubmit={submit}>
        <h2>{mode === 'signup' ? 'Create an account' : 'Sign in'}</h2>
        <input type="email" autoComplete="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder={mode === 'signup' ? 'Password (at least 6 characters)' : 'Password'}
          required
          minLength={mode === 'signup' ? 6 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {message && <p className="hint error">{message}</p>}
        <button type="button" className="link" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? 'I already have an account' : 'New here? Create an account'}
        </button>
      </form>
    </main>
  )
}

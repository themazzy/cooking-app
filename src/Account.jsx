import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { forgetHousehold, getHousehold, joinHousehold } from './lib/sync.js'

/** Sign-in for syncing, and the household (shared recipes and list) with its invite code. */
export default function Account({ user, onChanged }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [household, setHousehold] = useState(null)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return setHousehold(null)
    getHousehold()
      .then(setHousehold)
      .catch((e) => setMessage(e.message))
  }, [user])

  const run = async (fn) => {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      setMessage(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="account">
        <strong>Sync between phones</strong>
        <p className="hint">Sign in to share recipes, the meal plan and the shopping list with your household. Saved videos stay on the phone that saved them.</p>
        <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="row">
          <button
            disabled={busy || !email || !password}
            onClick={() =>
              run(async () => {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                onChanged()
              })
            }
          >
            Sign in
          </button>
          <button
            className="secondary"
            disabled={busy || !email || password.length < 6}
            onClick={() =>
              run(async () => {
                const { data, error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                if (!data.session) {
                  // New accounts are confirmed on the server, so signing in works right away
                  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
                  if (signInError) setMessage('Account created. Open the confirmation link in your email, then sign in here.')
                }
                onChanged()
              })
            }
          >
            Create account
          </button>
        </div>
        {message && <p className="hint">{message}</p>}
      </div>
    )
  }

  return (
    <div className="account">
      <strong>Signed in as {user.email}</strong>
      {household && (
        <p className="hint">
          Household invite code: <strong className="code">{household.invite_code}</strong>. Someone with their own account can
          enter it below to share your recipes and shopping list.
        </p>
      )}
      <div className="row">
        <input className="grow" placeholder="Join with a code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button
          className="secondary"
          disabled={busy || code.trim().length < 6}
          onClick={() =>
            run(async () => {
              setHousehold(await joinHousehold(code))
              setCode('')
              onChanged()
            })
          }
        >
          Join
        </button>
      </div>
      <div className="row">
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await supabase.auth.signOut()
              forgetHousehold()
              onChanged()
            })
          }
        >
          Sign out
        </button>
      </div>
      {message && <p className="hint">{message}</p>}
    </div>
  )
}

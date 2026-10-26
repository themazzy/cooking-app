import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { forgetHousehold, getHousehold, joinHousehold } from './lib/sync.js'
import { clearDevice, listRecipes } from './lib/store.js'

// What this phone keeps of the signed-in household, besides the recipes (settings stay)
const HOUSEHOLD_KEYS = ['shopping', 'pantry', 'catalog', 'deleted', 'history'].map((k) => `cooking-app:${k}`)

/** Sign-in for syncing, and the household (shared recipes and list) with its invite code. */
export default function Account({ user, onChanged }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [household, setHousehold] = useState(null)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [bring, setBring] = useState(true)
  const [signingOut, setSigningOut] = useState(null) // { unsynced } while asking

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

  const signOut = (clear) =>
    run(async () => {
      await supabase.auth.signOut()
      forgetHousehold()
      if (clear) {
        await clearDevice()
        for (const k of HOUSEHOLD_KEYS) localStorage.removeItem(k)
        // Starts again from the empty phone
        window.location.replace('#/')
        window.location.reload()
        return
      }
      setSigningOut(null)
      onChanged()
    })

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
              setHousehold(await joinHousehold(code, { bring }))
              setCode('')
              onChanged()
            })
          }
        >
          Join
        </button>
      </div>
      <label>
        <input type="checkbox" checked={bring} onChange={(e) => setBring(e.target.checked)} /> Bring the recipes on this phone into the household I join
      </label>
      {signingOut ? (
        <div className="card stock-plan">
          <strong>Also clear this phone?</strong>
          <p className="hint">
            Clearing removes the recipes, saved videos, shopping list and pantry copy from this phone; they stay in the household for the next sign-in.
            {signingOut.unsynced > 0 && ` ${signingOut.unsynced} recipe${signingOut.unsynced > 1 ? 's have' : ' has'} not synced yet and would be lost.`}
          </p>
          <div className="row">
            <button className="secondary" disabled={busy} onClick={() => signOut(false)}>
              Keep them
            </button>
            <button className="secondary" disabled={busy} onClick={() => signOut(true)}>
              Clear this phone
            </button>
            <button className="link" onClick={() => setSigningOut(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const unsynced = (await listRecipes()).filter((r) => r.syncedAt !== r.updatedAt).length
                setSigningOut({ unsynced })
              })
            }
          >
            Sign out
          </button>
        </div>
      )}
      {message && <p className="hint">{message}</p>}
    </div>
  )
}

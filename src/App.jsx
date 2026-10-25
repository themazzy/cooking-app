import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { canFetchCrossSite, getBytes } from './lib/http.js'
import { decodeToMono16k } from './lib/audio.js'
import { MODELS, transcribe } from './lib/transcribe.js'
import { pickRecipe } from './lib/recipeSource.js'
import { parseRecipeText } from './lib/ingredients.js'
import { toEditable } from './lib/recipeEdit.js'
import RecipeEditor from './RecipeEditor.jsx'
import { debugReport, extractUrl, loadReel } from './lib/reel/index.js'
import { INSTAGRAM_LOGIN_URL, isInstagramSignedIn } from './lib/reel/instagram.js'
import { CapacitorCookies } from '@capacitor/core'

const SETTINGS_KEY = 'cooking-app:settings'
const HISTORY_KEY = 'cooking-app:history'

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked; history is a convenience only
  }
}

/** Android share intents arrive as cookingapp://share?text=… (see MainActivity) */
function sharedTextFromUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'cookingapp:' ? u.searchParams.get('text') : null
  } catch {
    return null
  }
}

export default function App() {
  const native = canFetchCrossSite()
  const [settings, setSettings] = useState(() => readStore(SETTINGS_KEY, { model: 'base', language: 'auto', transcribe: true }))
  const [link, setLink] = useState('')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])
  const [download, setDownload] = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(() => readStore(HISTORY_KEY, []))
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)
  const [igSignedIn, setIgSignedIn] = useState(false)
  const runRef = useRef(null)

  useEffect(() => writeStore(SETTINGS_KEY, settings), [settings])

  // Re-checked whenever the app comes back to the front: signing in happens
  // on Instagram's own page, and Back may restore this page from cache
  useEffect(() => {
    if (!native) return
    const check = () => isInstagramSignedIn().then(setIgSignedIn)
    check()
    window.addEventListener('pageshow', check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    const sub = CapApp.addListener('resume', check)
    return () => {
      window.removeEventListener('pageshow', check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
      sub.then((h) => h.remove())
    }
  }, [native])

  const signOutInstagram = async () => {
    try {
      await CapacitorCookies.clearCookies({ url: 'https://www.instagram.com' })
    } finally {
      setIgSignedIn(await isInstagramSignedIn())
    }
  }

  const step = (text, kind = 'info') => setLog((l) => [...l, { text, kind, at: Date.now() }])

  const saveResult = useCallback((r) => {
    setResult(r)
    setHistory((h) => {
      const next = [r, ...h.filter((x) => x.url !== r.url || !r.url)].slice(0, 20)
      writeStore(HISTORY_KEY, next)
      return next
    })
  }, [])

  const runTranscription = useCallback(
    async (buffer) => {
      step('Reading the audio track…')
      const audio = await decodeToMono16k(buffer)
      step(`Audio is ${Math.round(audio.length / 16000)} s long. Transcribing on this device…`)
      const started = Date.now()
      const text = await transcribe(audio, {
        model: settings.model,
        language: settings.language,
        onProgress: (p) => {
          if (p.status === 'progress' && p.total) setDownload({ file: p.file, pct: Math.round((p.loaded / p.total) * 100) })
          if (p.status === 'ready') setDownload(null)
        },
        onStatus: () => setDownload(null),
      })
      step(`Transcript ready in ${Math.round((Date.now() - started) / 1000)} s.`, 'ok')
      return text
    },
    [settings.model, settings.language],
  )

  const importLink = useCallback(
    async (rawLink) => {
      const url = extractUrl(rawLink) ?? rawLink.trim()
      if (!url) return
      setBusy(true)
      setLog([])
      setResult(null)
      setReport(null)
      setCopied(false)
      let r = { url, at: Date.now() }
      let reel = null
      let failure = null
      try {
        step('Loading the reel page…')
        reel = await loadReel(url)
        if (reel.signedIn != null) setIgSignedIn(reel.signedIn)
        r = { ...r, platform: reel.platform, author: reel.author, description: reel.description, comments: (reel.comments ?? []).slice(0, 30) }
        step(reel.description ? 'Found the description.' : 'No description found.', reel.description ? 'ok' : 'warn')
        if (reel.platform === 'instagram') {
          step(
            r.comments.length
              ? `Found ${r.comments.length} comment${r.comments.length > 1 ? 's' : ''}.`
              : reel.signedIn
                ? 'No comments found.'
                : 'No comments found. Instagram may only show them when signed in (Settings).',
            r.comments.length ? 'ok' : 'warn',
          )
        }
        setResult(r)

        if (settings.transcribe) {
          if (!reel.videoUrl) {
            step('Could not find the video file, so no transcript.', 'warn')
          } else {
            step('Downloading the video…')
            const bytes = await getBytes(reel.videoUrl, { headers: reel.downloadHeaders })
            step(`Downloaded ${(bytes.byteLength / 1e6).toFixed(1)} MB.`)
            r = { ...r, transcript: await runTranscription(bytes) }
          }
        }
      } catch (err) {
        failure = err.message || String(err)
        step(failure, 'error')
      } finally {
        if (r.description || r.transcript) saveResult(r)
        // Always available, so a wrong result can be reported too
        setReport(
          debugReport({
            url,
            platform: reel?.platform,
            found: { description: !!reel?.description, video: !!reel?.videoUrl, comments: reel?.comments?.length ?? 0 },
            comments: (reel?.comments ?? []).map((c) => ({ ...c, text: c.text.slice(0, 300) })),
            errors: [...(reel?.errors ?? []), ...(failure ? [failure] : [])],
          }),
        )
        setDownload(null)
        setBusy(false)
      }
    },
    [settings.transcribe, runTranscription, saveResult],
  )
  runRef.current = importLink

  // Links shared from Instagram / TikTok / Facebook into the app
  useEffect(() => {
    if (!native) return
    const handle = (url) => {
      const text = sharedTextFromUrl(url)
      const shared = extractUrl(text)
      if (shared) {
        setLink(shared)
        runRef.current?.(shared)
      }
    }
    CapApp.getLaunchUrl().then((r) => r?.url && handle(r.url))
    const sub = CapApp.addListener('appUrlOpen', (e) => handle(e.url))
    return () => {
      sub.then((s) => s.remove())
    }
  }, [native])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setLog([])
    try {
      const transcript = await runTranscription(await file.arrayBuffer())
      saveResult({ url: null, platform: 'file', author: file.name, description: pasted || null, transcript, at: Date.now() })
    } catch (err) {
      step(err.message || String(err), 'error')
    } finally {
      setDownload(null)
      setBusy(false)
    }
  }

  const onPasteParse = () => {
    if (!pasted.trim()) return
    saveResult({ url: null, platform: 'pasted', description: pasted, at: Date.now() })
  }

  const parsed = useMemo(() => {
    if (!result) return null
    return pickRecipe(result)
  }, [result])
  // What the user edited wins over what the parser found
  const recipe = useMemo(() => result?.recipe ?? toEditable(parsed), [result, parsed])

  // Edits go back into the same history entry
  const updateResult = (r) => {
    setResult(r)
    setHistory((h) => {
      const next = h.map((x) => (x.at === r.at ? r : x))
      writeStore(HISTORY_KEY, next)
      return next
    })
  }

  return (
    <main>
      <header>
        <h1>Cooking App</h1>
        <p className="sub">Reel import test · {native ? 'Android app' : 'website'}</p>
      </header>

      <section className="card">
        <label htmlFor="link">Reel link (Instagram, TikTok, Facebook)</label>
        <div className="row">
          <input
            id="link"
            type="url"
            inputMode="url"
            placeholder="https://www.instagram.com/reel/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && importLink(link)}
          />
          <button disabled={busy || !link.trim() || !native} onClick={() => importLink(link)}>
            Get recipe
          </button>
        </div>
        {!native && (
          <p className="hint">
            Websites can't load Instagram, TikTok or Facebook pages. Use the Android app for links, or paste the description
            and upload the video below.
          </p>
        )}

        <details>
          <summary>Settings</summary>
          <div className="settings">
            <label>
              <input
                type="checkbox"
                checked={settings.transcribe}
                onChange={(e) => setSettings({ ...settings, transcribe: e.target.checked })}
              />{' '}
              Transcribe the audio
            </label>
            <label>
              Speech model{' '}
              <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
                {Object.entries(MODELS).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Language{' '}
              <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
                <option value="auto">Detect</option>
                <option value="czech">Czech</option>
                <option value="english">English</option>
              </select>
            </label>
            <p className="hint">The speech model downloads once on first use, then works offline.</p>
            {native && (
              <div>
                <strong>Instagram account:</strong> {igSignedIn ? 'signed in' : 'not signed in'}
                <p className="hint">
                  Some reels are shown only to logged-in users. Signing in opens Instagram inside this app; when you are
                  logged in, press Back until you return here. The login stays on this phone.
                </p>
                <div className="row">
                  {igSignedIn ? (
                    <button className="secondary" onClick={signOutInstagram}>
                      Sign out of Instagram
                    </button>
                  ) : (
                    <button className="secondary" onClick={() => (window.location.href = INSTAGRAM_LOGIN_URL)}>
                      Sign in to Instagram
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </details>
      </section>

      <section className="card">
        <label htmlFor="pasted">Or paste a description</label>
        <textarea id="pasted" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        <div className="row">
          <button className="secondary" disabled={busy || !pasted.trim()} onClick={onPasteParse}>
            Read ingredients
          </button>
          <label className="button secondary">
            Transcribe a video file
            <input type="file" accept="video/*,audio/*" hidden disabled={busy} onChange={onFile} />
          </label>
        </div>
      </section>

      {(log.length > 0 || download) && (
        <section className="card log" aria-live="polite">
          {log.map((l) => (
            <div key={l.at + l.text} className={`log-${l.kind}`}>
              {l.text}
            </div>
          ))}
          {download && (
            <div>
              Downloading speech model ({download.file}): {download.pct}%
              <progress max="100" value={download.pct} />
            </div>
          )}
          {busy && <div className="spinner">Working…</div>}
          {report && !busy && (
            <div className="row">
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(report)
                    setCopied(true)
                  } catch {
                    setCopied(false)
                  }
                }}
              >
                {copied ? 'Copied, paste it to Claude' : 'Copy debug report'}
              </button>
            </div>
          )}
        </section>
      )}

      {result && (
        <section className="card">
          <h2>
            {result.platform} {result.author ? `· ${result.author}` : ''}
          </h2>

          <RecipeEditor
            recipe={recipe}
            title={result.description?.split('\n')[0]}
            source={result.recipe ? null : parsed?.source}
            onChange={(next) => updateResult({ ...result, recipe: next })}
            onReset={() => {
              const { recipe: _edited, ...rest } = result
              updateResult(rest)
            }}
          />

          {result.comments?.length > 0 && (
            <details open={!!parsed?.source?.includes('comment')}>
              <summary>
                Comments ({result.comments.length}){parsed?.source?.includes('comment') ? ` · recipe from the ${parsed.source}` : ''}
              </summary>
              <ul className="comments">
                {result.comments.map((c, n) => (
                  <li key={n}>
                    <div className="note">
                      {c.author ?? 'someone'}
                      {c.author && c.author === result.author ? ' · author' : ''}
                      {c.pinned ? ' · pinned' : ''}
                    </div>
                    <pre>{c.text}</pre>
                    <button
                      className="link"
                      onClick={() => updateResult({ ...result, recipe: toEditable(parseRecipeText(c.text)) })}
                    >
                      Use as recipe
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <h3>Description</h3>
          <pre>{result.description || '—'}</pre>
          {result.transcript != null && (
            <>
              <h3>Transcript</h3>
              <pre>{result.transcript || '(no speech found)'}</pre>
            </>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="card">
          <h3>Recent</h3>
          <ul className="history">
            {history.map((h) => (
              <li key={h.at}>
                <button className="link" onClick={() => setResult(h)}>
                  {h.platform} · {(h.description || h.transcript || '').slice(0, 60) || h.url}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

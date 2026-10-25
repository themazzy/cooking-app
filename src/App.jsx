import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { canFetchCrossSite, getBytes } from './lib/http.js'
import { decodeToMono16k } from './lib/audio.js'
import { MODELS, transcribe } from './lib/transcribe.js'
import { draftFromImport } from './lib/recipeDraft.js'
import { deleteRecipe, getRecipe, listRecipes, newId, persistStorage, putRecipe, putVideo } from './lib/store.js'
import { VIDEO_QUALITY, canShrinkVideo, shrinkVideo } from './lib/shrinkVideo.js'
import RecipePage from './RecipePage.jsx'
import RecipeList from './RecipeList.jsx'
import Account from './Account.jsx'
import { supabase } from './lib/supabase.js'
import { useCatalog } from './catalog.jsx'
import IngredientsPage from './IngredientsPage.jsx'
import { loadVideo, markDeleted, subscribeHousehold, syncRecipes, syncShopping } from './lib/sync.js'
import ShoppingList from './ShoppingList.jsx'
import { buildShoppingList } from './lib/scale.js'
import { debugReport, extractUrl, loadReel } from './lib/reel/index.js'
import { INSTAGRAM_LOGIN_URL, isInstagramSignedIn, setVideoMinShortSide } from './lib/reel/instagram.js'
import { CapacitorCookies } from '@capacitor/core'

const SETTINGS_KEY = 'cooking-app:settings'
const HISTORY_KEY = 'cooking-app:history'
const SHOPPING_KEY = 'cooking-app:shopping'

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

/** #/ (import), #/recipes, #/recipe/<id>, #/new (unsaved import), #/shopping, #/ingredients */
function parseRoute() {
  const [, page = '', id] = window.location.hash.replace(/^#/, '').split('/')
  return { page: page || 'home', id: id ? decodeURIComponent(id) : null }
}
const go = (hash, { replace = false } = {}) => {
  if (replace) window.location.replace(hash)
  else window.location.hash = hash
}

export default function App() {
  const native = canFetchCrossSite()
  const catalog = useCatalog()
  const catalogRefresh = useRef(null)
  catalogRefresh.current = catalog.refresh
  const [settings, setSettings] = useState(() => ({
    model: 'base',
    language: 'auto',
    transcribe: true,
    saveVideos: true,
    videoQuality: 'small',
    ...readStore(SETTINGS_KEY, {}),
  }))
  const [route, setRoute] = useState(parseRoute)
  const [recipes, setRecipes] = useState([])
  // The recipe on screen: { recipe, videoBlob, dirty }
  const [editing, setEditing] = useState(null)
  const [shrink, setShrink] = useState(null)
  const [shopping, setShopping] = useState(() => readStore(SHOPPING_KEY, null))
  const [selection, setSelection] = useState(null) // { recipeId: portions } while picking for a list
  const [user, setUser] = useState(null)
  const [syncState, setSyncState] = useState(null) // { at } or { error }
  const savedIds = useRef({})
  const shoppingRef = useRef(null) // draft key → saved id, for a shrink that finishes after saving
  const [link, setLink] = useState('')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])
  const [download, setDownload] = useState(null)
  const [history, setHistory] = useState(() => readStore(HISTORY_KEY, []))
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)
  const [igSignedIn, setIgSignedIn] = useState(false)
  const runRef = useRef(null)

  useEffect(() => writeStore(SETTINGS_KEY, settings), [settings])
  // HD copies need an HD download; otherwise the smallest one is enough
  useEffect(() => {
    setVideoMinShortSide(settings.saveVideos && settings.videoQuality === 'hd' ? 720 : 0)
  }, [settings.saveVideos, settings.videoQuality])

  const refreshRecipes = useCallback(() => listRecipes().then(setRecipes).catch(() => setRecipes([])), [])
  useEffect(() => {
    refreshRecipes()
    persistStorage()
    const onHash = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [refreshRecipes])

  shoppingRef.current = shopping

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const syncing = useRef(false)
  const runSync = useCallback(async () => {
    if (!user || syncing.current) return
    syncing.current = true
    try {
      await syncRecipes()
      await refreshRecipes()
      catalogRefresh.current?.()
      const list = await syncShopping(shoppingRef.current)
      if (list !== shoppingRef.current) {
        setShopping(list)
        writeStore(SHOPPING_KEY, list)
      }
      setSyncState({ at: Date.now() })
    } catch (err) {
      setSyncState({ error: err?.message ?? String(err) })
    } finally {
      syncing.current = false
    }
  }, [user, refreshRecipes])

  // Sync when signed in, when the app comes back, and when the other phone changes something
  useEffect(() => {
    if (!user) return
    runSync()
    let unsubscribe = null
    subscribeHousehold(() => runSync())
      .then((u) => (unsubscribe = u))
      .catch(() => {})
    const sub = CapApp.addListener('resume', runSync)
    return () => {
      unsubscribe?.()
      sub.then((h) => h.remove())
    }
  }, [user, runSync])

  // Opening a saved recipe loads it (and its video) from the device
  useEffect(() => {
    if (route.page !== 'recipe' || !route.id || editing?.recipe.id === route.id) return
    let cancelled = false
    ;(async () => {
      const recipe = await getRecipe(route.id)
      if (cancelled) return
      if (!recipe) return go('#/recipes', { replace: true })
      let videoBlob = null
      try {
        videoBlob = recipe.video || recipe.videoPath ? await loadVideo(recipe) : null
      } catch {
        videoBlob = null // offline, or the video is not uploaded yet
      }
      if (!cancelled) setEditing({ recipe, videoBlob, dirty: false })
    })()
    return () => {
      cancelled = true
    }
  }, [route, editing?.recipe.id])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.page, route.id])

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

  const remember = useCallback((r) => {
    setHistory((h) => {
      // History keeps the text only; videos live with saved recipes
      const next = [r, ...h.filter((x) => x.url !== r.url || !r.url)].slice(0, 20)
      writeStore(HISTORY_KEY, next)
      return next
    })
  }, [])

  const startShrink = useCallback((key, blob, quality) => {
    if (!canShrinkVideo()) return
    setShrink({ key, state: 'running', pct: 0 })
    shrinkVideo(blob, { ...(VIDEO_QUALITY[quality] ?? VIDEO_QUALITY.small), onProgress: (pct) => setShrink((s) => (s?.key === key ? { ...s, pct } : s)) })
      .then(async (small) => {
        const video = { size: small.size, originalSize: blob.size, type: small.type, shrunk: small !== blob }
        setShrink((s) => (s?.key === key ? { key, state: 'done' } : s))
        setEditing((e) => (e?.recipe.key === key ? { ...e, videoBlob: small, recipe: { ...e.recipe, video } } : e))
        // Already saved with the big original: replace it
        const id = savedIds.current[key]
        if (id) {
          await putVideo(id, small)
          const stored = await getRecipe(id)
          if (stored) await putRecipe({ ...stored, video, videoUploaded: false })
          refreshRecipes()
          runSyncRef.current?.()
        }
      })
      .catch((err) => setShrink((s) => (s?.key === key ? { key, state: 'failed', error: err?.message ?? String(err) } : s)))
  }, [refreshRecipes])

  /** Shows an import (or paste) as a new, unsaved recipe page. */
  const openDraft = useCallback(
    (r, videoBlob = null) => {
      const key = newId()
      const recipe = {
        ...draftFromImport(r),
        key,
        video: videoBlob ? { size: videoBlob.size, originalSize: videoBlob.size, type: videoBlob.type, shrunk: false } : null,
      }
      setEditing({ recipe, videoBlob, dirty: true })
      go('#/new')
      if (videoBlob && settings.saveVideos) startShrink(key, videoBlob, settings.videoQuality)
    },
    [settings.saveVideos, settings.videoQuality, startShrink],
  )

  const saveEditing = async () => {
    if (!editing) return
    const { recipe, videoBlob } = editing
    const id = recipe.id ?? newId()
    const now = Date.now()
    const keepVideo = !!videoBlob && settings.saveVideos
    const newVideo = keepVideo && !recipe.id
    const stored = {
      ...recipe,
      id,
      video: keepVideo ? recipe.video : null,
      ...(newVideo ? { videoUploaded: false } : {}),
      createdAt: recipe.createdAt ?? now,
      updatedAt: now,
    }
    await putRecipe(stored)
    if (keepVideo && !recipe.id) await putVideo(id, videoBlob)
    if (recipe.key) savedIds.current[recipe.key] = id
    setEditing({ recipe: stored, videoBlob: keepVideo ? videoBlob : null, dirty: false })
    refreshRecipes()
    runSync()
    go(`#/recipe/${encodeURIComponent(id)}`, { replace: route.page === 'new' })
  }

  const deleteEditing = async () => {
    if (!editing?.recipe.id) return
    await deleteRecipe(editing.recipe.id)
    markDeleted(editing.recipe.id)
    setEditing(null)
    refreshRecipes()
    runSync()
    go('#/recipes', { replace: true })
  }

  const shoppingTimer = useRef(null)
  const updateShopping = (list) => {
    const stamped = list ? { ...list, updatedAt: Date.now() } : list
    setShopping(stamped)
    shoppingRef.current = stamped
    writeStore(SHOPPING_KEY, stamped)
    // Ticking items quickly sends one update, not one per tap
    clearTimeout(shoppingTimer.current)
    shoppingTimer.current = setTimeout(() => runSyncRef.current?.(), 1500)
  }

  const makeShoppingList = () => {
    const picked = recipes.filter((r) => selection?.[r.id] != null)
    const parts = picked.map((recipe) => {
      const portions = selection[recipe.id]
      return { recipe, factor: recipe.servings ? portions / recipe.servings : portions, portions }
    })
    updateShopping({
      createdAt: Date.now(),
      recipes: parts.map((p) => ({ id: p.recipe.id, title: p.recipe.title, servings: p.recipe.servings, portions: p.portions })),
      items: buildShoppingList(parts, catalog.match).map((i) => ({ ...i, checked: false })),
    })
    setSelection(null)
    go('#/shopping')
  }

  const runSyncRef = useRef(null)
  runSyncRef.current = runSync

  const back = () => (window.history.length > 1 ? window.history.back() : go('#/'))

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
      setReport(null)
      setCopied(false)
      let r = { url, at: Date.now() }
      let reel = null
      let failure = null
      let videoBlob = null
      try {
        step('Loading the reel page…')
        reel = await loadReel(url)
        if (reel.signedIn != null) setIgSignedIn(reel.signedIn)
        r = { ...r, platform: reel.platform, author: reel.author, description: reel.description, comments: (reel.comments ?? []).slice(0, 30) }
        step(reel.description ? 'Found the description.' : 'No description found.', reel.description ? 'ok' : 'warn')
        if (reel.platform === 'web') {
          step(reel.structured ? 'Found the recipe data on the page.' : 'No recipe data on the page, reading its text instead.', reel.structured ? 'ok' : 'warn')
        } else if (reel.platform === 'instagram') {
          step(
            r.comments.length
              ? `Found ${r.comments.length} comment${r.comments.length > 1 ? 's' : ''}.`
              : reel.signedIn
                ? 'No comments found.'
                : 'No comments found. Instagram may only show them when signed in (Settings).',
            r.comments.length ? 'ok' : 'warn',
          )
        }
        if (reel.transcript) {
          r = { ...r, transcript: reel.transcript }
          step('Used the video\'s captions as the transcript.', 'ok')
        }
        const wantTranscript = settings.transcribe && !reel.transcript
        if (reel.platform !== 'web' && (wantTranscript || settings.saveVideos)) {
          if (!reel.videoUrl) {
            step(wantTranscript ? 'Could not find the video file, so no transcript.' : 'Could not find the video file.', 'warn')
          } else {
            step('Downloading the video…')
            const bytes = await getBytes(reel.videoUrl, { headers: reel.downloadHeaders })
            step(`Downloaded ${(bytes.byteLength / 1e6).toFixed(1)} MB.`)
            videoBlob = new Blob([bytes], { type: 'video/mp4' })
            if (wantTranscript) r = { ...r, transcript: await runTranscription(bytes) }
          }
        }
      } catch (err) {
        failure = err.message || String(err)
        step(failure, 'error')
      } finally {
        if (r.description || r.transcript || r.comments?.length) {
          remember(r)
          openDraft(r, videoBlob)
        }
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
    [settings.transcribe, settings.saveVideos, runTranscription, remember, openDraft],
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
      const r = { url: null, platform: 'file', author: null, description: pasted || null, transcript, at: Date.now() }
      remember(r)
      openDraft(r, file.type.startsWith('video/') ? file : null)
    } catch (err) {
      step(err.message || String(err), 'error')
    } finally {
      setDownload(null)
      setBusy(false)
    }
  }

  const onPasteParse = () => {
    if (!pasted.trim()) return
    const r = { url: null, platform: 'pasted', description: pasted, at: Date.now() }
    remember(r)
    openDraft(r)
  }

  const showing =
    editing && ((route.page === 'recipe' && editing.recipe.id === route.id) || (route.page === 'new' && !editing.recipe.id))
  if (route.page === 'recipe' && !showing) return <main className="hint">Loading…</main>
  if (showing) {
    return (
      <main>
        <RecipePage
          recipe={editing.recipe}
          videoBlob={editing.videoBlob}
          shrink={shrink?.key && shrink.key === editing.recipe.key ? shrink : null}
          dirty={editing.dirty}
          report={editing.recipe.id ? null : report}
          onChange={(recipe) => setEditing((e) => ({ ...e, recipe, dirty: true }))}
          onSave={saveEditing}
          onDelete={deleteEditing}
          onBack={back}
        />
      </main>
    )
  }

  if (route.page === 'recipes') {
    const count = selection ? Object.values(selection).filter((v) => v != null).length : 0
    return (
      <main>
        <div className="topbar">
          <button className="link" onClick={back}>
            ← Back
          </button>
          <button className="link" onClick={() => go('#/shopping')}>
            Shopping list →
          </button>
        </div>
        <section className="card">
          <h2>Saved recipes ({recipes.length})</h2>
          {recipes.length > 0 &&
            (selection ? (
              <p className="hint">Tick the recipes to shop for and set how many portions of each.</p>
            ) : (
              <div className="row">
                <button className="secondary" onClick={() => setSelection({})}>
                  Make a shopping list
                </button>
              </div>
            ))}
          <RecipeList
            recipes={recipes}
            onOpen={(id) => go(`#/recipe/${encodeURIComponent(id)}`)}
            selection={selection}
            onSelect={(id, portions) => setSelection((s) => ({ ...s, [id]: portions }))}
          />
        </section>
        {selection && (
          <div className="bottom-bar">
            <button className="secondary" onClick={() => setSelection(null)}>
              Cancel
            </button>
            <button disabled={!count} onClick={makeShoppingList}>
              Make list from {count} recipe{count === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </main>
    )
  }

  if (route.page === 'ingredients') {
    return (
      <main>
        <div className="topbar">
          <button className="link" onClick={back}>
            ← Back
          </button>
        </div>
        <IngredientsPage signedIn={!!user} />
      </main>
    )
  }

  if (route.page === 'shopping') {
    return (
      <main>
        <div className="topbar">
          <button className="link" onClick={back}>
            ← Back
          </button>
        </div>
        <ShoppingList
          list={shopping}
          onChange={updateShopping}
          onNew={() => {
            setSelection({})
            go('#/recipes')
          }}
        />
      </main>
    )
  }

  const unsaved = editing && !editing.recipe.id && editing.dirty

  return (
    <main>
      <header>
        <h1>Cooking App</h1>
        <p className="sub">{native ? 'Android app' : 'website'}</p>
      </header>

      {unsaved && (
        <section className="card">
          <button className="link" onClick={() => go('#/new')}>
            Continue with the unsaved recipe: {editing.recipe.title}
          </button>
        </section>
      )}

      <section className="card">
        <label htmlFor="link">Link to a reel, Short or recipe page</label>
        <div className="row">
          <input
            id="link"
            type="url"
            inputMode="url"
            placeholder="Instagram, TikTok, Facebook, YouTube or a recipe site"
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
              <input
                type="checkbox"
                checked={settings.saveVideos}
                onChange={(e) => setSettings({ ...settings, saveVideos: e.target.checked })}
              />{' '}
              Save a copy of the video with each recipe
            </label>
            {settings.saveVideos && (
              <label>
                Video quality{' '}
                <select value={settings.videoQuality} onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value })}>
                  <option value="small">Small, 480p (about 2.5 MB a minute)</option>
                  <option value="hd">HD, 720p (about 4 MB a minute, bigger download)</option>
                </select>
              </label>
            )}
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
            <Account user={user} onChanged={() => setSyncState(null)} />
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

      <nav className="row nav">
        <button className="secondary" onClick={() => go('#/recipes')}>
          Saved recipes ({recipes.length})
        </button>
        <button className="secondary" onClick={() => go('#/shopping')}>
          Shopping list{shopping ? ` (${shopping.items.filter((i) => !i.checked).length})` : ''}
        </button>
        <button className="secondary" onClick={() => go('#/ingredients')}>
          Ingredients
        </button>
      </nav>

      {user && (
        <p className="hint sync">
          {syncState?.error
            ? `Sync failed: ${syncState.error}`
            : syncState?.at
              ? `Synced ${new Date(syncState.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Syncing…'}{' '}
          <button className="link" onClick={runSync}>
            Sync now
          </button>
        </p>
      )}

      <section className="card">
        <h3>Saved recipes</h3>
        <RecipeList recipes={recipes} limit={5} onOpen={(id) => go(`#/recipe/${encodeURIComponent(id)}`)} />
        {recipes.length > 5 && (
          <button className="link" onClick={() => go('#/recipes')}>
            All {recipes.length} saved recipes →
          </button>
        )}
      </section>

      {history.length > 0 && (
        <section className="card">
          <h3>Recent imports</h3>
          <ul className="history">
            {history.map((h) => (
              <li key={h.at}>
                <button className="link" onClick={() => openDraft(h)}>
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { canFetchCrossSite, getBytes } from './lib/http.js'
import { decodeToMono16k } from './lib/audio.js'
import { MODELS, transcribe } from './lib/transcribe.js'
import { draftFromImport } from './lib/recipeDraft.js'
import { allCategories, allCuisines } from './lib/recipeMeta.js'
import { deleteRecipe, getRecipe, listRecipes, newId, persistStorage, putRecipe, putVideo } from './lib/store.js'
import { VIDEO_QUALITY, canShrinkVideo, shrinkVideo } from './lib/shrinkVideo.js'
import RecipePage from './RecipePage.jsx'
import RecipeList from './RecipeList.jsx'
import Account from './Account.jsx'
import LoginPage from './LoginPage.jsx'
import { emptyIngredient } from './lib/recipeEdit.js'
import { supabase } from './lib/supabase.js'
import { useCatalog } from './catalog.jsx'
import IngredientsPage from './IngredientsPage.jsx'
import PantryPage from './PantryPage.jsx'
import { addToPantry, cachedPantry, loadPantry, removeFromPantry, updatePantryItem } from './lib/pantry.js'
import { addTo, parseStock, shortfall } from './lib/stock.js'
import { loadVideo, markDeleted, subscribeHousehold, syncRecipes, syncShopping } from './lib/sync.js'
import ShoppingList from './ShoppingList.jsx'
import { addToList, makeList } from './lib/shopping.js'
import { videoThumb } from './lib/thumb.js'
import TabBar from './TabBar.jsx'
import { photoThumb, readRecipePhotos } from './lib/ocr.js'
import { EBAG_SEARCH } from './lib/ebag.js'
import { debugReport, detectPlatform, extractUrl, loadReel } from './lib/reel/index.js'
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

/** #/ (recipes), #/import, #/settings, #/recipe/<id>, #/new (unsaved recipe), #/shopping, #/ingredients */
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
    ebagLinks: true,
    units: 'original',
    photoLanguage: 'latin',
    ebagSearch: EBAG_SEARCH,
    ...readStore(SETTINGS_KEY, {}),
  }))
  const [route, setRoute] = useState(parseRoute)
  const [recipes, setRecipes] = useState([])
  // The recipe on screen: { recipe, videoBlob, dirty }
  const [editing, setEditing] = useState(null)
  const [shrink, setShrink] = useState(null)
  const [shopping, setShopping] = useState(() => readStore(SHOPPING_KEY, null))
  const [selection, setSelection] = useState(null) // { recipeId: portions } while picking for a list
  const [pantry, setPantry] = useState(cachedPantry)
  const [user, setUser] = useState(undefined) // undefined while the saved session loads
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
  // A saved copy needs a download at least as sharp; without one the smallest is enough
  useEffect(() => {
    setVideoMinShortSide(settings.saveVideos ? (VIDEO_QUALITY[settings.videoQuality] ?? VIDEO_QUALITY.small).shortSide : 0)
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
      setPantry(await loadPantry())
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
    subscribeHousehold((what) => {
      if (what === 'pantry') loadPantry().then(setPantry).catch(() => {})
      else if (what === 'ingredients') catalogRefresh.current?.()
      else runSync()
    })
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
      if (!recipe) return go('#/', { replace: true })
      let videoBlob = null
      try {
        videoBlob = recipe.video || recipe.videoPath ? await loadVideo(recipe) : null
      } catch {
        videoBlob = null // offline, or the video is not uploaded yet
      }
      if (cancelled) return
      setEditing({ recipe, videoBlob, dirty: false })
      // Recipes saved before thumbnails existed get one the first time they open
      if (videoBlob && !recipe.thumb) {
        const thumb = await videoThumb(videoBlob)
        if (!thumb) return
        const updated = { ...recipe, thumb, updatedAt: Date.now() }
        await putRecipe(updated)
        setEditing((e) => (e?.recipe.id === recipe.id ? { ...e, recipe: { ...e.recipe, thumb } } : e))
        refreshRecipes()
        runSyncRef.current?.()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [route, editing?.recipe.id, refreshRecipes])

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
    (r, videoBlob = null, extra = {}) => {
      const key = newId()
      const recipe = {
        ...draftFromImport(r),
        ...extra,
        key,
        video: videoBlob ? { size: videoBlob.size, originalSize: videoBlob.size, type: videoBlob.type, shrunk: false } : null,
      }
      setEditing({ recipe, videoBlob, dirty: true })
      go('#/new')
      if (videoBlob && settings.saveVideos) startShrink(key, videoBlob, settings.videoQuality)
    },
    [settings.saveVideos, settings.videoQuality, startShrink],
  )

  const addManually = () => {
    const key = newId()
    const recipe = { ...draftFromImport({ platform: null }), key, title: '', ingredients: [emptyIngredient()], steps: '', source: null }
    setEditing({ recipe, videoBlob: null, dirty: true })
    go('#/new')
  }

  // `patch` saves a single change straight from the reading view (a new photo)
  const saveEditing = async (patch) => {
    if (!editing) return
    const { videoBlob } = editing
    const recipe = { ...editing.recipe, ...patch }
    const id = recipe.id ?? newId()
    const now = Date.now()
    const keepVideo = !!videoBlob && settings.saveVideos
    const newVideo = keepVideo && !recipe.id
    const thumb = recipe.thumb ?? (keepVideo ? await videoThumb(videoBlob) : null)
    const stored = {
      ...recipe,
      id,
      thumb,
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
    go('#/', { replace: true })
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
    const entries = recipes.filter((r) => selection?.[r.id] != null).map((r) => ({ id: r.id, portions: selection[r.id] }))
    updateShopping(makeList(entries, recipes, catalog.match))
    setSelection(null)
    tabGo('#/shopping')
  }

  // Discarding a new recipe drops it; on a saved one it goes back to the saved version
  const discardEditing = async () => {
    const id = editing?.recipe.id
    if (!id) {
      setEditing(null)
      return go('#/', { replace: true })
    }
    const stored = await getRecipe(id)
    if (stored) setEditing((e) => ({ ...e, recipe: stored, dirty: false }))
  }

  // Tabs: from Recipes they open on top of it, so Back returns there; between tabs they replace each other
  const tabGo = (hash) => {
    if (parseRoute().page === 'home') return go(hash)
    if (hash === '#/') return window.history.length > 1 && tabStacked.current ? window.history.back() : go('#/', { replace: true })
    go(hash, { replace: true })
  }
  const tabStacked = useRef(false)
  useEffect(() => {
    if (route.page === 'home') tabStacked.current = true
  }, [route.page])

  const runSyncRef = useRef(null)
  runSyncRef.current = runSync

  // Staples below their minimum are kept on the shopping list; once restocked they leave it
  useEffect(() => {
    if (!user) return
    const items = shopping?.items ?? []
    const wanted = new Map(
      pantry.flatMap((p) => {
        const s = shortfall(p)
        return s ? [[`stock-${p.name.toLowerCase()}`, { p, need: s.need }]] : []
      }),
    )
    const split = (need) => {
      const [, qty = need, unit = ''] = need.match(/^(\S+)\s*(.*)$/) ?? []
      return { qty, unit }
    }
    let changed = false
    const next = []
    for (const i of items) {
      if (!String(i.key).startsWith('stock-') || i.checked) next.push(i)
      else if (!wanted.has(i.key)) changed = true
      else {
        const { qty, unit } = split(wanted.get(i.key).need)
        if (qty !== i.qty || unit !== i.unit) changed = true
        next.push({ ...i, qty, unit })
      }
    }
    for (const [key, { p, need }] of wanted) {
      if (items.some((i) => i.key === key)) continue
      changed = true
      next.push({ key, name: p.name, aisle: catalog.match(p.name)?.aisle ?? 'Other', ...split(need), extra: [], from: ['Staple'], checked: false })
    }
    if (changed) updateShopping({ ...(shopping ?? { createdAt: Date.now(), recipes: [] }), items: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantry, shopping, user])

  /** Takes what a cooked recipe used out of the stock; used-up items go, except staples. */
  const useStock = async (plan) => {
    for (const { item, next } of plan) {
      if ((parseStock(next)?.value ?? 1) <= 0 && !item.min_amount?.trim()) await removeFromPantry(item.id)
      else await updatePantryItem(item.id, { amount: next })
    }
    setPantry(await loadPantry())
  }

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
        step(detectPlatform(url) === 'web' ? 'Loading the page…' : 'Loading the reel page…')
        reel = await loadReel(url)
        if (reel.signedIn != null) setIgSignedIn(reel.signedIn)
        r = { ...r, platform: reel.platform, author: reel.author, description: reel.description, comments: (reel.comments ?? []).slice(0, 30), image: reel.image ?? null, meta: reel.meta ?? null }
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
        go('#/import')
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

  // Photos of a printed (or neatly handwritten) recipe, read on the phone
  const onPhotos = async (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setLog([])
    setReport(null)
    try {
      step(`Reading the text in ${files.length} photo${files.length > 1 ? 's' : ''}…`)
      const text = await readRecipePhotos(files, (p) => {
        if (p.status === 'loading language traineddata' || p.status === 'loading tesseract core') setDownload({ file: 'text reader', pct: Math.round((p.progress ?? 0) * 100) })
        else setDownload(null)
      }, settings.photoLanguage)
      if (!text.trim()) throw new Error('No text found in the photo. Try a sharper, closer photo in good light.')
      step(`Read ${text.split('\n').filter(Boolean).length} lines.`, 'ok')
      const r = { url: null, platform: 'photo', description: text, at: Date.now() }
      remember(r)
      openDraft(r, null, { thumb: await photoThumb(files[0]) })
    } catch (err) {
      step(err?.message ?? String(err), 'error')
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

  if (user === undefined) return <main className="hint">Loading…</main>
  if (!user) return <LoginPage />

  const topbar = (
    <div className="topbar">
      <button className="link" onClick={back}>
        ← Back
      </button>
    </div>
  )

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
          pantry={pantry}
          onSave={() => saveEditing()}
          onSavePatch={saveEditing}
          onDelete={deleteEditing}
          onDiscard={discardEditing}
          onBack={back}
          onAddToList={(entry) => updateShopping(addToList(shopping, entry, recipes, catalog.match))}
          onUseStock={useStock}
          units={settings.units}
          onUnits={(units) => setSettings((s) => ({ ...s, units }))}
          categories={allCategories(recipes)}
          cuisines={allCuisines(recipes)}
        />
      </main>
    )
  }

  const toBuy = shopping ? shopping.items.filter((i) => !i.checked).length : 0
  const tabbar = <TabBar page={route.page} badges={{ shopping: toBuy }} onGo={tabGo} />

  if (route.page === 'pantry') {
    return (
      <main className="tabbed">
        <PantryPage items={pantry} onChanged={() => loadPantry().then(setPantry)} />
        {tabbar}
      </main>
    )
  }

  if (route.page === 'ingredients') {
    return (
      <main className="tabbed">
        <IngredientsPage />
        {tabbar}
      </main>
    )
  }

  if (route.page === 'shopping') {
    return (
      <main className="tabbed">
        <ShoppingList
          list={shopping}
          pantry={pantry}
          ebag={settings.ebagLinks ? settings.ebagSearch || EBAG_SEARCH : null}
          units={settings.units}
          onToPantry={async (items) => {
            // Bought amounts add to what is at home when the units compare
            for (const i of items) {
              const have = pantry.find((p) => catalog.canonical(p.name) === catalog.canonical(i.name))
              if (have) await updatePantryItem(have.id, { amount: addTo(have.amount, i.qty, i.unit) })
              else await addToPantry(i.name, [i.qty, i.unit].filter(Boolean).join(' '))
            }
            setPantry(await loadPantry())
          }}
          onChange={updateShopping}
          onNew={() => {
            setSelection({})
            tabGo('#/')
          }}
        />
        {tabbar}
      </main>
    )
  }


  if (route.page === 'settings') {
    return (
      <main>
        {topbar}
        <section className="card">
          <h2>Settings</h2>
          <Account user={user} onChanged={() => setSyncState(null)} />
        </section>
        <section className="card">
          <h3>Importing</h3>
          <div className="settings">
            <label>
              <input type="checkbox" checked={settings.transcribe} onChange={(e) => setSettings({ ...settings, transcribe: e.target.checked })} />{' '}
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
                <option value="bulgarian">Bulgarian</option>
                <option value="english">English</option>
              </select>
            </label>
            <p className="hint">The speech model downloads once on first use, then works offline.</p>
            <label>
              <input type="checkbox" checked={settings.saveVideos} onChange={(e) => setSettings({ ...settings, saveVideos: e.target.checked })} />{' '}
              Save a copy of the video with each recipe
            </label>
            {settings.saveVideos && (
              <label>
                Video quality{' '}
                <select value={settings.videoQuality} onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value })}>
                  <option value="small">Standard, 480p (about 8 MB a minute)</option>
                  <option value="hd">HD, 720p (about 15 MB a minute)</option>
                  <option value="full">Full HD, 1080p (about 28 MB a minute, slow phones may stutter)</option>
                </select>
              </label>
            )}
          </div>
        </section>
        <section className="card">
          <h3>Units</h3>
          <div className="settings">
            <label>
              Show amounts{' '}
              <select value={settings.units} onChange={(e) => setSettings({ ...settings, units: e.target.value })}>
                <option value="original">As the recipe is written</option>
                <option value="metric">Metric (g, ml, °C)</option>
                <option value="imperial">US (oz, cups, °F)</option>
              </select>
            </label>
          </div>
          <p className="hint">Recipes keep their own units; this changes how amounts and oven temperatures are shown. You can also switch on any recipe.</p>
        </section>
        <section className="card">
          <h3>Shopping on eBag.bg</h3>
          <div className="settings">
            <label>
              <input type="checkbox" checked={settings.ebagLinks} onChange={(e) => setSettings({ ...settings, ebagLinks: e.target.checked })} /> Show eBag links on the
              shopping list
            </label>
            {settings.ebagLinks && (
              <label>
                Search link ({'{q}'} is the search word)
                <input className="grow" value={settings.ebagSearch} onChange={(e) => setSettings({ ...settings, ebagSearch: e.target.value })} />
              </label>
            )}
            {settings.ebagLinks && settings.ebagSearch !== EBAG_SEARCH && (
              <button className="link" onClick={() => setSettings({ ...settings, ebagSearch: EBAG_SEARCH })}>
                Reset the link
              </button>
            )}
          </div>
          <p className="hint">Each item opens eBag's search in Bulgarian. Your own ingredients search by their name, or by what they count as.</p>
        </section>
        {native && (
          <section className="card">
            <h3>Instagram</h3>
            <p>{igSignedIn ? 'Signed in' : 'Not signed in'}</p>
            <p className="hint">
              Some reels, and all comments, are shown only to logged-in users. Signing in opens Instagram inside this app;
              when you are logged in, press Back until you return here. The login stays on this phone.
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
          </section>
        )}
      </main>
    )
  }

  if (route.page === 'import') {
    return (
      <main>
        {topbar}
        <section className="card">
          <h2>Import a recipe</h2>
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
          <p className="hint">
            {native
              ? 'Tip: share a reel or page to Cooking App from Instagram, TikTok, YouTube or the browser.'
              : "Websites can't load Instagram, TikTok or Facebook pages. Use the Android app for links, or paste the text below."}
          </p>
        </section>

        <section className="card">
          <label>From photos</label>
          <p className="hint top">
            A cookbook page, a recipe card or a screenshot. Pick several photos for a recipe over more pages, in order; where they overlap, the repeated lines are kept once. Neat handwriting may work too.
          </p>
          <div className="segmented" role="group" aria-label="Text in the photos">
            {[
              ['latin', 'Czech / English'],
              ['bulgarian', 'Bulgarian'],
            ].map(([k, label]) => (
              <button key={k} className={settings.photoLanguage === k ? 'on' : ''} aria-pressed={settings.photoLanguage === k} onClick={() => setSettings({ ...settings, photoLanguage: k })}>
                {label}
              </button>
            ))}
          </div>
          <label className="button">
            📷 Take or pick photos
            <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={onPhotos} />
          </label>
        </section>

        <section className="card">
          <label htmlFor="pasted">Or paste a recipe text</label>
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
                {download.file === 'text reader' ? 'Downloading the text reader (once)' : `Downloading speech model (${download.file})`}: {download.pct}%
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

  // Main page: the household's recipes
  const unsaved = editing && !editing.recipe.id && editing.dirty
  const picked = selection ? Object.values(selection).filter((v) => v != null).length : 0

  return (
    <main className={selection ? 'selecting' : 'tabbed'}>
      <header className="main-header">
        <h1>{selection ? 'Pick recipes' : 'Recipes'}</h1>
        {!selection && (
          <div className="actions">
            <button className="small" onClick={() => go('#/import')}>
              Import
            </button>
            <button className="small secondary" onClick={addManually}>
              + Add
            </button>
            <button className="icon-button" aria-label="Settings" onClick={() => go('#/settings')}>
              ⚙
            </button>
          </div>
        )}
      </header>

      {unsaved && (
        <button className="banner" onClick={() => go('#/new')}>
          <span>
            <strong>Unsaved recipe</strong>
            <span className="note">{editing.recipe.title || 'New recipe'}</span>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      {selection ? (
        <p className="hint list-hint">Tap the recipes to shop for, and set the portions for each.</p>
      ) : (
        recipes.length > 1 && (
          <button className="link list-hint" onClick={() => setSelection({})}>
            🛒 Shop for several recipes
          </button>
        )
      )}

      <RecipeList
        recipes={recipes}
        onOpen={(id) => go(`#/recipe/${encodeURIComponent(id)}`)}
        selection={selection}
        onSelect={(id, portions) => setSelection((s) => ({ ...s, [id]: portions }))}
      />

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

      {selection ? (
        <div className="bottom-bar">
          <button className="secondary" onClick={() => setSelection(null)}>
            Cancel
          </button>
          <button disabled={!picked} onClick={makeShoppingList}>
            Make list from {picked} recipe{picked === 1 ? '' : 's'}
          </button>
        </div>
      ) : (
        tabbar
      )}
    </main>
  )
}

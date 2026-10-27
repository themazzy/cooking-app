import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { handleBackButton } from './lib/backButton.js'
import { canFetchCrossSite, getBytes } from './lib/http.js'
import { decodeToMono16k } from './lib/audio.js'
import { MODELS, transcribe } from './lib/transcribe.js'
import { PARSER_LANGS, draftFromImport, draftFromTranslatedSource, sourceLines } from './lib/recipeDraft.js'
import { commentFromScreenshot, recipeInText } from './lib/recipeSource.js'
import { TARGETS, detectLanguage, languageName, translateRecipe, translateTexts } from './lib/translate.js'
import { allCategories, allCuisines } from './lib/recipeMeta.js'
import { allTags, importTags } from './lib/recipeTags.js'
import { allCollections, collectionName, inCollection, renameCollection } from './lib/collections.js'
import { deleteRecipe, getRecipe, listRecipes, newId, persistStorage, putRecipe, putVideo } from './lib/store.js'
import { VIDEO_QUALITY, canShrinkVideo, shrinkVideo } from './lib/shrinkVideo.js'
import RecipePage from './RecipePage.jsx'
import { ALARM_SOUNDS, ring } from './lib/alarm.js'
import RecipeList from './RecipeList.jsx'
import Account from './Account.jsx'
import LoginPage from './LoginPage.jsx'
import { emptyIngredient } from './lib/recipeEdit.js'
import { supabase } from './lib/supabase.js'
import { useCatalog } from './catalog.jsx'
import IngredientsPage from './IngredientsPage.jsx'
import PantryPage from './PantryPage.jsx'
import { addToPantry, cachedPantry, loadPantry, removeFromPantry, updatePantryItem } from './lib/pantry.js'
import { addTo, isOut, shortfall, usesUp } from './lib/stock.js'
import { loadPhoto, loadVideo, markDeleted, subscribeHousehold, syncRecipes, syncShopping } from './lib/sync.js'
import { mergeRecipe } from './lib/recipeMerge.js'
import { raterId } from './lib/ratings.js'
import { storePhoto } from './lib/photos.js'
import ShoppingList from './ShoppingList.jsx'
import PlanPage from './PlanPage.jsx'
import { prunePlan } from './lib/plan.js'
import { addToList, makeList } from './lib/shopping.js'
import { mergeLists } from './lib/listMerge.js'
import { videoThumb } from './lib/thumb.js'
import TabBar from './TabBar.jsx'
import VoicePicker from './VoicePicker.jsx'
import { canSpeak } from './lib/voice.js'
import { photoThumb, readRecipePhotos } from './lib/ocr.js'
import { EBAG_SEARCH } from './lib/ebag.js'
import { openLogin } from './lib/pageReader.js'
import { debugReport, detectPlatform, extractUrl, loadReel } from './lib/reel/index.js'
import { INSTAGRAM_LOGIN_URL, isInstagramSignedIn, setVideoMinShortSide } from './lib/reel/instagram.js'
import { FACEBOOK_LOGIN_URL, isFacebookSignedIn } from './lib/reel/facebook.js'
import { CapacitorCookies } from '@capacitor/core'
import { ACCENTS, THEMES, applyTheme, resolveTheme } from './lib/theme.js'
import { setWorking, toast } from './lib/toast.js'
import { RecipeListSkeleton, RecipePageSkeleton, StartSkeleton } from './Skeleton.jsx'
import Select from './Select.jsx'
import Icon from './Icon.jsx'

const SETTINGS_KEY = 'cooking-app:settings'
// Shared household data kept inside the shopping list row, not on the list itself
const SHARED_WITH_LIST = ['plan', 'aisles']
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

/** #/ (recipes), #/import, #/settings, #/recipe/<id>, #/new (unsaved recipe), #/plan, #/shopping, #/pantry, #/ingredients */
function parseRoute() {
  const [, page = '', id] = window.location.hash.replace(/^#/, '').split('/')
  return { page: page || 'home', id: id ? decodeURIComponent(id) : null }
}
/** What a single change saved from the reading view was, for the toast. */
const savedWhat = (patch) =>
  'ratings' in patch ? 'Rating saved' : 'collections' in patch ? 'Collections saved' : 'cooked' in patch ? 'Cooking history saved' : 'photo' in patch ? (patch.photo ? 'Photo saved' : 'Photo removed') : 'title' in patch ? 'Text saved' : 'Saved'

// Order of the tabs, so switching slides the right way
const TAB_ORDER = ['home', 'plan', 'shopping', 'pantry', 'ingredients']
const slideDir = (from, to) => {
  if (from === to) return 'up'
  const a = TAB_ORDER.indexOf(from)
  const b = TAB_ORDER.indexOf(to)
  if (a >= 0 && b >= 0) return b > a ? 'forward' : 'back'
  return b >= 0 ? 'back' : 'forward' // into a recipe or settings, and back out to a tab
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
    translateTo: 'en',
    keepOwnLanguages: true,
    ebagSearch: EBAG_SEARCH,
    alarmSound: 'beep',
    alarmVibrate: true,
    theme: 'system',
    accent: 'herb',
    ...readStore(SETTINGS_KEY, {}),
  }))
  const [route, setRoute] = useState(parseRoute)
  // Recipe photos waiting to be read: [{ file, url }]
  const [photoPages, setPhotoPages] = useState([])
  const [recipes, setRecipes] = useState([])
  const [recipesLoaded, setRecipesLoaded] = useState(false)
  // The recipe on screen: { recipe, videoBlob, dirty, base }; `base` is the
  // stored version it was opened from, to join with a change synced meanwhile
  const [editing, setEditing] = useState(null)
  const editingRef = useRef(null)
  editingRef.current = editing
  const [shrink, setShrink] = useState(null)
  const [shopping, setShopping] = useState(() => readStore(SHOPPING_KEY, null))
  const [selection, setSelection] = useState(null) // { recipeId: portions } while picking for a list
  const [pantry, setPantry] = useState(cachedPantry)
  // Nothing cached yet: the pantry shows placeholders until the first load
  const [pantryReady, setPantryReady] = useState(() => cachedPantry().length > 0)
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
  const [fbSignedIn, setFbSignedIn] = useState(false)
  const runRef = useRef(null)

  useEffect(() => writeStore(SETTINGS_KEY, settings), [settings])
  // Back closes the open sheet first, then goes back a page
  useEffect(() => (native ? handleBackButton(CapApp) : undefined), [native])
  useEffect(() => applyTheme({ theme: settings.theme, accent: settings.accent }), [settings.theme, settings.accent])
  // A saved copy needs a download at least as sharp; without one the smallest is enough
  useEffect(() => {
    setVideoMinShortSide(settings.saveVideos ? (VIDEO_QUALITY[settings.videoQuality] ?? VIDEO_QUALITY.small).shortSide : 0)
  }, [settings.saveVideos, settings.videoQuality])

  const refreshRecipes = useCallback(
    () =>
      listRecipes()
        .then(setRecipes)
        .catch(() => setRecipes([]))
        .finally(() => setRecipesLoaded(true)),
    [],
  )
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
  const syncAgain = useRef(false)
  const lastSyncError = useRef(null)
  const runSync = useCallback(async ({ manual = false } = {}) => {
    if (!user) return
    // A sync asked for while one runs (a save, the other phone) runs right after it
    if (syncing.current) {
      syncAgain.current = true
      return
    }
    syncing.current = true
    setWorking('sync', true)
    try {
      do {
        syncAgain.current = false
        const recipesDone = await syncRecipes()
        await refreshRecipes()
        await reloadOpenRecipe()
        setPantry(await loadPantry())
        setPantryReady(true)
        const sent = shoppingRef.current
        const list = await syncShopping(sent)
        if (list !== sent) {
          // Changed here while syncing: keep both, and send the result next round
          const current = shoppingRef.current
          const next = current === sent ? list : { ...mergeLists(sent, current, list), updatedAt: Date.now() }
          if (current !== sent) syncAgain.current = true
          setShopping(next)
          shoppingRef.current = next
          writeStore(SHOPPING_KEY, next)
        }
        setSyncState({ at: Date.now(), warning: recipesDone?.warning ?? null })
      } while (syncAgain.current)
      lastSyncError.current = null
      if (manual) toast('Everything is synced', { id: 'sync' })
    } catch (err) {
      const error = err?.message ?? String(err)
      setSyncState({ error })
      setPantryReady(true)
      // Said once, not on every retry while offline
      if (manual || lastSyncError.current !== error) toast(`Sync failed: ${error}`, { kind: 'error', id: 'sync' })
      lastSyncError.current = error
    } finally {
      syncing.current = false
      setWorking('sync', false)
    }
  }, [user, refreshRecipes])

  // Sync when signed in, when the app comes back, and when the other phone changes something
  // Bumped when the account or household changes, so live updates follow it
  const [householdRev, setHouseholdRev] = useState(0)
  useEffect(() => {
    if (!user) return
    runSync()
    // The catalog changes rarely: loaded now (with the household's own
    // ingredients), when the app comes back, and when one is changed
    catalogRefresh.current?.()
    const onResume = () => {
      catalogRefresh.current?.()
      runSync()
    }
    let unsubscribe = null
    subscribeHousehold((what) => {
      if (what === 'pantry') loadPantry().then(setPantry).catch(() => {})
      else if (what === 'ingredients') catalogRefresh.current?.()
      else runSync()
    })
      .then((u) => (unsubscribe = u))
      .catch(() => {})
    const sub = CapApp.addListener('resume', onResume)
    const onOnline = () => runSync()
    window.addEventListener('online', onOnline)
    return () => {
      unsubscribe?.()
      sub.then((h) => h.remove())
      window.removeEventListener('online', onOnline)
    }
  }, [user, runSync, householdRev])

  /** The recipe's own photo (this phone or the household's storage), or nothing when offline. */
  const loadRecipePhoto = async (recipe) => {
    if (typeof recipe.photo === 'string') return recipe.photo // saved before photos had their own store
    try {
      return await loadPhoto(recipe)
    } catch {
      return null
    }
  }

  // Opening a saved recipe loads it (and its video and photo) from the device
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
        videoBlob = null // offline, or the video is only on the other phone
      }
      if (cancelled) return
      const photo = await loadRecipePhoto(recipe)
      if (cancelled) return
      setEditing({ recipe: photo ? { ...recipe, photo } : recipe, videoBlob, dirty: false, base: recipe })
      // Recipes saved before thumbnails existed get one the first time they open
      if (videoBlob && !recipe.thumb) {
        const thumb = await videoThumb(videoBlob)
        if (!thumb) return
        const stored = await getRecipe(recipe.id)
        if (!stored) return
        await putRecipe({ ...stored, thumb, updatedAt: Date.now() })
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

  // Re-checked whenever the app comes back to the front (a login can also expire)
  useEffect(() => {
    if (!native) return
    const check = () => {
      isInstagramSignedIn().then(setIgSignedIn)
      isFacebookSignedIn().then(setFbSignedIn)
    }
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

  const signOutFacebook = async () => {
    try {
      await CapacitorCookies.clearCookies({ url: 'https://www.facebook.com' })
    } finally {
      setFbSignedIn(await isFacebookSignedIn())
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
          if (stored) await putRecipe({ ...stored, video })
          refreshRecipes()
          runSyncRef.current?.()
        }
      })
      .catch((err) => setShrink((s) => (s?.key === key ? { key, state: 'failed', error: err?.message ?? String(err) } : s)))
  }, [refreshRecipes])

  /** The recipe translated into the chosen language, or as it is (also when translating fails). */
  const translateDraft = useCallback(
    async (recipe) => {
      const to = settings.translateTo
      if (!to || to === 'off') return recipe
      try {
        // A recipe read through English already knows its language and keeps its original
        const from = recipe.original ? recipe.lang : await detectLanguage(recipe)
        if (!from || from === to || (!recipe.original && settings.keepOwnLanguages && TARGETS[from])) return recipe
        const translated = await translateRecipe(recipe, to, { from, onStep: (t) => step(t) })
        if (!translated) return recipe
        step(`Translated from ${languageName(from)}. The recipe page can show the original.`, 'ok')
        return translated
      } catch (err) {
        step(`Not translated: ${err?.message ?? err}`, 'warn')
        return recipe
      }
    },
    [settings.translateTo, settings.keepOwnLanguages],
  )

  /**
   * A recipe in a language the parser has no words for (Turkish, Hungarian…) is
   * translated to English line by line and read again; the first reading stays
   * as the original. Only when translating is on.
   */
  const readThroughEnglish = useCallback(
    async (result, draft) => {
      if (!settings.translateTo || settings.translateTo === 'off') return draft
      try {
        const from = await detectLanguage(draft)
        if (!from || PARSER_LANGS.has(from)) return draft
        const lines = sourceLines(result)
        if (!lines.length) return draft
        const [title, ...done] = await translateTexts([draft.title, ...lines], from, 'en', (t) => step(t))
        const read = draftFromTranslatedSource(draft, title, done, from)
        if (read) step(`Read through an English translation (the app has no words for ${languageName(from)}).`, 'ok')
        return read ?? draft
      } catch (err) {
        step(`Could not read it through English: ${err?.message ?? err}`, 'warn')
        return draft
      }
    },
    [settings.translateTo],
  )

  /** Shows an import (or paste) as a new, unsaved recipe page, translated if it is in another language. */
  const openDraft = useCallback(
    async (r, videoBlob = null, extra = {}) => {
      const key = newId()
      const read = await translateDraft({
        ...(await readThroughEnglish(r, draftFromImport(r))),
        ...extra,
        key,
        video: videoBlob ? { size: videoBlob.size, originalSize: videoBlob.size, type: videoBlob.type, shrunk: false } : null,
      })
      // Light, Baked, Vegetarian… from the ingredients, steps and calories
      const recipe = { ...read, tags: importTags(read, catalog.match) }
      setEditing({ recipe, videoBlob, dirty: true })
      go('#/new')
      if (videoBlob && settings.saveVideos) startShrink(key, videoBlob, settings.videoQuality)
    },
    [settings.saveVideos, settings.videoQuality, startShrink, translateDraft, readThroughEnglish, catalog.match],
  )

  /** Ingredients and steps read again from a recipe's saved source text, as a new import would read them. */
  const rereadRecipe = useCallback(
    async (recipe) => {
      const result = { ...(recipe.raw ?? {}), author: recipe.author }
      const first = draftFromImport(result)
      const out = await translateDraft(await readThroughEnglish(result, { ...first, title: recipe.original?.title ?? recipe.title }))
      return {
        ingredients: out.ingredients,
        steps: out.steps,
        source: first.source,
        lang: out.original ? out.lang : (recipe.lang ?? null),
        original: out.original ?? null,
      }
    },
    [readThroughEnglish, translateDraft],
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
    const toastId = toast('Saving…', { kind: 'loading' })
    try {
      await saveRecipe(patch)
      toast(patch ? savedWhat(patch) : 'Recipe saved', { id: toastId })
    } catch (err) {
      toast(`Not saved: ${err?.message ?? err}`, { kind: 'error', id: toastId })
      throw err
    }
  }
  const saveRecipe = async (patch) => {
    const { videoBlob } = editing
    const now = Date.now()
    let recipe = { ...editing.recipe, ...patch }
    // The other phone's change arrived while this was open: both stay
    const current = recipe.id ? await getRecipe(recipe.id) : null
    if (current) {
      if (editing.base && current.updatedAt !== editing.base.updatedAt) recipe = { ...mergeRecipe(editing.base, { ...recipe, updatedAt: now }, current), id: recipe.id }
      recipe = { ...recipe, syncedAt: current.syncedAt, syncBase: current.syncBase }
    }
    const id = recipe.id ?? newId()
    const keepVideo = !!videoBlob && settings.saveVideos
    const thumb = recipe.thumb ?? (keepVideo ? await videoThumb(videoBlob) : null)
    // The photo goes to its own store; the recipe keeps which one it has
    const stored = await storePhoto({
      ...recipe,
      id,
      thumb,
      // A saved recipe whose video could not be loaded (offline) keeps it
      video: keepVideo || (recipe.id && !videoBlob) ? recipe.video : null,
      createdAt: recipe.createdAt ?? now,
      updatedAt: now,
    })
    await putRecipe(stored)
    if (keepVideo && !recipe.id) await putVideo(id, videoBlob)
    if (recipe.key) savedIds.current[recipe.key] = id
    setEditing({ recipe: recipe.photo ? { ...stored, photo: recipe.photo } : stored, videoBlob: keepVideo ? videoBlob : null, dirty: false, base: stored })
    refreshRecipes()
    runSync()
    go(`#/recipe/${encodeURIComponent(id)}`, { replace: route.page === 'new' })
  }

  /** Renames a collection in every recipe in it; returns the new name. */
  const renameCollectionEverywhere = async (from, to) => {
    const name = collectionName(to)
    if (!name) return null
    try {
      for (const r of recipes.filter((x) => inCollection(x, from))) {
        const stored = await getRecipe(r.id)
        if (stored) await putRecipe({ ...stored, collections: renameCollection(stored.collections, from, name), updatedAt: Date.now() })
      }
      await refreshRecipes()
      runSync()
      toast(`Renamed to ${name}`)
      return name
    } catch (err) {
      toast(`Not renamed: ${err?.message ?? err}`, { kind: 'error' })
      return null
    }
  }

  const deleteEditing = async () => {
    if (!editing?.recipe.id) return
    await deleteRecipe(editing.recipe.id)
    markDeleted(editing.recipe.id)
    toast(`Deleted ${editing.recipe.title || 'the recipe'}`)
    setEditing(null)
    refreshRecipes()
    runSync()
    go('#/', { replace: true })
  }

  const shoppingTimer = useRef(null)
  const updateShopping = (list) => {
    // The meal plan and the shop's order travel with the list; lists rebuilt from recipes keep them
    const kept = Object.fromEntries(SHARED_WITH_LIST.flatMap((k) => (list && k in list ? [] : shoppingRef.current?.[k] ? [[k, shoppingRef.current[k]]] : [])))
    const stamped = list ? { ...list, ...kept, updatedAt: Date.now() } : list
    setShopping(stamped)
    shoppingRef.current = stamped
    writeStore(SHOPPING_KEY, stamped)
    // Ticking items quickly sends one update, not one per tap
    clearTimeout(shoppingTimer.current)
    shoppingTimer.current = setTimeout(() => runSyncRef.current?.(), 1500)
  }

  const updatePlan = (plan) => updateShopping({ ...(shoppingRef.current ?? { createdAt: Date.now(), recipes: [], items: [] }), plan: prunePlan(plan) })

  /** Puts the planned recipes on the list; ingredients at home start left out, as in Add to list. */
  const shopPlan = (entries) => {
    const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => catalog.canonical(p.name)))
    const byId = new Map(recipes.map((r) => [r.id, r]))
    const planned = entries.map((e) => ({
      ...e,
      skip: (byId.get(e.id)?.ingredients ?? []).flatMap((i, n) => (i.name?.trim() && atHome.has(catalog.canonical(i.name)) ? [n] : [])),
    }))
    const others = (shopping?.recipes ?? []).filter((r) => !entries.some((e) => e.id === r.id))
    updateShopping(makeList([...others, ...planned], recipes, catalog.match, shopping))
    toast(`Added ${entries.length} planned recipe${entries.length === 1 ? '' : 's'} to the list`)
  }

  // With a list already going, picking recipes asks whether to add to it or start again
  const [listChoice, setListChoice] = useState(false)
  const hasList = !!(shopping?.items?.length || shopping?.recipes?.length)
  const makeShoppingList = (how = hasList ? null : 'replace') => {
    if (!how) return setListChoice(true)
    setListChoice(false)
    const entries = recipes.filter((r) => selection?.[r.id] != null).map((r) => ({ id: r.id, portions: selection[r.id] }))
    if (how === 'add') {
      const others = (shopping?.recipes ?? []).filter((r) => !entries.some((e) => e.id === r.id))
      updateShopping(makeList([...others, ...entries], recipes, catalog.match, shopping))
    } else updateShopping(makeList(entries, recipes, catalog.match))
    toast(how === 'add' ? `Added ${entries.length} recipe${entries.length === 1 ? '' : 's'} to the list` : `New list from ${entries.length} recipe${entries.length === 1 ? '' : 's'}`)
    setSelection(null)
    tabGo('#/shopping')
  }

  /** Shows what a sync brought for the recipe on screen; one being edited is joined when saved. */
  const reloadOpenRecipe = async () => {
    const id = editingRef.current?.recipe.id
    if (!id) return
    const stored = await getRecipe(id)
    if (!stored || stored.updatedAt === editingRef.current?.base?.updatedAt) return
    if (editingRef.current.dirty) return
    const photoChanged = stored.photoKey !== editingRef.current.recipe.photoKey
    setEditing((e) => {
      if (e?.recipe.id !== id || e.dirty) return e
      const photo = photoChanged ? undefined : e.recipe.photo
      return { ...e, recipe: photo !== undefined ? { ...stored, photo } : stored, base: stored }
    })
    if (!photoChanged) return
    const photo = await loadRecipePhoto(stored)
    if (photo) setEditing((e) => (e?.recipe.id === id && e.recipe.photoKey === stored.photoKey && !e.dirty ? { ...e, recipe: { ...e.recipe, photo } } : e))
  }

  // Discarding a new recipe drops it; on a saved one it goes back to the saved version
  const discardEditing = async () => {
    const id = editing?.recipe.id
    if (!id) {
      setEditing(null)
      return go('#/', { replace: true })
    }
    const stored = await getRecipe(id)
    if (!stored) return
    const photo = await loadRecipePhoto(stored)
    setEditing((e) => ({ ...e, recipe: photo ? { ...stored, photo } : stored, dirty: false, base: stored }))
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

  // Which way the next page slides in (styles.css, main[data-dir])
  const lastPage = useRef(route.page)
  const dir = useMemo(() => slideDir(lastPage.current, route.page), [route.page])
  useEffect(() => {
    lastPage.current = route.page
  }, [route.page])

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

  /** Takes what the cook confirmed after cooking out of the stock; used-up items go, except staples. */
  const useStock = async (plan) => {
    try {
      for (const { item, next } of plan) {
        if (usesUp(item, next)) await removeFromPantry(item.id)
        else await updatePantryItem(item.id, { amount: next })
      }
      toast('Stock at home updated')
    } finally {
      setPantry(await loadPantry().catch(() => pantry))
    }
  }

  const back = () => (window.history.length > 1 ? window.history.back() : go('#/'))

  // `say` reports progress (the import log by default); `onDownload` the speech model download
  const runTranscription = useCallback(
    async (buffer, { say = step, onDownload = setDownload } = {}) => {
      say('Reading the audio track…')
      const audio = await decodeToMono16k(buffer)
      say(`Audio is ${Math.round(audio.length / 16000)} s long. Transcribing on this device…`)
      const started = Date.now()
      const text = await transcribe(audio, {
        model: settings.model,
        language: settings.language,
        onProgress: (p) => {
          if (p.status === 'progress' && p.total) onDownload({ file: p.file, pct: Math.round((p.loaded / p.total) * 100) })
          if (p.status === 'ready') onDownload(null)
        },
        onStatus: () => onDownload(null),
      })
      say(`Transcript ready in ${Math.round((Date.now() - started) / 1000)} s.`, 'ok')
      return text
    },
    [settings.model, settings.language],
  )

  /** Ingredients and steps read from more source text for a recipe on screen, translated like an import. */
  const readMore = useCallback(
    async (result, title) => {
      const out = await translateDraft(await readThroughEnglish(result, { ...draftFromImport(result), title }))
      return { ingredients: out.ingredients, steps: out.steps }
    },
    [readThroughEnglish, translateDraft],
  )

  /**
   * Transcribes a recipe's video when the user asks (imports skip it when the
   * caption or a comment already holds the recipe). Uses the video on screen,
   * else downloads it again from the source.
   */
  const transcribeVideo = useCallback(
    async (recipe, videoBlob, say) => {
      const onDownload = (d) => d && say(`${d.file === 'text reader' ? 'Downloading the text reader' : 'Downloading the speech model'} (once): ${d.pct}%`)
      let transcript = null
      if (videoBlob) {
        try {
          transcript = await runTranscription(await videoBlob.arrayBuffer(), { say, onDownload })
        } catch {
          // A shrunk copy may have no readable audio; the original is fetched below
        }
      }
      if (transcript == null) {
        if (!recipe.sourceUrl) throw new Error('There is no video to transcribe.')
        say('Loading the video again…')
        const reel = await loadReel(recipe.sourceUrl)
        if (reel.transcript) transcript = reel.transcript
        else {
          if (!reel.videoUrl) throw new Error('Could not find the video file.')
          const bytes = await getBytes(reel.videoUrl, { headers: reel.downloadHeaders })
          transcript = await runTranscription(bytes, { say, onDownload })
        }
      }
      return { label: 'From the video', transcript, raw: { transcript }, ...(await readMore({ transcript, author: recipe.author }, recipe.title)) }
    },
    [runTranscription, readMore],
  )

  /**
   * More source for a recipe on screen: screenshots of a comment (read on the
   * phone, without the app's buttons around it), pasted text, or a reel or
   * page link. Returns what it found, for the recipe page to add or use.
   */
  const addSource = useCallback(
    async (recipe, { photos, text, link }, say) => {
      if (photos?.length) {
        say(`Reading the text in ${photos.length} screenshot${photos.length > 1 ? 's' : ''}…`)
        const read = await readRecipePhotos(photos, (p) => {
          if (p.status === 'loading language traineddata' || p.status === 'loading tesseract core') say(`Downloading the text reader (once): ${Math.round((p.progress ?? 0) * 100)}%`)
        }, settings.photoLanguage)
        const comment = commentFromScreenshot(read)
        if (!comment) throw new Error('No text found in the screenshot. Try one that shows the whole comment.')
        return { label: 'From the screenshot', raw: { comments: [{ author: 'screenshot', text: comment }] }, ...(await readMore({ description: comment }, recipe.title)) }
      }
      if (text?.trim()) return { label: 'From the pasted text', raw: { comments: [{ author: 'pasted', text: text.trim() }] }, ...(await readMore({ description: text }, recipe.title)) }
      const url = extractUrl(link ?? '') ?? link?.trim()
      if (!url) throw new Error('Paste a link to a reel or a recipe page.')
      say(detectPlatform(url) === 'web' ? 'Loading the page…' : 'Loading the reel…')
      const reel = await loadReel(url)
      const result = { url, platform: reel.platform, author: reel.author, description: reel.description, comments: (reel.comments ?? []).slice(0, 30), meta: reel.meta ?? null, transcript: reel.transcript ?? null }
      if (!result.transcript && reel.platform !== 'web' && settings.transcribe && !recipeInText(result) && reel.videoUrl) {
        say('No recipe in the text, so the video is transcribed…')
        const bytes = await getBytes(reel.videoUrl, { headers: reel.downloadHeaders })
        result.transcript = await runTranscription(bytes, { say, onDownload: (d) => d && say(`Downloading the speech model (once): ${d.pct}%`) })
      }
      if (!result.description && !result.comments.length && !result.transcript) throw new Error('Nothing could be read from that link.')
      return {
        label: 'From the link',
        raw: { description: result.description, comments: result.comments, transcript: result.transcript },
        // A recipe made by hand gets the link as its source
        recipe: { sourceUrl: url, platform: reel.platform, author: reel.author, image: reel.image ?? null },
        ...(await readMore(result, recipe.title)),
      }
    },
    [settings.photoLanguage, settings.transcribe, runTranscription, readMore],
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
        if (reel.signedIn != null) (reel.platform === 'facebook' ? setFbSignedIn : setIgSignedIn)(reel.signedIn)
        r = { ...r, platform: reel.platform, author: reel.author, description: reel.description, comments: (reel.comments ?? []).slice(0, 30), image: reel.image ?? null, meta: reel.meta ?? null }
        step(reel.description ? 'Found the description.' : 'No description found.', reel.description ? 'ok' : 'warn')
        if (reel.platform === 'web') {
          step(reel.structured ? 'Found the recipe data on the page.' : 'No recipe data on the page, reading its text instead.', reel.structured ? 'ok' : 'warn')
        } else if (reel.platform === 'instagram' || reel.platform === 'facebook') {
          const site = reel.platform === 'facebook' ? 'Facebook' : 'Instagram'
          step(
            r.comments.length
              ? `Found ${r.comments.length} comment${r.comments.length > 1 ? 's' : ''}.`
              : reel.signedIn
                ? 'No comments found.'
                : `No comments found. ${site} may only show them when signed in (Settings).`,
            r.comments.length ? 'ok' : 'warn',
          )
        }
        if (reel.transcript) {
          r = { ...r, transcript: reel.transcript }
          step('Used the video\'s captions as the transcript.', 'ok')
        }
        // A recipe written out in the caption or a comment needs no transcript; the recipe page can still make one
        const inText = !reel.transcript && reel.platform !== 'web' ? recipeInText(r) : null
        if (inText && settings.transcribe) step(`Found the recipe in the ${inText.source}, so the video was not transcribed. The recipe page can still do it.`, 'ok')
        const wantTranscript = settings.transcribe && !reel.transcript && !inText
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
          await openDraft(r, videoBlob)
        }
        // Always available, so a wrong result can be reported too
        setReport(
          debugReport({
            url,
            // What was shared or pasted, when the link was picked out of more text
            shared: rawLink.trim() !== url ? rawLink.slice(0, 500) : undefined,
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
      await openDraft(r, file.type.startsWith('video/') ? file : null)
    } catch (err) {
      step(err.message || String(err), 'error')
    } finally {
      setDownload(null)
      setBusy(false)
    }
  }

  // Photos of a printed (or neatly handwritten) recipe, read on the phone.
  // Taken or picked photos collect as pages first, so a recipe can be shot page by page.
  const addPhotoPages = (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) setPhotoPages((pages) => [...pages, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const removePhotoPage = (n) =>
    setPhotoPages((pages) => {
      URL.revokeObjectURL(pages[n].url)
      return pages.filter((_, i) => i !== n)
    })
  const readPhotoPages = async () => {
    const files = photoPages.map((p) => p.file)
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
      await openDraft(r, null, { thumb: await photoThumb(files[0]) })
      for (const p of photoPages) URL.revokeObjectURL(p.url)
      setPhotoPages([])
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

  if (user === undefined) return <StartSkeleton />
  if (!user) return <LoginPage />

  const topbar = (
    <div className="topbar">
      <button className="link" onClick={back}>
        <Icon name="back" /> Back
      </button>
    </div>
  )

  const showing =
    editing && ((route.page === 'recipe' && editing.recipe.id === route.id) || (route.page === 'new' && !editing.recipe.id))
  if (route.page === 'recipe' && !showing) return <RecipePageSkeleton />
  if (showing) {
    return (
      <main data-dir={dir}>
        <RecipePage
          me={raterId(user?.id, settings.myName ?? '')}
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
          onReread={rereadRecipe}
          onTranscribe={(recipe, say) => transcribeVideo(recipe, editing.videoBlob, say)}
          onAddSource={addSource}
          onBack={back}
          onAddToList={(entry) => {
            updateShopping(addToList(shopping, entry, recipes, catalog.match))
            toast('Added to the shopping list')
          }}
          onUseStock={useStock}
          units={settings.units}
          alarm={{ sound: settings.alarmSound, vibrate: settings.alarmVibrate }}
          onUnits={(units) => setSettings((s) => ({ ...s, units }))}
          translateTo={settings.translateTo !== 'off' ? settings.translateTo : null}
          categories={allCategories(recipes)}
          collections={allCollections(recipes).map((c) => c.name)}
          cuisines={allCuisines(recipes)}
          tags={allTags(recipes)}
        />
      </main>
    )
  }

  const toBuy = shopping ? shopping.items.filter((i) => !i.checked).length : 0
  const tabbar = <TabBar page={route.page} badges={{ shopping: toBuy }} onGo={tabGo} />

  if (route.page === 'pantry') {
    return (
      <main className="tabbed" data-dir={dir}>
        <PantryPage items={pantry} loading={!pantryReady} onChanged={() => loadPantry().then(setPantry)} />
        {tabbar}
      </main>
    )
  }

  if (route.page === 'plan') {
    return (
      <main className="tabbed" data-dir={dir}>
        <PlanPage plan={shopping?.plan ?? {}} recipes={recipes} pantry={pantry} onChange={updatePlan} onShop={shopPlan} onOpen={(id) => go(`#/recipe/${encodeURIComponent(id)}`)} />
        {tabbar}
      </main>
    )
  }

  if (route.page === 'ingredients') {
    return (
      <main className="tabbed" data-dir={dir}>
        <IngredientsPage />
        {tabbar}
      </main>
    )
  }

  if (route.page === 'shopping') {
    return (
      <main className="tabbed" data-dir={dir}>
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
            toast(`${items.length} item${items.length === 1 ? '' : 's'} put at home`)
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
      <main data-dir={dir}>
        {topbar}
        <section className="card">
          <h2>Settings</h2>
          <Account
            user={user}
            onChanged={() => {
              setSyncState(null)
              setHouseholdRev((n) => n + 1)
            }}
          />
          {user && (
            <label>
              Your name on this phone
              <input
                type="text"
                placeholder="e.g. Jan"
                value={settings.myName ?? ''}
                onChange={(e) => setSettings({ ...settings, myName: e.target.value.replace(':', '') })}
              />
              <span className="hint">Ratings and cooked entries are kept per person. Set a name when you share one login, so each of you rates separately.</span>
            </label>
          )}
        </section>
        <section className="card">
          <h3>Look</h3>
          <span className="settings-label">Theme</span>
          <div className="theme-pick" role="group" aria-label="Theme">
            {Object.entries(THEMES).map(([k, label]) => (
              <button key={k} className={settings.theme === k ? 'on' : ''} aria-pressed={settings.theme === k} onClick={() => setSettings({ ...settings, theme: k })}>
                <span className={`theme-swatch ${k}`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <span className="settings-label" style={{ marginTop: 16 }}>
            Colour · {ACCENTS[settings.accent]?.label ?? ACCENTS.herb.label}
          </span>
          <div className="accent-pick" role="group" aria-label="Colour">
            {Object.entries(ACCENTS).map(([k, a]) => (
              <button
                key={k}
                style={{ '--swatch': resolveTheme(settings.theme) === 'dark' ? a.dark : a.light }}
                className={settings.accent === k ? 'on' : ''}
                aria-pressed={settings.accent === k}
                aria-label={a.label}
                title={a.label}
                onClick={() => setSettings({ ...settings, accent: k })}
              >
                {settings.accent === k ? <Icon name="check" size={20} strokeWidth={3} /> : null}
              </button>
            ))}
          </div>
          <p className="hint">Saved on this phone only, so each of you can pick your own.</p>
        </section>
        <section className="card">
          <h3>Importing</h3>
          <div className="settings">
            <label>
              <input type="checkbox" checked={settings.transcribe} onChange={(e) => setSettings({ ...settings, transcribe: e.target.checked })} />{' '}
              Transcribe the audio when the caption and comments have no recipe
            </label>
            <label>
              Speech model{' '}
              <Select aria-label="Speech model" value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
                {Object.entries(MODELS).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Language{' '}
              <Select aria-label="Language" value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
                <option value="auto">Detect</option>
                <option value="czech">Czech</option>
                <option value="bulgarian">Bulgarian</option>
                <option value="english">English</option>
              </Select>
            </label>
            <p className="hint">The speech model downloads once on first use, then works offline.</p>
            <label>
              Translate recipes into{' '}
              <Select aria-label="Translate recipes into" value={settings.translateTo} onChange={(e) => setSettings({ ...settings, translateTo: e.target.value })}>
                <option value="off">Don't translate</option>
                {Object.entries(TARGETS).map(([k, name]) => (
                  <option key={k} value={k}>
                    {name}
                  </option>
                ))}
              </Select>
            </label>
            {settings.translateTo !== 'off' && (
              <label>
                <input type="checkbox" checked={settings.keepOwnLanguages} onChange={(e) => setSettings({ ...settings, keepOwnLanguages: e.target.checked })} /> Leave
                English, Czech and Bulgarian recipes as they are
              </label>
            )}
            <p className="hint">
              Phones with Gemini Nano translate on the phone; others use Google Translate (needs internet). The translation is saved with the recipe, and the
              recipe page can switch back to the original.
            </p>
            <label>
              <input type="checkbox" checked={settings.saveVideos} onChange={(e) => setSettings({ ...settings, saveVideos: e.target.checked })} />{' '}
              Save a copy of the video with each recipe (on this phone only)
            </label>
            {settings.saveVideos && (
              <label>
                Video quality{' '}
                <Select aria-label="Video quality" value={settings.videoQuality} onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value })}>
                  <option value="small">Standard, 480p (about 8 MB a minute)</option>
                  <option value="hd">HD, 720p (about 15 MB a minute)</option>
                  <option value="full">Full HD, 1080p (about 28 MB a minute, slow phones may stutter)</option>
                </Select>
              </label>
            )}
          </div>
        </section>
        <section className="card">
          <h3>Units</h3>
          <div className="settings">
            <label>
              Show amounts{' '}
              <Select aria-label="Show amounts" value={settings.units} onChange={(e) => setSettings({ ...settings, units: e.target.value })}>
                <option value="original">As the recipe is written</option>
                <option value="metric">Metric (g, ml, °C)</option>
                <option value="imperial">US (oz, cups, °F)</option>
              </Select>
            </label>
          </div>
          <p className="hint">Recipes keep their own units; this changes how amounts and oven temperatures are shown. You can also switch on any recipe.</p>
        </section>
        {canSpeak && (
          <section className="card">
            <h3>Read aloud</h3>
            <p className="hint">The voice that reads steps in cooking mode. Saved on this phone only.</p>
            <VoicePicker />
          </section>
        )}
        <section className="card">
          <h3>Cooking timers</h3>
          <div className="settings">
            <label>
              Alarm sound{' '}
              <Select
                aria-label="Alarm sound"
                value={settings.alarmSound}
                onChange={(e) => {
                  setSettings({ ...settings, alarmSound: e.target.value })
                  ring({ sound: e.target.value, vibrate: false })
                }}
              >
                {Object.entries(ALARM_SOUNDS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <input type="checkbox" checked={settings.alarmVibrate} onChange={(e) => setSettings({ ...settings, alarmVibrate: e.target.checked })} /> Vibrate when a timer is done
            </label>
            <button className="secondary" onClick={() => ring({ sound: settings.alarmSound, vibrate: settings.alarmVibrate })}>
              <Icon name="play" /> Try it
            </button>
          </div>
          <p className="hint">A finished timer rings every few seconds until you stop it, for up to two minutes.</p>
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
              Some reels, and all comments, are shown only to logged-in users. Signing in opens Instagram in a separate window
              that closes by itself once you are logged in. The login stays on this phone.
            </p>
            <div className="row">
              {igSignedIn ? (
                <button className="secondary" onClick={signOutInstagram}>
                  Sign out of Instagram
                </button>
              ) : (
                <button
                  className="secondary"
                  onClick={async () => {
                    await openLogin(INSTAGRAM_LOGIN_URL, { doneCookie: 'sessionid', title: 'Sign in to Instagram' }).catch(() => false)
                    setIgSignedIn(await isInstagramSignedIn())
                  }}
                >
                  Sign in to Instagram
                </button>
              )}
            </div>
          </section>
        )}
        {native && (
          <section className="card">
            <h3>Facebook</h3>
            <p>{fbSignedIn ? 'Signed in' : 'Not signed in'}</p>
            <p className="hint">
              Logged out, Facebook shows few comments and hides some reels. Signing in works like Instagram: a separate window
              that closes by itself, and the login stays on this phone.
            </p>
            <div className="row">
              {fbSignedIn ? (
                <button className="secondary" onClick={signOutFacebook}>
                  Sign out of Facebook
                </button>
              ) : (
                <button
                  className="secondary"
                  onClick={async () => {
                    await openLogin(FACEBOOK_LOGIN_URL, { doneCookie: 'c_user', title: 'Sign in to Facebook' }).catch(() => false)
                    setFbSignedIn(await isFacebookSignedIn())
                  }}
                >
                  Sign in to Facebook
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
      <main data-dir={dir}>
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
              ? 'Tip: share a reel or page to Simmer from Instagram, TikTok, YouTube or the browser.'
              : "Websites can't load Instagram, TikTok or Facebook pages. Use the Android app for links, or paste the text below."}
          </p>
        </section>

        <section className="card">
          <label>From photos</label>
          <p className="hint top">
            A cookbook page, a recipe card or a screenshot. Add a photo for each page, in order; where they overlap, the repeated lines are kept once. Neat handwriting may work too.
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
          {photoPages.length > 0 && (
            <ol className="photo-pages">
              {photoPages.map((p, n) => (
                <li key={p.url}>
                  <img src={p.url} alt={`Page ${n + 1}`} />
                  <span className="page-no">{n + 1}</span>
                  <button className="remove" aria-label={`Remove page ${n + 1}`} disabled={busy} onClick={() => removePhotoPage(n)}>
                    <Icon name="close" />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="row">
            <label className={`button${photoPages.length ? ' secondary' : ''}`}>
              <Icon name="camera" /> {photoPages.length ? 'Take another' : 'Take photo'}
              <input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={addPhotoPages} />
            </label>
            <label className="button secondary">
              <Icon name="image" /> {photoPages.length ? 'Add from gallery' : 'Pick from gallery'}
              <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={addPhotoPages} />
            </label>
          </div>
          {photoPages.length > 0 && (
            <button className="big read-pages" disabled={busy} onClick={readPhotoPages}>
              Read {photoPages.length} photo{photoPages.length > 1 ? 's' : ''}
            </button>
          )}
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
            {busy && !download && (
              <div className="spinner">
                Working…
                <div className="busy-bar" />
              </div>
            )}
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
    <main className={selection ? 'selecting' : 'tabbed'} data-dir={dir}>
      <header className="main-header">
        <h1>{selection ? 'Pick recipes' : 'Recipes'}</h1>
        {!selection && (
          <div className="actions">
            <button className="small" onClick={() => go('#/import')}>
              Import
            </button>
            <button className="small secondary" onClick={addManually}>
              <Icon name="plus" size={16} strokeWidth={2.5} /> Add
            </button>
            <button className="icon-button" aria-label="Settings" onClick={() => go('#/settings')}>
              <Icon name="settings" size={22} />
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
          <Icon name="right" size={24} />
        </button>
      )}

      {selection ? (
        <p className="hint list-hint">Tap the recipes to shop for, and set the portions for each.</p>
      ) : (
        recipes.length > 1 && (
          <button className="link list-hint" onClick={() => setSelection({})}>
            <Icon name="cart" /> Shop for several recipes
          </button>
        )
      )}

      {!recipesLoaded || (!recipes.length && !syncState) ? (
        <RecipeListSkeleton />
      ) : (
      <RecipeList
        recipes={recipes}
        pantry={pantry}
        onOpen={(id) => go(`#/recipe/${encodeURIComponent(id)}`)}
        selection={selection}
        onSelect={(id, portions) => setSelection((s) => ({ ...s, [id]: portions }))}
        onRenameCollection={renameCollectionEverywhere}
      />
      )}

      <p className="hint sync">
        {syncState?.error
          ? `Sync failed: ${syncState.error}`
          : syncState?.at
            ? `Synced ${new Date(syncState.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${syncState.warning ? `. ${syncState.warning}` : ''}`
            : 'Syncing…'}{' '}
        <button className="link" onClick={() => runSync({ manual: true })}>
          Sync now
        </button>
      </p>

      {selection ? (
        <div className="bottom-bar">
          <button className="secondary" onClick={() => setSelection(null)}>
            Cancel
          </button>
          <button disabled={!picked} onClick={() => makeShoppingList()}>
            Make list from {picked} recipe{picked === 1 ? '' : 's'}
          </button>
        </div>
      ) : (
        tabbar
      )}

      {listChoice && (
        <div className="sheet-backdrop" onClick={() => setListChoice(false)}>
          <div className="sheet" role="dialog" aria-label="There is a list already" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <h2>There is a list already</h2>
            <p className="hint">
              It has {shopping.items.filter((i) => !i.checked).length} things to buy. Adding keeps them, with what you added by hand and the staples; a new list starts
              from these recipes only.
            </p>
            <div className="sheet-actions">
              <button className="secondary" onClick={() => makeShoppingList('replace')}>
                Start a new list
              </button>
              <button onClick={() => makeShoppingList('add')}>Add to the list</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

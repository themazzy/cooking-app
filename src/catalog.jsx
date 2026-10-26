import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SEED_INGREDIENTS } from './data/ingredients.js'
import { buildCatalogIndex, imageUrl, matchIngredient, normalizeName } from './lib/catalog.js'
import { supabase } from './lib/supabase.js'
import { getHousehold } from './lib/sync.js'
import { NUTRITION } from './lib/calories.js'

const CACHE_KEY = 'cooking-app:catalog'
const COLUMNS = 'id, household_id, name, aisle, image, image_data, base, aliases'
// Calories of the household's own ingredients (supabase-ingredient-kcal.sql adds the columns)
const KCAL_COLUMNS = 'kcal, piece_g'

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? null
  } catch {
    return null
  }
}

/** The built-in calories of an entry, unless the household gave it its own. */
const withNutrition = (e, fallback) => {
  const n = NUTRITION.get(e.name.toLowerCase()) ?? fallback
  return {
    ...e,
    kcal: e.kcal ?? n?.kcal ?? null,
    piece_g: e.piece_g ?? n?.piece_g ?? null,
    density: n?.density ?? null,
    protein: n?.protein ?? null,
    carbs: n?.carbs ?? null,
    fat: n?.fat ?? null,
    // What the household typed itself, for editing
    own_kcal: e.kcal ?? null,
    own_piece_g: e.piece_g ?? null,
  }
}

/** Custom entries inherit the picture, aisle and calories of the ingredient they stand for. */
function withBase(entries) {
  const shared = entries.filter((e) => !e.household_id).map((e) => withNutrition(e))
  const byName = new Map(shared.map((e) => [e.name.toLowerCase(), e]))
  return entries.map((e) => {
    if (!e.household_id) return byName.get(e.name.toLowerCase())
    const base = e.base ? byName.get(e.base.toLowerCase()) : null
    const own = withNutrition(e, base)
    return base ? { ...own, image: e.image ?? base.image, aisle: e.aisle || base.aisle } : own
  })
}

// Before the calorie columns exist, saving them fails; say what to do
const kcalHint = (error) =>
  /kcal|piece_g/.test(error?.message ?? '') ? Object.assign(new Error('Calories need the new database columns: run supabase-ingredient-kcal.sql in Supabase first.'), { cause: error }) : error

const SEED_ORDER = new Map(SEED_INGREDIENTS.map((e, i) => [e.name.toLowerCase(), i]))
const seedOrder = (e) => SEED_ORDER.get(e.name.toLowerCase()) ?? SEED_ORDER.size

const CatalogContext = createContext(null)

/**
 * The ingredient catalog for the whole app: the shared list plus the
 * household's own ingredients from Supabase (cached on the phone), or the
 * built-in starting list until that loads.
 */
export function CatalogProvider({ children }) {
  const [entries, setEntries] = useState(() => readCache() ?? SEED_INGREDIENTS)
  // Whether the household's own entries are known (from the server, or cached from it)
  const [loaded, setLoaded] = useState(() => readCache() != null)

  const refresh = useCallback(async () => {
    let { data, error } = await supabase.from('ingredients').select(`${COLUMNS}, ${KCAL_COLUMNS}`).order('name')
    if (error?.code === '42703') ({ data, error } = await supabase.from('ingredients').select(COLUMNS).order('name'))
    if (error || !data?.length) return
    setEntries(data)
    setLoaded(true)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {
      // the cache is a convenience
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (entry) => {
      const household_id = (await getHousehold()).id
      const { error } = await supabase.from('ingredients').insert({ ...entry, household_id })
      if (error) throw kcalHint(error)
      await refresh()
    },
    [refresh],
  )
  const update = useCallback(
    async (id, patch) => {
      const { error } = await supabase.from('ingredients').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw kcalHint(error)
      await refresh()
    },
    [refresh],
  )
  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from('ingredients').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const value = useMemo(() => {
    const all = withBase(entries)
    // The household's own names are matched first
    // The shared list in the order of the built-in one (the server sends it by name), so a word two
    // entries share ("яйца" for eggs and egg yolks) finds the same one as in the tests
    const shared = all.filter((e) => !e.household_id).sort((a, b) => seedOrder(a) - seedOrder(b))
    const index = buildCatalogIndex([...all.filter((e) => e.household_id), ...shared])
    const match = (name) => matchIngredient(index, name)
    /** The same key for an ingredient however it is written, and for a brand and what it stands for. */
    const canonical = (name) => {
      const e = match(name)
      return e ? (e.base ?? e.name).toLowerCase() : normalizeName(name)
    }
    /** The entry with exactly this name, the household's own first. */
    const named = (name) => {
      const key = normalizeName(name)
      return all.find((e) => e.household_id && normalizeName(e.name) === key) ?? all.find((e) => normalizeName(e.name) === key) ?? null
    }
    /**
     * Makes sure something kept at home is in the ingredient list: a name the
     * catalog does not have becomes one of the household's own ingredients,
     * counting as the everyday one it most likely is ("Coca Cola Zero" → Cola).
     * A picture is filled in when the ingredient has none yet.
     */
    const ensure = async (name, { base, aisle, image_data, kcal } = {}) => {
      // The product's own calories (kcalHint: the columns may not exist yet, then it is saved without)
      const own = kcal != null ? { kcal } : {}
      const save = async (fn, patch) => {
        try {
          await fn({ ...patch, ...own })
        } catch (e) {
          if (!own.kcal && own.kcal !== 0) throw e
          if (!/kcal/.test(e?.message ?? '')) throw e
          await fn(patch)
        }
      }
      const have = named(name)
      if (have) {
        if (!have.household_id) return
        const patch = image_data && !have.image_data ? { image_data } : {}
        if (have.own_kcal == null && kcal != null) await save((p) => update(have.id, p), patch)
        else if (patch.image_data) await update(have.id, patch)
        return
      }
      const like = base ? named(base) : match(name)
      try {
        await save(add, { name: name.trim(), base: like?.base ?? like?.name ?? null, aisle: aisle || like?.aisle || 'Other', image_data: image_data || null })
      } catch (e) {
        // Already added from the other phone
        if (e?.code === '23505' || e?.cause?.code === '23505') await refresh()
        else throw e
      }
    }
    /** Gives an ingredient (by name) the household's own picture, whichever kind of entry it is. */
    const setPicture = async (name, image_data) => {
      const have = named(name)
      if (have?.household_id) return update(have.id, { image_data })
      if (have) return add({ name: have.name, base: have.base ?? have.name, aisle: have.aisle, aliases: have.aliases ?? [], image: have.image ?? null, image_data })
      return ensure(name, { image_data })
    }
    return { entries: all, loaded, add, update, remove, refresh, match, canonical, named, ensure, setPicture }
  }, [entries, loaded, add, update, remove, refresh])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export const useCatalog = () => useContext(CatalogContext)

const AISLE_COLORS = {
  Vegetables: '#4f9d5d',
  Fruit: '#d9822b',
  Herbs: '#6aa84f',
  Meat: '#c0504d',
  Fish: '#4a86c5',
  'Dairy & eggs': '#c9a227',
  Bakery: '#b07d48',
  'Pasta & grains': '#bfa36f',
  Baking: '#a67fb5',
  Spices: '#b5523b',
  'Oils & sauces': '#8a8f2e',
  'Nuts & seeds': '#8d6e63',
  Frozen: '#5fa8c9',
  Drinks: '#7b6fc9',
}

/** Small picture of a catalog ingredient (own photo, TheMealDB picture), or its first letter. */
export function IngredientIcon({ entry, size = 28 }) {
  const src = entry?.image_data || imageUrl(entry)
  const [failedSrc, setFailedSrc] = useState(null)
  if (src && failedSrc !== src) {
    return <img className="ing-icon" src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailedSrc(src)} />
  }
  return (
    <span className="ing-icon letter" style={{ width: size, height: size, background: AISLE_COLORS[entry?.aisle] ?? 'var(--border)' }} aria-hidden="true">
      {entry?.name?.[0] ?? '?'}
    </span>
  )
}

/**
 * A photo from the camera or gallery as a small square WebP data URL for the
 * catalog. `contain` fits the whole picture in (a product shot of a tall
 * bottle) instead of cropping the middle square.
 */
export async function photoToIcon(file, size = 128, { contain = false } = {}) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const w = img.naturalWidth
    const h = img.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (contain) {
      const scale = size / Math.max(w, h)
      ctx.drawImage(img, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale)
    } else {
      const side = Math.min(w, h)
      ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
    }
    const webp = canvas.toDataURL('image/webp', 0.8)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

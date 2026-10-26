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

const CatalogContext = createContext(null)

/**
 * The ingredient catalog for the whole app: the shared list plus the
 * household's own ingredients from Supabase (cached on the phone), or the
 * built-in starting list until that loads.
 */
export function CatalogProvider({ children }) {
  const [entries, setEntries] = useState(() => readCache() ?? SEED_INGREDIENTS)

  const refresh = useCallback(async () => {
    let { data, error } = await supabase.from('ingredients').select(`${COLUMNS}, ${KCAL_COLUMNS}`).order('name')
    if (error?.code === '42703') ({ data, error } = await supabase.from('ingredients').select(COLUMNS).order('name'))
    if (error || !data?.length) return
    setEntries(data)
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
    const index = buildCatalogIndex([...all.filter((e) => e.household_id), ...all.filter((e) => !e.household_id)])
    const match = (name) => matchIngredient(index, name)
    /** The same key for an ingredient however it is written, and for a brand and what it stands for. */
    const canonical = (name) => {
      const e = match(name)
      return e ? (e.base ?? e.name).toLowerCase() : normalizeName(name)
    }
    return { entries: all, add, update, remove, refresh, match, canonical }
  }, [entries, add, update, remove, refresh])
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

/** A photo from the camera or gallery as a small square WebP data URL for the catalog. */
export async function photoToIcon(file, size = 128) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas
      .getContext('2d')
      .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
    const webp = canvas.toDataURL('image/webp', 0.8)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SEED_INGREDIENTS } from './data/ingredients.js'
import { buildCatalogIndex, imageUrl, matchIngredient } from './lib/catalog.js'
import { supabase } from './lib/supabase.js'

const CACHE_KEY = 'cooking-app:catalog'

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? null
  } catch {
    return null
  }
}

const CatalogContext = createContext(null)

/**
 * The ingredient catalog for the whole app: the shared one from Supabase
 * (cached on the phone), or the built-in starting list until that loads.
 */
export function CatalogProvider({ children }) {
  const [entries, setEntries] = useState(() => readCache() ?? SEED_INGREDIENTS)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from('ingredients').select('name, aisle, image, aliases').order('name')
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
      const { error } = await supabase.from('ingredients').insert(entry)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const value = useMemo(() => {
    const index = buildCatalogIndex(entries)
    return { entries, add, refresh, match: (name) => matchIngredient(index, name) }
  }, [entries, add, refresh])
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

/** Small picture of a catalog ingredient, or its first letter when there is none. */
export function IngredientIcon({ entry, size = 28 }) {
  const [failed, setFailed] = useState(false)
  const src = imageUrl(entry)
  if (src && !failed) {
    return <img className="ing-icon" src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />
  }
  return (
    <span className="ing-icon letter" style={{ width: size, height: size, background: AISLE_COLORS[entry?.aisle] ?? 'var(--border)' }} aria-hidden="true">
      {entry?.name?.[0] ?? '?'}
    </span>
  )
}

import { supabase } from './supabase.js'
import { getHousehold } from './sync.js'

// What the household has at home: one row per ingredient, shared live
// between phones, with a copy on the phone for when it is offline.

const CACHE_KEY = 'cooking-app:pantry'

export function cachedPantry() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? []
  } catch {
    return []
  }
}

export async function loadPantry() {
  const { data, error } = await supabase.from('pantry_items').select('id, name, amount, updated_at').order('name')
  if (error) throw error
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
  return data
}

/** Adds an ingredient, or updates the amount when it is already there. */
export async function addToPantry(name, amount = '') {
  const household_id = (await getHousehold()).id
  const { error } = await supabase.from('pantry_items').insert({ household_id, name: name.trim(), amount: amount.trim() })
  if (error?.code === '23505') {
    const { error: e } = await supabase
      .from('pantry_items')
      .update({ amount: amount.trim(), updated_at: new Date().toISOString() })
      .eq('household_id', household_id)
      .ilike('name', name.trim())
    if (e) throw e
  } else if (error) throw error
}

export async function updatePantryItem(id, patch) {
  const { error } = await supabase.from('pantry_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function removeFromPantry(id) {
  const { error } = await supabase.from('pantry_items').delete().eq('id', id)
  if (error) throw error
}

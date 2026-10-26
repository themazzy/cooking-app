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
  let { data, error } = await supabase.from('pantry_items').select('id, name, amount, min_amount, expires_on, updated_at').order('name')
  // Before the stock columns are added (supabase-home-stock.sql)
  if (error?.code === '42703') ({ data, error } = await supabase.from('pantry_items').select('id, name, amount, updated_at').order('name'))
  if (error) throw error
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
  return data
}

/** Adds an ingredient (with `extra` fields such as min_amount or expires_on), or updates it when it is already there. */
export async function addToPantry(name, amount = '', extra = {}) {
  const household_id = (await getHousehold()).id
  const { error } = await supabase.from('pantry_items').insert({ household_id, name: name.trim(), amount: amount.trim(), ...extra })
  if (error?.code === '23505') {
    const { error: e } = await supabase
      .from('pantry_items')
      .update({ amount: amount.trim(), ...extra, updated_at: new Date().toISOString() })
      .eq('household_id', household_id)
      // The same name in any case; % and _ would otherwise match other names
      .ilike('name', name.trim().replace(/[\\%_]/g, '\\$&'))
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

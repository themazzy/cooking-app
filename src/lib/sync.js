import { supabase } from './supabase.js'
import { deleteRecipe, getRecipe, getVideo, listRecipes, putRecipe, putVideo } from './store.js'

// Keeps the recipes on this phone and the household's recipes in Supabase in
// step. The phone stays the working copy (it works offline); each sync
// pushes what changed here and pulls what changed elsewhere, newest wins.
// Saved videos stay on the phone that saved them; only older recipes may
// still have one in the household's storage (videoPath), which can be played.

const LAST_PULL_KEY = 'cooking-app:last-pull'
const DELETED_KEY = 'cooking-app:deleted'

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

let household = null
export async function getHousehold({ refresh = false } = {}) {
  if (household && !refresh) return household
  const { data, error } = await supabase.rpc('my_household')
  if (error) throw error
  household = data
  return household
}
export const forgetHousehold = () => {
  household = null
  localStorage.removeItem(LAST_PULL_KEY)
}

export async function joinHousehold(code) {
  const { data, error } = await supabase.rpc('join_household', { code })
  if (error) throw error
  household = data
  // Everything from the new household comes down on the next sync
  localStorage.removeItem(LAST_PULL_KEY)
  return data
}

/** Remembers a deletion until it has reached the server. */
export function markDeleted(id) {
  write(DELETED_KEY, [...new Set([...read(DELETED_KEY, []), id])])
}

async function pushRecipe(hid, recipe, userId) {
  const { syncedAt: _s, videoUploaded: _u, ...data } = recipe
  const path = recipe.videoPath ?? null
  const row = {
    id: recipe.id,
    household_id: hid,
    title: recipe.title ?? '',
    data: { ...data, videoPath: path },
    video_path: path,
    deleted: false,
    updated_at: new Date(recipe.updatedAt ?? Date.now()).toISOString(),
    updated_by: userId,
  }
  const { error } = await supabase.from('recipes').upsert(row)
  if (error) throw error
  await putRecipe({ ...recipe, syncedAt: recipe.updatedAt })
}

/**
 * One round of syncing. Returns { pushed, pulled } counts.
 * Does nothing (returns null) when nobody is signed in.
 */
export async function syncRecipes() {
  const { data: session } = await supabase.auth.getSession()
  const user = session?.session?.user
  if (!user) return null
  const hid = (await getHousehold()).id
  let pushed = 0
  let pulled = 0

  // 1. Deletions made here
  const deleted = read(DELETED_KEY, [])
  for (const id of deleted) {
    const { error } = await supabase
      .from('recipes')
      .update({ deleted: true, video_path: null, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', id)
    if (error) throw error
    await supabase.storage.from('recipe-videos').remove([`${hid}/${id}.webm`, `${hid}/${id}.mp4`])
  }
  write(DELETED_KEY, [])

  // 2. Changes from the other phone(s)
  const since = read(LAST_PULL_KEY, null)
  let query = supabase.from('recipes').select('id, data, deleted, updated_at, video_path').eq('household_id', hid).order('updated_at')
  if (since) query = query.gt('updated_at', since)
  const { data: rows, error } = await query
  if (error) throw error
  for (const row of rows ?? []) {
    const remoteAt = Date.parse(row.updated_at)
    const local = await getRecipe(row.id)
    if (row.deleted) {
      if (local) {
        await deleteRecipe(row.id)
        pulled++
      }
      continue
    }
    // Local edits that are newer win; they are pushed below
    if (local && (local.updatedAt ?? 0) > remoteAt && local.syncedAt !== local.updatedAt) continue
    await putRecipe({ ...row.data, id: row.id, updatedAt: remoteAt, syncedAt: remoteAt, videoPath: row.video_path })
    pulled++
  }
  if (rows?.length) write(LAST_PULL_KEY, rows[rows.length - 1].updated_at)

  // 3. Recipes saved or changed here since their last sync
  for (const recipe of await listRecipes()) {
    if (recipe.syncedAt === recipe.updatedAt) continue
    await pushRecipe(hid, recipe, user.id)
    pushed++
  }
  return { pushed, pulled }
}

/** The recipe's video from this phone, or downloaded from the household's storage. */
export async function loadVideo(recipe) {
  const local = await getVideo(recipe.id)
  if (local) return local
  if (!recipe.videoPath) return null
  const { data, error } = await supabase.storage.from('recipe-videos').download(recipe.videoPath)
  if (error) throw error
  await putVideo(recipe.id, data)
  return data
}

/** Shopping list: newer of the local and the shared one. Pushes the local one when it is newer. */
export async function syncShopping(local) {
  const { data: session } = await supabase.auth.getSession()
  const user = session?.session?.user
  if (!user) return local
  const hid = (await getHousehold()).id
  const { data: row, error } = await supabase.from('shopping_lists').select('data, updated_at').eq('household_id', hid).maybeSingle()
  if (error) throw error
  const remoteAt = row ? Date.parse(row.updated_at) : 0
  const localAt = local?.updatedAt ?? 0
  if (row?.data && remoteAt > localAt) return { ...row.data, updatedAt: remoteAt }
  if (local && localAt > remoteAt) {
    const { error: e } = await supabase
      .from('shopping_lists')
      .upsert({ household_id: hid, data: local, updated_at: new Date(localAt).toISOString(), updated_by: user.id })
    if (e) throw e
  }
  return local
}

/** Calls `onChange` when the other phone changes a recipe or the list. Returns an unsubscribe function. */
export async function subscribeHousehold(onChange) {
  const hid = (await getHousehold()).id
  const channel = supabase
    .channel(`household-${hid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `household_id=eq.${hid}` }, () => onChange('recipes'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `household_id=eq.${hid}` }, () => onChange('shopping'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items', filter: `household_id=eq.${hid}` }, () => onChange('pantry'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients', filter: `household_id=eq.${hid}` }, () => onChange('ingredients'))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

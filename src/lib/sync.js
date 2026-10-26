import { supabase } from './supabase.js'
import { deleteRecipe, getRecipe, getVideo, listRecipes, putRecipe, putVideo } from './store.js'
import { mergeLists } from './listMerge.js'

// Keeps the recipes on this phone and the household's recipes in Supabase in
// step. The phone stays the working copy (it works offline); each sync
// pushes what changed here and pulls what changed elsewhere, newest wins.
// Saved videos stay on the phone that saved them; only older recipes may
// still have one in the household's storage (videoPath), which can be played.

const DELETED_KEY = 'cooking-app:deleted'
// The shopping list as both phones last agreed on it, to join their edits
const SHOPPING_BASE_KEY = 'cooking-app:shopping-base'

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
  localStorage.removeItem(SHOPPING_BASE_KEY)
}

export async function joinHousehold(code) {
  const { data, error } = await supabase.rpc('join_household', { code })
  if (error) throw error
  household = data
  localStorage.removeItem(SHOPPING_BASE_KEY)
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
  // Saved again while uploading: that newer edit stays, and goes up next time
  const now = await getRecipe(recipe.id)
  if (now && now.updatedAt === recipe.updatedAt) await putRecipe({ ...now, syncedAt: recipe.updatedAt })
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
  // Deletions made while this ran are kept for next time
  if (deleted.length) write(DELETED_KEY, read(DELETED_KEY, []).filter((id) => !deleted.includes(id)))

  // 2. Changes from the other phone(s). Every recipe's id and time is
  // compared with when this phone last synced it (a short list), then only
  // the changed ones are downloaded whole.
  const { data: rows, error } = await supabase.from('recipes').select('id, deleted, updated_at').eq('household_id', hid)
  if (error) throw error
  const locals = new Map((await listRecipes()).map((r) => [r.id, r]))
  const wanted = []
  for (const row of rows ?? []) {
    const remoteAt = Date.parse(row.updated_at)
    const local = locals.get(row.id)
    if (row.deleted) {
      if (local) {
        await deleteRecipe(row.id)
        pulled++
      }
      continue
    }
    if (local?.syncedAt === remoteAt) continue
    // Local edits that are newer win; they are pushed below
    if (local && local.syncedAt !== local.updatedAt && (local.updatedAt ?? 0) > remoteAt) continue
    wanted.push(row.id)
  }
  for (let n = 0; n < wanted.length; n += 50) {
    const { data: full, error: e } = await supabase.from('recipes').select('id, data, updated_at, video_path').in('id', wanted.slice(n, n + 50))
    if (e) throw e
    for (const row of full ?? []) {
      // Saved here while downloading: keep that edit
      const now = await getRecipe(row.id)
      if ((now?.updatedAt ?? null) !== (locals.get(row.id)?.updatedAt ?? null)) continue
      const remoteAt = Date.parse(row.updated_at)
      await putRecipe({ ...row.data, id: row.id, updatedAt: remoteAt, syncedAt: remoteAt, videoPath: row.video_path })
      pulled++
    }
  }

  // 3. Recipes saved or changed here since their last sync. One that fails
  // (say, a recipe of a household this account has left) does not stop the rest.
  const failed = []
  for (const recipe of await listRecipes()) {
    if (recipe.syncedAt === recipe.updatedAt) continue
    try {
      await pushRecipe(hid, recipe, user.id)
      pushed++
    } catch (err) {
      failed.push(`${recipe.title || 'A recipe'}: ${err?.message ?? err}`)
    }
  }
  if (failed.length) throw new Error(`${failed.length} recipe${failed.length > 1 ? 's' : ''} not uploaded (${failed[0]})`)
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

/**
 * Shopping list (with the meal plan): takes the shared one when only it
 * changed, uploads this phone's when only it changed, and joins the two when
 * both did. Returns the list to keep on this phone.
 */
export async function syncShopping(local) {
  const { data: session } = await supabase.auth.getSession()
  const user = session?.session?.user
  if (!user) return local
  const hid = (await getHousehold()).id
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error } = await supabase.from('shopping_lists').select('data, updated_at').eq('household_id', hid).maybeSingle()
    if (error) throw error
    const remoteAt = row ? Date.parse(row.updated_at) : 0
    const remote = row?.data ? { ...row.data, updatedAt: remoteAt } : null
    const localAt = local?.updatedAt ?? 0
    const base = read(SHOPPING_BASE_KEY, null)

    let result
    if (!remote) result = local
    else if (!local) result = remote
    else if (!base) result = remoteAt >= localAt ? remote : local // first sync since this update: newer wins
    else {
      const localChanged = localAt !== base.updatedAt
      const remoteChanged = remoteAt !== base.updatedAt
      if (!remoteChanged && !localChanged) return local
      if (!remoteChanged) result = local
      else if (!localChanged) result = remote
      else result = { ...mergeLists(base, local, remote), updatedAt: Math.max(Date.now(), remoteAt + 1) }
    }
    if (!result) return local

    if (result !== remote) {
      // Only replaces the version read above, so a change from the other phone in between is not lost
      const at = new Date(result.updatedAt ?? Date.now()).toISOString()
      const fields = { data: { ...result, updatedAt: undefined }, updated_at: at, updated_by: user.id }
      const { data: written, error: e } = row
        ? await supabase.from('shopping_lists').update(fields).eq('household_id', hid).eq('updated_at', row.updated_at).select('household_id')
        : await supabase.from('shopping_lists').insert({ household_id: hid, ...fields }).select('household_id')
      if (e?.code === '23505' || (!e && !written?.length)) continue // the other phone was quicker: read again
      if (e) throw e
      result = { ...result, updatedAt: Date.parse(at) }
    }
    write(SHOPPING_BASE_KEY, result)
    return result
  }
  throw new Error('The shopping list kept changing on the other phone; try again')
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

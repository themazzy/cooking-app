import { supabase } from './supabase.js'
import { deleteRecipe, getPhoto, getRecipe, getVideo, listRecipes, newId, putPhoto, putRecipe, putVideo } from './store.js'
import { mergeLists } from './listMerge.js'
import { mergeRecipe } from './recipeMerge.js'
import { blobToDataUrl, dataUrlToBlob, localPhoto, storePhoto } from './photos.js'

// Keeps the recipes on this phone and the household's recipes in Supabase in
// step. The phone stays the working copy (it works offline); each sync
// pushes what changed here and pulls what changed elsewhere. When both phones
// changed a recipe, the two versions are joined field by field (recipeMerge.js)
// against the last version both had (`syncBase`), so a rating on one phone and
// a cooked entry on the other both stay.
// Saved videos stay on the phone that saved them; only older recipes may
// still have one in the household's storage (videoPath), which can be played.
// Recipe photos go to the same private bucket (see photos.js).

const BUCKET = 'recipe-videos'

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

/**
 * Moves this account into the household with the invite code. With `bring`,
 * the recipes on this phone are copied into it (under new ids, since the
 * old household keeps its own copies); otherwise they are removed from this
 * phone, as they belong to the household left behind.
 */
export async function joinHousehold(code, { bring = true } = {}) {
  const before = await getHousehold().catch(() => null)
  const { data, error } = await supabase.rpc('join_household', { code })
  if (error) throw error
  household = data
  if (before?.id === data.id) return data
  localStorage.removeItem(SHOPPING_BASE_KEY)
  for (const recipe of await listRecipes()) {
    if (bring) {
      const id = newId()
      const [video, photo] = await Promise.all([getVideo(recipe.id), getPhoto(recipe.id)])
      if (video) await putVideo(id, video)
      if (photo) await putPhoto(id, photo)
      const { syncedAt: _s, syncBase: _b, videoPath: _v, photoStale: _p, ...rest } = recipe
      await putRecipe({ ...rest, id, photoPath: null, updatedAt: Date.now() })
    }
    await deleteRecipe(recipe.id)
  }
  return data
}

/** Remembers a deletion until it has reached the server. */
export function markDeleted(id) {
  write(DELETED_KEY, [...new Set([...read(DELETED_KEY, []), id])])
}

/** Uploads the recipe's photo when it has a new one. Returns its bucket path, or throws. */
async function uploadPhoto(hid, recipe) {
  const data = await localPhoto(recipe)
  if (!data) return null
  const path = `${hid}/${recipe.id}-${recipe.photoKey}.webp`
  const blob = dataUrlToBlob(data)
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type })
  if (error) throw error
  return path
}

/** What the server keeps of a recipe (and what both phones last agreed on). */
const shared = (recipe) => {
  const { syncedAt: _s, syncBase: _b, videoUploaded: _u, photo: _p, photoStale: _ps, updatedAt: _at, ...data } = recipe
  return data
}

/**
 * Returns a warning when the recipe went up but its photo could not, or
 * `false` when the other phone changed it first (it is joined on the next round).
 */
async function pushRecipe(hid, recipe, userId) {
  let warning = null
  let photoPath = recipe.photoPath ?? null
  if (recipe.photoKey && !photoPath) {
    try {
      photoPath = await uploadPhoto(hid, recipe)
    } catch (err) {
      warning = `Photos are not shared yet (${err?.message ?? err})`
    }
  }
  if (recipe.photoStale && recipe.photoStale !== photoPath) await supabase.storage.from(BUCKET).remove([recipe.photoStale]).catch(() => {})
  const path = recipe.videoPath ?? null
  const data = { ...shared(recipe), videoPath: path, photoPath }
  const row = {
    id: recipe.id,
    household_id: hid,
    title: recipe.title ?? '',
    data: { ...data, updatedAt: recipe.updatedAt },
    video_path: path,
    deleted: false,
    updated_at: new Date(recipe.updatedAt ?? Date.now()).toISOString(),
    updated_by: userId,
  }
  if (recipe.syncedAt) {
    // Only replaces the version this phone last had, so a change from the other phone in between is not lost
    const { id: _id, household_id: _h, ...fields } = row
    const { data: written, error } = await supabase
      .from('recipes')
      .update(fields)
      .eq('id', recipe.id)
      .eq('updated_at', new Date(recipe.syncedAt).toISOString())
      .select('id')
    if (error) throw error
    if (!written?.length) {
      const { data: there } = await supabase.from('recipes').select('id').eq('id', recipe.id)
      if (there?.length) return false
      // Not on the server at all (never arrived): it goes up whole
      const { error: e } = await supabase.from('recipes').upsert(row)
      if (e) throw e
    }
  } else {
    const { error } = await supabase.from('recipes').upsert(row)
    if (error) throw error
  }
  // Saved again while uploading: that newer edit stays, and goes up next time
  const now = await getRecipe(recipe.id)
  if (now) {
    const photoNow = now.photoKey === recipe.photoKey ? { photoPath, photoStale: null } : {}
    await putRecipe({ ...now, ...photoNow, syncedAt: recipe.updatedAt, syncBase: data })
  }
  return warning
}

/**
 * Syncs the recipes. Returns { pushed, pulled, warning } counts.
 * Does nothing (returns null) when nobody is signed in.
 */
export async function syncRecipes() {
  let total = null
  // A recipe the other phone changed while this one uploaded is joined and sent again
  for (let round = 0; round < 3; round++) {
    const done = await syncRound()
    if (!done) return done
    total = { pushed: (total?.pushed ?? 0) + done.pushed, pulled: (total?.pulled ?? 0) + done.pulled, warning: done.warning ?? total?.warning ?? null }
    if (!done.again) return total
  }
  throw new Error('A recipe kept changing on the other phone; try again')
}

/** One round: deletions, changes from elsewhere, changes from here. */
async function syncRound() {
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
    const { data: photos } = await supabase.storage.from(BUCKET).list(hid, { search: id })
    await supabase.storage.from(BUCKET).remove([`${hid}/${id}.webm`, `${hid}/${id}.mp4`, ...(photos ?? []).map((f) => `${hid}/${f.name}`)])
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
      const theirs = { ...row.data, id: row.id, updatedAt: remoteAt, videoPath: row.video_path }
      const base = shared(theirs)
      if (now && now.syncedAt !== now.updatedAt) {
        // Changed here too: both changes are kept, and the result goes up below
        const merged = mergeRecipe(now.syncBase ?? null, now, theirs)
        await putRecipe({ ...merged, id: row.id, updatedAt: Math.max(Date.now(), remoteAt + 1), syncedAt: remoteAt, syncBase: base })
      } else {
        await putRecipe({ ...theirs, syncedAt: remoteAt, syncBase: base })
      }
      pulled++
    }
  }

  // Recipes saved before photos had their own store carry the photo inside;
  // it moves out, and the recipe goes up again without it
  for (const recipe of await listRecipes()) {
    if (!('photo' in recipe)) continue
    const { photo, ...rest } = recipe
    if (typeof photo === 'string') await putRecipe({ ...(await storePhoto(recipe)), updatedAt: Date.now() })
    else await putRecipe(rest)
  }

  // 3. Recipes saved or changed here since their last sync, and photos that
  // could not go up last time. One that fails does not stop the rest.
  const failed = []
  let warning = null
  let raced = false
  for (const recipe of await listRecipes()) {
    const photoWaiting = recipe.photoKey && !recipe.photoPath && (await localPhoto(recipe))
    if (recipe.syncedAt === recipe.updatedAt && !photoWaiting) continue
    try {
      const result = await pushRecipe(hid, recipe, user.id)
      if (result === false) {
        raced = true
        continue
      }
      warning = result ?? warning
      pushed++
    } catch (err) {
      failed.push(`${recipe.title || 'A recipe'}: ${err?.message ?? err}`)
    }
  }
  if (failed.length) throw new Error(`${failed.length} recipe${failed.length > 1 ? 's' : ''} not uploaded (${failed[0]})`)
  return { pushed, pulled, warning, again: raced }
}

/** The recipe's video from this phone, or downloaded from the household's storage. */
export async function loadVideo(recipe) {
  const local = await getVideo(recipe.id)
  if (local) return local
  if (!recipe.videoPath) return null
  const { data, error } = await supabase.storage.from(BUCKET).download(recipe.videoPath)
  if (error) throw error
  await putVideo(recipe.id, data)
  return data
}

/** The recipe's photo as a data URL: from this phone, or downloaded from the household's storage. */
export async function loadPhoto(recipe) {
  const here = await localPhoto(recipe)
  if (here || !recipe?.photoKey || !recipe.photoPath) return here
  const { data, error } = await supabase.storage.from(BUCKET).download(recipe.photoPath)
  if (error) throw error
  const url = await blobToDataUrl(data)
  await putPhoto(recipe.id, { key: recipe.photoKey, data: url })
  return url
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

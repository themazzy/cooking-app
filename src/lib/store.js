// Saved recipes with their videos and photos, kept on this device in
// IndexedDB. Videos and photos have their own stores so the recipe list stays light.

const DB_NAME = 'cooking-app'
let dbPromise = null

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('recipes')) d.createObjectStore('recipes', { keyPath: 'id' })
      if (!d.objectStoreNames.contains('videos')) d.createObjectStore('videos')
      // Version 2: recipe photos, { key, data } by recipe id
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run(store, mode, fn) {
  const d = await db()
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export async function listRecipes() {
  const all = (await run('recipes', 'readonly', (s) => s.getAll())) ?? []
  return all.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}
export const getRecipe = (id) => run('recipes', 'readonly', (s) => s.get(id))
export const putRecipe = (recipe) => run('recipes', 'readwrite', (s) => s.put(recipe))
export async function deleteRecipe(id) {
  await run('recipes', 'readwrite', (s) => s.delete(id))
  await run('videos', 'readwrite', (s) => s.delete(id))
  await run('photos', 'readwrite', (s) => s.delete(id))
}
export const getVideo = (id) => run('videos', 'readonly', (s) => s.get(id))
export const putVideo = (id, blob) => run('videos', 'readwrite', (s) => s.put(blob, id))
export const getPhoto = (id) => run('photos', 'readonly', (s) => s.get(id))
export const putPhoto = (id, photo) => run('photos', 'readwrite', (s) => s.put(photo, id))
export const deletePhoto = (id) => run('photos', 'readwrite', (s) => s.delete(id))

/** Empties this device's saved recipes, videos and photos (signing out with "clear"). */
export async function clearDevice() {
  for (const store of ['recipes', 'videos', 'photos']) await run(store, 'readwrite', (s) => s.clear())
}

/** Asks the browser not to evict saved data when the phone runs low on space. */
export async function persistStorage() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // not supported; data is still kept, just evictable
  }
}

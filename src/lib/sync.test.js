import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny stand-in for the Supabase tables and the phone's recipe store
const db = { recipes: [], shopping_lists: [] }
const local = new Map()
const photos = new Map()
const bucket = new Map()

function query(table) {
  const filters = []
  let op = { kind: 'select' }
  const rows = () => db[table].filter((r) => filters.every(([k, v, how]) => (how === 'in' ? v.includes(r[k]) : r[k] === v)))
  const run = () => {
    if (op.kind === 'insert') {
      if (db[table].some((r) => r.household_id === op.row.household_id)) return { data: null, error: { code: '23505' } }
      db[table].push({ ...op.row })
      return { data: [op.row], error: null }
    }
    if (op.kind === 'update') {
      const hit = rows()
      hit.forEach((r) => Object.assign(r, op.fields))
      return { data: hit, error: null }
    }
    if (op.kind === 'upsert') {
      const i = db[table].findIndex((r) => r.id === op.row.id)
      if (i >= 0) db[table][i] = { ...op.row }
      else db[table].push({ ...op.row })
      return { error: null }
    }
    return { data: structuredClone(rows()), error: null }
  }
  const q = {
    select: () => q,
    eq: (k, v) => (filters.push([k, v]), q),
    in: (k, v) => (filters.push([k, v, 'in']), q),
    insert: (row) => ((op = { kind: 'insert', row }), q),
    update: (fields) => ((op = { kind: 'update', fields }), q),
    upsert: (row) => ((op = { kind: 'upsert', row }), q),
    maybeSingle: () => Promise.resolve({ data: structuredClone(rows()[0] ?? null), error: null }),
    then: (ok, bad) => Promise.resolve(run()).then(ok, bad),
  }
  return q
}

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    rpc: async () => ({ data: { id: 'h1' }, error: null }),
    from: (table) => query(table),
    storage: {
      from: () => ({
        remove: async (paths) => (paths.forEach((p) => bucket.delete(p)), {}),
        list: async () => ({ data: [] }),
        upload: async (path, blob) => (bucket.set(path, blob), { error: null }),
      }),
    },
  },
}))
vi.mock('./store.js', () => ({
  listRecipes: async () => [...local.values()].map((r) => structuredClone(r)),
  getRecipe: async (id) => structuredClone(local.get(id)),
  putRecipe: async (r) => void local.set(r.id, structuredClone(r)),
  deleteRecipe: async (id) => void local.delete(id),
  getVideo: async () => null,
  putVideo: async () => {},
  getPhoto: async (id) => photos.get(id),
  putPhoto: async (id, p) => void photos.set(id, p),
  deletePhoto: async (id) => void photos.delete(id),
  newId: () => Math.random().toString(36).slice(2),
}))

const { syncRecipes, syncShopping } = await import('./sync.js')

const iso = (ms) => new Date(ms).toISOString()

beforeEach(() => {
  db.recipes = []
  db.shopping_lists = []
  local.clear()
  photos.clear()
  bucket.clear()
  localStorage.clear()
})

describe('syncRecipes', () => {
  it('pulls a change the other phone stamped earlier than what this phone has seen', async () => {
    db.recipes.push({ id: 'a', household_id: 'h1', data: { title: 'A' }, deleted: false, updated_at: iso(5000), video_path: null })
    await syncRecipes()
    expect(local.get('a').title).toBe('A')
    // The other phone saved offline at 3000 and uploads now
    db.recipes.push({ id: 'b', household_id: 'h1', data: { title: 'B' }, deleted: false, updated_at: iso(3000), video_path: null })
    await syncRecipes()
    expect(local.get('b')?.title).toBe('B')
  })

  it('pushes local edits and keeps them when newer than the shared copy', async () => {
    db.recipes.push({ id: 'a', household_id: 'h1', data: { title: 'Old' }, deleted: false, updated_at: iso(1000), video_path: null })
    local.set('a', { id: 'a', title: 'New', updatedAt: 2000, syncedAt: 1000 })
    const { pushed } = await syncRecipes()
    expect(pushed).toBe(1)
    expect(db.recipes[0].data.title).toBe('New')
    expect(local.get('a').syncedAt).toBe(2000)
  })

  it('removes recipes deleted on the other phone', async () => {
    local.set('a', { id: 'a', title: 'A', updatedAt: 1000, syncedAt: 1000 })
    db.recipes.push({ id: 'a', household_id: 'h1', data: {}, deleted: true, updated_at: iso(2000), video_path: null })
    await syncRecipes()
    expect(local.has('a')).toBe(false)
  })
})

describe('recipe photos', () => {
  const photo = `data:image/webp;base64,${btoa('pic')}`

  it('uploads a new photo and keeps it out of the recipe row', async () => {
    photos.set('a', { key: 'k1', data: photo })
    local.set('a', { id: 'a', title: 'A', photoKey: 'k1', photoPath: null, updatedAt: 1000 })
    await syncRecipes()
    expect(bucket.has('h1/a-k1.webp')).toBe(true)
    expect(db.recipes[0].data.photoPath).toBe('h1/a-k1.webp')
    expect(db.recipes[0].data.photo).toBeUndefined()
    expect(local.get('a').photoPath).toBe('h1/a-k1.webp')
  })

  it('moves a photo saved inside an older recipe into the photo store', async () => {
    local.set('a', { id: 'a', title: 'A', photo, updatedAt: 1000, syncedAt: 1000 })
    await syncRecipes()
    expect(local.get('a').photo).toBeUndefined()
    expect(photos.get('a').data).toBe(photo)
    expect(db.recipes[0].data.photo).toBeUndefined()
    expect(bucket.size).toBe(1)
  })
})

describe('syncShopping', () => {
  const item = (key, checked = false) => ({ key, name: key, checked })

  it('joins ticks made on both phones', async () => {
    const start = await syncShopping({ createdAt: 1, recipes: [], items: [item('milk'), item('eggs')], updatedAt: 1000 })
    expect(db.shopping_lists).toHaveLength(1)
    // The other phone ticks eggs
    const row = db.shopping_lists[0]
    row.data = { ...row.data, items: [item('milk'), item('eggs', true)] }
    row.updated_at = iso(3000)
    // This phone ticks milk
    const mine = { ...start, items: [item('milk', true), item('eggs')], updatedAt: 2000 }
    const merged = await syncShopping(mine)
    expect(merged.items.map((i) => i.checked)).toEqual([true, true])
    expect(db.shopping_lists[0].data.items.map((i) => i.checked)).toEqual([true, true])
  })

  it('takes the shared list when only it changed, and sends nothing', async () => {
    const start = await syncShopping({ createdAt: 1, recipes: [], items: [item('milk')], updatedAt: 1000 })
    const row = db.shopping_lists[0]
    row.data = { ...row.data, items: [item('milk', true)] }
    row.updated_at = iso(500) // the other phone's clock is behind
    const got = await syncShopping(start)
    expect(got.items[0].checked).toBe(true)
    expect(await syncShopping(got)).toBe(got)
  })
})

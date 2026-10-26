import { deletePhoto, getPhoto, newId, putPhoto } from './store.js'

// A recipe's own photo lives outside the recipe, so the recipe list and the
// synced recipe text stay small: on this phone in IndexedDB ('photos', by
// recipe id) and for the household in the private bucket. The recipe keeps
//   photoKey   which version of the photo it has (null: none)
//   photoPath  where that version is in the bucket (null: not uploaded yet)
//   photoThumb a small copy for the recipe list
//   photoStale an older upload to remove on the next sync
// `photo` (a data URL) is only set on the recipe open on screen.

/** A data URL as a Blob, for uploading. */
export function dataUrlToBlob(url) {
  const [head, body] = url.split(',')
  const type = head.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/** A 240 px wide copy of a photo for the recipe list, or null when it can't be drawn. */
export async function photoThumbOf(url, width = 240) {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, width / img.naturalWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const webp = canvas.toDataURL('image/webp', 0.7)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

/**
 * The recipe as it is stored (without `photo`), keeping a new or removed
 * photo in the photo store. `photo` undefined means it was not loaded or
 * not changed; null means removed. The recipe needs its id.
 */
export async function storePhoto(recipe) {
  const { photo, ...rest } = recipe
  if (photo === undefined) return rest
  const have = rest.photoKey ? await getPhoto(rest.id) : null
  if (photo && have && have.key === rest.photoKey && have.data === photo) return rest
  const stale = rest.photoPath ?? rest.photoStale ?? null
  if (!photo) {
    if (!rest.photoKey) return rest
    await deletePhoto(rest.id)
    return { ...rest, photoKey: null, photoPath: null, photoThumb: null, photoStale: stale }
  }
  const key = newId().replace(/-/g, '').slice(0, 10)
  await putPhoto(rest.id, { key, data: photo })
  return { ...rest, photoKey: key, photoPath: null, photoThumb: await photoThumbOf(photo), photoStale: stale }
}

/** The recipe's photo from this phone, or null when it has none or it is not here yet. */
export async function localPhoto(recipe) {
  if (!recipe?.photoKey) return null
  const have = await getPhoto(recipe.id)
  return have?.key === recipe.photoKey ? have.data : null
}

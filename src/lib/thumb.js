// A small picture of a recipe's video for the recipe list, stored with the
// recipe as a WebP data URL (a few KB) so it syncs with the recipe text.

export async function videoThumb(blob, width = 240) {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await waitFor(video, 'loadedmetadata')
    video.currentTime = Math.min(1.5, (video.duration || 3) * 0.25)
    await waitFor(video, 'seeked')
    const h = Math.round((width * video.videoHeight) / video.videoWidth) || width
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, width, h)
    const webp = canvas.toDataURL('image/webp', 0.7)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

const waitFor = (el, event, ms = 8000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${event} timed out`)), ms)
    el.addEventListener(event, () => (clearTimeout(t), resolve()), { once: true })
    el.addEventListener('error', () => (clearTimeout(t), reject(new Error('video error'))), { once: true })
  })

/**
 * A photo the cook took or picked for a recipe, scaled down to a WebP of a
 * few hundred KB at most so it can sync with the recipe text.
 */
export async function recipePhoto(file, longSide = 1280) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const webp = canvas.toDataURL('image/webp', 0.8)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    bitmap.close?.()
  }
}

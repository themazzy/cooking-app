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

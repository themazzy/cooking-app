import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { blobToDataUrl } from './photos.js'

// Sending a recipe to someone. The Android app opens Android's share sheet
// (Viber, Messenger, WhatsApp, e-mail…); a computer's browser uses its own
// share menu where it has one, otherwise the text is copied and a PDF is
// downloaded.

const native = () => Capacitor.isNativePlatform()

/** Shares text. Resolves to 'shared', 'copied' or 'cancelled'. */
export async function shareText(text, title = '') {
  try {
    if (native()) {
      await Share.share({ title, text, dialogTitle: 'Share recipe' })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch (e) {
    if (isCancel(e)) return 'cancelled'
    if (native()) throw e
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}

const isCancel = (e) => e?.name === 'AbortError' || /cancel/i.test(e?.message ?? '')

/** A file name from a recipe title: "Kuřecí kari.pdf" stays readable, slashes and the like go. */
export const fileName = (title, ext) => `${String(title || 'Recipe').replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Recipe'}.${ext}`

/** Shares a file (a PDF). Resolves to 'shared', 'downloaded' or 'cancelled'. */
export async function shareFile(blob, name, title = '') {
  if (native()) {
    const data = (await blobToDataUrl(blob)).split(',')[1]
    const { uri } = await Filesystem.writeFile({ path: `share/${name}`, data, directory: Directory.Cache, recursive: true })
    try {
      await Share.share({ title, files: [uri], dialogTitle: 'Share recipe' })
    } catch (e) {
      if (isCancel(e)) return 'cancelled'
      throw e
    }
    return 'shared'
  }
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] })
      return 'shared'
    } catch (e) {
      if (isCancel(e)) return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}

/**
 * A picture as a data URL that can be drawn into a PDF. Pictures from other
 * sites can't be read back from a canvas, so the app fetches them natively;
 * a browser only manages when the site allows it. Null when it can't.
 */
export async function pictureData(src) {
  if (!src) return null
  if (/^(data|blob):/.test(src)) return src
  try {
    if (native()) {
      const res = await CapacitorHttp.get({ url: src, responseType: 'blob', connectTimeout: 10000, readTimeout: 15000 })
      if (res.status >= 400 || typeof res.data !== 'string') return null
      const type = res.headers?.['Content-Type'] ?? res.headers?.['content-type'] ?? 'image/jpeg'
      return `data:${type.split(';')[0]};base64,${res.data}`
    }
    const res = await fetch(src, { mode: 'cors' })
    return res.ok ? await blobToDataUrl(await res.blob()) : null
  } catch {
    return null
  }
}

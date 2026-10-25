import { Capacitor, CapacitorHttp } from '@capacitor/core'

// Requests to Instagram, TikTok and Facebook only work from the Android app:
// native HTTP is not subject to CORS and goes out over the phone's own IP.
// In a browser the same calls are blocked, so the web build falls back to
// pasted text and uploaded video files.
export const canFetchCrossSite = () => Capacitor.isNativePlatform()

export const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
export const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export class FetchError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function assertNative() {
  if (!canFetchCrossSite()) {
    throw new FetchError('Loading reels only works in the Android app. On the website, paste the description or upload the video.')
  }
}

/** GET a page as text. Returns { text, url } where url is the final URL after redirects. */
export async function getText(url, { headers = {}, ua = MOBILE_UA } = {}) {
  assertNative()
  const res = await CapacitorHttp.get({
    url,
    headers: { 'User-Agent': ua, 'Accept-Language': 'cs,en;q=0.8', ...headers },
    responseType: 'text',
  })
  if (res.status >= 400) throw new FetchError(`${new URL(url).hostname} answered ${res.status}`, res.status)
  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
  return { text, url: res.url || url }
}

export async function getJson(url, opts) {
  const { text } = await getText(url, opts)
  return JSON.parse(text)
}

/** GET binary data (a video file). Returns an ArrayBuffer. */
export async function getBytes(url, { headers = {}, ua = MOBILE_UA } = {}) {
  assertNative()
  const res = await CapacitorHttp.get({
    url,
    headers: { 'User-Agent': ua, ...headers },
    responseType: 'arraybuffer',
  })
  if (res.status >= 400) throw new FetchError(`Video download answered ${res.status}`, res.status)
  // The native bridge hands binary bodies over as base64
  return base64ToArrayBuffer(res.data)
}

export function base64ToArrayBuffer(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

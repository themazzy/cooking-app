import { Capacitor, CapacitorCookies, CapacitorHttp } from '@capacitor/core'

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

// Every request made during an import, so a failed import can be reported
// back with what the platforms actually answered.
let trace = []
export const resetTrace = () => (trace = [])
export const getTrace = () => trace

function record(method, url, res, text) {
  trace.push({
    method,
    url: url.split('?')[0],
    status: res?.status ?? null,
    finalUrl: res?.url && res.url !== url ? res.url.split('?')[0] : undefined,
    length: text?.length ?? 0,
    snippet: text ? text.slice(0, 600) : undefined,
  })
}

function assertNative() {
  if (!canFetchCrossSite()) {
    throw new FetchError('Loading reels only works in the Android app. On the website, paste the description or upload the video.')
  }
}

const asText = (data) => (typeof data === 'string' ? data : JSON.stringify(data))

/** GET a page as text. Returns { text, url, status } where url is the final URL after redirects. */
export async function getText(url, { headers = {}, ua = MOBILE_UA, allowError = false } = {}) {
  assertNative()
  let res
  try {
    res = await CapacitorHttp.get({
      url,
      headers: { 'User-Agent': ua, 'Accept-Language': 'cs,en;q=0.8', ...headers },
      responseType: 'text',
    })
  } catch (err) {
    record('GET', url, null, String(err?.message ?? err))
    throw err
  }
  const text = asText(res.data)
  record('GET', url, res, text)
  if (res.status >= 400 && !allowError) throw new FetchError(`${new URL(url).hostname} answered ${res.status}`, res.status)
  return { text, url: res.url || url, status: res.status }
}

export async function getJson(url, opts) {
  const { text } = await getText(url, opts)
  return JSON.parse(text)
}

/** POST a form (object of fields). Returns { text, status }. */
export async function postForm(url, fields, { headers = {}, ua = DESKTOP_UA } = {}) {
  assertNative()
  let res
  try {
    res = await CapacitorHttp.post({
      url,
      headers: { 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      data: fields,
      responseType: 'text',
    })
  } catch (err) {
    record('POST', url, null, String(err?.message ?? err))
    throw err
  }
  const text = asText(res.data)
  record('POST', url, res, text)
  return { text, status: res.status }
}

/** Value of a cookie the native cookie store holds for `url`. */
export async function getCookie(url, name) {
  try {
    const cookies = await CapacitorCookies.getCookies({ url })
    return cookies?.[name] ?? null
  } catch {
    return null
  }
}

/** GET binary data (a video file). Returns an ArrayBuffer. */
export async function getBytes(url, { headers = {}, ua = MOBILE_UA } = {}) {
  assertNative()
  const res = await CapacitorHttp.get({
    url,
    headers: { 'User-Agent': ua, ...headers },
    responseType: 'arraybuffer',
  })
  record('GET', url, res, null)
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

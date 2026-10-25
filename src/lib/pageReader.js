import { registerPlugin } from '@capacitor/core'
import { canFetchCrossSite, recordTrace } from './http.js'

// Native plugin (android/.../PageReaderPlugin.java): loads a page in a hidden
// WebView, runs `fn` there, and returns what it stored in window.__cookingResult.
const PageReader = registerPlugin('PageReader')

/**
 * Runs `fn(args)` inside `url` in a real browser engine. `fn` must be
 * self-contained (no imports or outer variables): it is sent as source text.
 * Returns the stored result, or null on timeout.
 */
export async function runInPage(url, fn, args = {}, { timeoutMs = 25000, userAgent } = {}) {
  if (!canFetchCrossSite()) return null
  const script = `(${fn.toString()})(${JSON.stringify(args)})`
  const res = await PageReader.read({ url, script, timeoutMs, ...(userAgent ? { userAgent } : {}) })
  let value = null
  try {
    value = res?.value ? JSON.parse(JSON.parse(res.value)) : null
  } catch {
    value = null
  }
  recordTrace({
    method: 'PAGE',
    url: url.split('?')[0],
    finalUrl: res?.finalUrl?.split('?')[0],
    timedOut: !!res?.timedOut,
    snippet: value ? JSON.stringify(value).slice(0, 1500) : undefined,
  })
  return value
}

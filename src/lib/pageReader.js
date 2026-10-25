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
    // Each part's status and start, so one long body does not hide the rest
    snippet: value ? JSON.stringify(summarize(value)).slice(0, 4000) : undefined,
  })
  return value
}

function summarize(value) {
  if (!value || typeof value !== 'object') return value
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (v && typeof v === 'object' && 'body' in v) out[k] = { status: v.status, length: v.body?.length, body: String(v.body).slice(0, 400) }
    else if (Array.isArray(v)) out[k] = v.slice(0, 8).map((x) => (x && typeof x === 'object' && 'text' in x ? { ...x, text: String(x.text).slice(0, 120) } : x))
    else out[k] = v
  }
  return out
}

/** Opens a link outside the app (in Instagram, YouTube, the browser…). */
export async function openExternal(url) {
  if (canFetchCrossSite()) await PageReader.openExternal({ url })
  else window.open(url, '_blank', 'noopener')
}

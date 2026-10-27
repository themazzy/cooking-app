import { PageReader, canFetchCrossSite, recordTrace } from './http.js'

// Native plugin (android/.../PageReaderPlugin.java): loads a page in a hidden
// WebView, runs `fn` there, and returns what it stored in window.__cookingResult.

/**
 * Runs `fn(args)` inside `url` in a real browser engine. `fn` must be
 * self-contained (no imports or outer variables): it is sent as source text.
 * With `reinject`, `fn` runs again on every page the WebView lands on (a bot
 * check that reloads into the real page). Returns the stored result, or null on timeout.
 */
export async function runInPage(url, fn, args = {}, { timeoutMs = 25000, userAgent, reinject = false } = {}) {
  if (!canFetchCrossSite()) return null
  const script = `(${fn.toString()})(${JSON.stringify(args)})`
  const res = await PageReader.read({ url, script, timeoutMs, reinject, ...(userAgent ? { userAgent } : {}) })
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
    else if (typeof v === 'string' && v.length > 400) out[k] = `${v.slice(0, 400)}… (${v.length} chars)`
    else out[k] = v
  }
  return out
}

/** Opens a link outside the app (in Instagram, YouTube, the browser…). */
export async function openExternal(url) {
  if (canFetchCrossSite()) await PageReader.openExternal({ url })
  else window.open(url, '_blank', 'noopener')
}

/**
 * Opens a sign-in page in its own window on top of the app (no access to
 * the app itself). Resolves with true when `doneCookie` is set afterwards.
 */
export async function openLogin(url, { doneCookie, title } = {}) {
  if (!canFetchCrossSite()) return false
  const res = await PageReader.openLogin({ url, doneCookie, title })
  return !!res?.signedIn
}

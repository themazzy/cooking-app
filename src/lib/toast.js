// Short messages at the bottom of the screen ("Recipe saved"), shown by <Toaster />.
// Anything can call toast(); a loading toast stays until it is replaced or dismissed.

let listener = null
let nextId = 1

/**
 * Shows a message. kind is 'ok', 'error', 'info' or 'loading'.
 * Passing the id of an earlier toast replaces it (e.g. "Saving…" → "Saved").
 * Returns the toast's id.
 */
export function toast(text, { kind = 'ok', id = null, ms } = {}) {
  const t = { id: id ?? nextId++, text, kind, ms: ms ?? (kind === 'loading' ? 0 : kind === 'error' ? 5000 : 2200) }
  listener?.({ type: 'show', toast: t })
  return t.id
}

export function dismissToast(id) {
  listener?.({ type: 'hide', id })
}

/** Runs `fn` with a loading toast, then shows `done` (or the error). Returns fn's result. */
export async function withToast(fn, { loading, done, error = (e) => e?.message ?? String(e) }) {
  const id = loading ? toast(loading, { kind: 'loading' }) : null
  try {
    const result = await fn()
    if (done) toast(typeof done === 'function' ? done(result) : done, { id })
    else if (id) dismissToast(id)
    return result
  } catch (e) {
    toast(typeof error === 'function' ? error(e) : error, { kind: 'error', id })
    throw e
  }
}

// Background work (syncing) shows as a thin bar at the top while any key is on
const working = new Set()
export function setWorking(key, on) {
  if (on) working.add(key)
  else working.delete(key)
  listener?.({ type: 'working', on: working.size > 0 })
}

export function onToast(fn) {
  listener = fn
  return () => {
    if (listener === fn) listener = null
  }
}

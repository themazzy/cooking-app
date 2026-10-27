// Android's Back button: it first closes whatever is open on top (a sheet, a
// picker, cooking mode, a full screen video), and only then goes back a page
// or leaves the app. Sheets close the way a tap outside them does, so a sheet
// that is busy saving (its backdrop ignores taps) also ignores Back.

const LAYERS = '.sheet-backdrop, .cook, .player.full'

/** The open layer on top: the highest z-index, then the last one in the page. */
export function topLayer(doc = document) {
  let top = null
  let topZ = -Infinity
  for (const el of doc.querySelectorAll(LAYERS)) {
    const z = Number(getComputedStyle(el).zIndex) || 0
    if (z >= topZ) [top, topZ] = [el, z]
  }
  return top
}

/** Closes the top layer; false when nothing was open. */
export function closeTopLayer(doc = document) {
  const el = topLayer(doc)
  if (!el) return false
  // Cooking mode and the full screen player close on Escape
  if (el.matches('.sheet-backdrop')) el.click()
  else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  return true
}

/** Takes over Android's Back button. Returns a function that gives it back. */
export function handleBackButton(CapApp) {
  const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
    if (closeTopLayer()) return
    if (canGoBack) window.history.back()
    else CapApp.exitApp()
  })
  return () => sub.then((h) => h.remove())
}

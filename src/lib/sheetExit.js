/**
 * Sheets close with a short slide back down instead of vanishing.
 *
 * Every sheet in the app is a `.sheet-backdrop` that React simply removes when it
 * closes. Rather than give each of them a closing state, this watches the page for a
 * removed backdrop and puts a copy of it back for a moment, marked `.sheet-ghost`, so
 * CSS can play the exit. The copy ignores taps and removes itself when it is done.
 */

const EXIT_MS = 200 // a little shorter than the 260 ms the sheet takes to rise
const scrolled = new WeakMap() // a removed element reads scrollTop 0, so remember it while it is open

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function ghost(backdrop) {
  const copy = backdrop.cloneNode(true)
  copy.classList.add('sheet-ghost')
  copy.setAttribute('aria-hidden', 'true')
  copy.removeAttribute('id')
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  copy.inert = true
  document.body.appendChild(copy)

  // Show the sheet where it was scrolled to, not back at its top
  const from = backdrop.querySelectorAll('.sheet, .sheet *')
  const to = copy.querySelectorAll('.sheet, .sheet *')
  from.forEach((el, i) => {
    const top = scrolled.get(el)
    if (top && to[i]) to[i].scrollTop = top
  })

  const done = () => copy.remove()
  copy.addEventListener('animationend', (e) => e.target === copy && done())
  setTimeout(done, EXIT_MS + 150)
}

export function startSheetExits() {
  if (typeof MutationObserver === 'undefined') return

  document.addEventListener(
    'scroll',
    (e) => {
      const el = e.target
      if (el instanceof Element && el.closest('.sheet')) scrolled.set(el, el.scrollTop)
    },
    { capture: true, passive: true },
  )

  new MutationObserver((records) => {
    if (reducedMotion()) return
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType !== 1 || node.isConnected) continue
        const found = node.classList.contains('sheet-backdrop') ? [node] : node.getElementsByClassName('sheet-backdrop')
        for (const backdrop of found) {
          // A sheet opened inside another one leaves with it
          if (backdrop.classList.contains('sheet-ghost') || backdrop.parentElement?.closest('.sheet-backdrop')) continue
          ghost(backdrop)
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true })
}

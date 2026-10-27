// "Scroll down" / "scroll up" by voice: moves a scrolling box to the next
// piece of content instead of a fixed distance or all the way to the end.

const PAGE = 0.85 // a block taller than the box moves by this much of its height
const EDGE = 4 // px: a block this close to the edge counts as showing

/**
 * Where to scroll to. `blocks` are {top, bottom} in the box's content,
 * `view` is { top, height, max } (scrollTop, clientHeight, the largest
 * scrollTop). Down brings the first block that is cut off at the bottom to
 * the top; up brings the last block cut off at the top to the bottom.
 */
export function nextScroll(blocks, view, dir) {
  const { top, height, max } = view
  const bottom = top + height
  let to
  if (dir > 0) {
    const cut = blocks.filter((b) => b.bottom > bottom + EDGE).sort((a, b) => a.top - b.top)[0]
    to = cut ? cut.top : top + height * PAGE
    if (to <= top + EDGE) to = top + height * PAGE // taller than the box, or already at the top
  } else {
    const cut = blocks.filter((b) => b.top < top - EDGE).sort((a, b) => b.bottom - a.bottom)[0]
    to = cut ? cut.bottom - height : top - height * PAGE
    if (to >= top - EDGE) to = top - height * PAGE
  }
  return Math.round(Math.max(0, Math.min(max, to)))
}

// What counts as one piece of content
const BLOCKS = 'li, p, h1, h2, h3, .row, .card > *, .cook-count, .cook-step, button, textarea, img'

/** Scrolls `el` one piece of content down (dir 1) or up (-1). False when it is already at that end. */
export function scrollByBlock(el, dir) {
  if (!el) return false
  const max = el.scrollHeight - el.clientHeight
  if (max <= 1) return false
  const box = el.getBoundingClientRect()
  const blocks = [...el.querySelectorAll(BLOCKS)]
    .filter((b) => b.offsetParent !== null)
    .map((b) => {
      const r = b.getBoundingClientRect()
      return { top: r.top - box.top + el.scrollTop, bottom: r.bottom - box.top + el.scrollTop }
    })
  const to = nextScroll(blocks, { top: el.scrollTop, height: el.clientHeight, max }, dir)
  if (Math.abs(to - el.scrollTop) < 2) return false
  el.scrollTo({ top: to, behavior: 'smooth' })
  return true
}

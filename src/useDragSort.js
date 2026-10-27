import { useState } from 'react'

/**
 * Drag to reorder by a handle, with the finger or the mouse. While dragging
 * the item follows the pointer and a line shows where it will land; the list
 * itself only changes on release. The page scrolls when the pointer is near
 * the top or bottom of the screen.
 *
 * begin(event, { id, container, slots, onDrop }) from the handle's onPointerDown:
 * slots are [{ y, … }] with y measured from the container's top; onDrop gets
 * the slot nearest the pointer. Returns [drag, begin], drag = { id, dy, line } or null.
 */
export function useDragSort() {
  const [drag, setDrag] = useState(null)

  const begin = (e, { id, container, slots, onDrop }) => {
    if (e.button > 0 || !container || !slots.length) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture?.(e.pointerId)
    const top = () => container.getBoundingClientRect().top
    const y0 = e.clientY - top()
    const scroller = scrollParent(container)
    let y = e.clientY
    let best = null
    let frame = 0

    const update = () => {
      const at = y - top()
      best = slots.reduce((a, s) => (Math.abs(s.y - at) < Math.abs(a.y - at) ? s : a))
      setDrag({ id, dy: at - y0, line: best.y })
    }
    const autoScroll = () => {
      const view = scroller === window ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect()
      // Room for the sticky header and the save bar
      const up = view.top + 90 - y
      const down = y - (view.bottom - 110)
      const by = up > 0 ? -Math.min(up, 60) / 4 : down > 0 ? Math.min(down, 60) / 4 : 0
      if (by) {
        scroller.scrollBy(0, by)
        update()
      }
      frame = requestAnimationFrame(autoScroll)
    }
    const move = (ev) => {
      y = ev.clientY
      update()
    }
    const end = (ev) => {
      cancelAnimationFrame(frame)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      setDrag(null)
      if (ev.type === 'pointerup' && best) onDrop(best)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
    update()
    frame = requestAnimationFrame(autoScroll)
  }

  return [drag, begin]
}

/** An element's top or bottom edge, measured from the container's top. */
export const edgeIn = (container, el, edge) => {
  if (!el) return null
  const box = el.getBoundingClientRect()
  return (edge === 'bottom' ? box.bottom : box.top) - container.getBoundingClientRect().top
}

function scrollParent(el) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return window
}

import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * For a `.segmented` switch: measures the picked button (`.on`) and puts the pill
 * behind it through CSS variables, so the pill slides between options instead of
 * jumping. Without a picked button the switch keeps its plain look.
 */
export default function useSegmentPill() {
  const ref = useRef(null)

  const place = () => {
    const box = ref.current
    if (!box) return
    const on = box.querySelector(':scope > button.on')
    if (!on) {
      delete box.dataset.pill
      return
    }
    box.style.setProperty('--pill-x', `${on.offsetLeft}px`)
    box.style.setProperty('--pill-y', `${on.offsetTop}px`)
    box.style.setProperty('--pill-w', `${on.offsetWidth}px`)
    box.style.setProperty('--pill-h', `${on.offsetHeight}px`)
    box.dataset.pill = ''
  }

  // After every render, since the picked option may have changed. Font loading or a
  // resized screen moves the buttons too, so the switch is watched while it is shown.
  const watch = useRef(null)
  useLayoutEffect(() => {
    place()
    const box = ref.current
    if (watch.current?.box === box) return
    watch.current?.observer.disconnect()
    watch.current = null
    if (box && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => place())
      observer.observe(box)
      watch.current = { box, observer }
    }
  })
  useEffect(
    () => () => {
      watch.current?.observer.disconnect()
      watch.current = null
    },
    [],
  )

  return ref
}

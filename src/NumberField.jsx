import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

/** Up/down step for an amount in this unit. */
export const unitStep = (unit) => ({ g: 50, ml: 50, kg: 0.5, l: 0.5, cl: 5, dl: 1 })[unit] ?? 1

const decimals = (n) => (String(n).split('.')[1] ?? '').length

/** Next value for an up/down press: snaps to the step grid (18 → 20 with step 5), keeps a typed decimal comma. */
export function stepValue(value, dir, { step = 1, min, max } = {}) {
  const text = String(value ?? '').trim()
  const n = Number(text.replace(',', '.'))
  const start = text === '' || !Number.isFinite(n) ? 0 : n
  const eps = step / 1e6
  let next = dir > 0 ? Math.floor(start / step + eps) * step + step : Math.ceil(start / step - eps) * step - step
  if (min != null) next = Math.max(min, next)
  if (max != null) next = Math.min(max, next)
  const out = String(Number(next.toFixed(Math.max(decimals(step), 0))))
  return text.includes(',') ? out.replace('.', ',') : out
}

/**
 * A number box with up/down buttons on its right edge. Typing still works;
 * holding a button repeats. onChange gets the new text, as typed or stepped.
 */
export default function NumberField({ value, onChange, step = 1, min, max, className = '', inputRef, label, ...input }) {
  const timer = useRef(null)
  const latest = useRef(value)
  latest.current = value
  const stop = () => {
    clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => stop, [])

  const bump = (dir) => {
    const next = stepValue(latest.current, dir, { step, min, max })
    if (next === String(latest.current ?? '')) return false
    latest.current = next
    onChange(next)
    return true
  }
  const press = (dir) => (e) => {
    e.preventDefault() // keeps the keyboard as it is
    stop()
    if (!bump(dir)) return
    const repeat = (delay) => {
      timer.current = setTimeout(() => {
        if (bump(dir)) repeat(Math.max(60, delay * 0.8))
      }, delay)
    }
    repeat(400)
    window.addEventListener('pointerup', stop, { once: true })
  }
  const keys = (dir) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      bump(dir)
    }
  }
  const atMin = min != null && value !== '' && value != null && Number(String(value).replace(',', '.')) <= min
  const atMax = max != null && Number(String(value).replace(',', '.')) >= max

  return (
    <div className={`num-field ${className}`}>
      <input ref={inputRef} inputMode="decimal" {...input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      <span className="num-steps">
        {[
          [1, 'up', 'More', atMax],
          [-1, 'down', 'Less', atMin],
        ].map(([dir, icon, word, off]) => (
          <button
            key={icon}
            type="button"
            tabIndex={-1}
            aria-label={label ? `${word} ${label}` : word}
            disabled={off}
            onPointerDown={press(dir)}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={keys(dir)}
          >
            <Icon name={icon} size={16} strokeWidth={2.5} />
          </button>
        ))}
      </span>
    </div>
  )
}

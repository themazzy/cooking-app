import { Children, isValidElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

const textOf = (node) =>
  Children.toArray(node)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? c : ''))
    .join('')

/** The <option>s among the children (also inside arrays and fragments). */
function optionsOf(children) {
  const out = []
  const walk = (nodes) =>
    Children.forEach(nodes, (c) => {
      if (!isValidElement(c)) return
      if (c.type === 'option') {
        const label = textOf(c.props.children)
        out.push({ value: c.props.value ?? label, label, disabled: !!c.props.disabled })
      } else walk(c.props.children)
    })
  walk(children)
  return out
}

/**
 * A drop-down in the app's own style, used like <select>: same value,
 * onChange(e) with e.target.value, and <option> children. Android's own
 * picker can't be styled, so this opens a bottom sheet instead.
 */
export default function Select({ value, onChange, children, className = '', disabled = false, 'aria-label': ariaLabel, title }) {
  const [open, setOpen] = useState(false)
  const options = optionsOf(children)
  const current = options.find((o) => String(o.value) === String(value ?? ''))
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' })
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pick = (o) => {
    setOpen(false)
    if (String(o.value) !== String(value ?? '')) onChange?.({ target: { value: o.value } })
  }

  return (
    <>
      <button type="button" className={`select ${className}`} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} title={title} onClick={() => setOpen(true)}>
        <span className="select-value">{current?.label ?? ''}</span>
        <Icon name="down" size={18} className="select-caret" />
      </button>
      {open &&
        createPortal(
          <div className="sheet-backdrop select-backdrop" onClick={() => setOpen(false)}>
            <div className="sheet select-sheet" role="dialog" aria-label={ariaLabel} onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" aria-hidden="true" />
              {ariaLabel && <h2 className="select-title">{ariaLabel}</h2>}
              <ul className="select-options" role="listbox" ref={listRef}>
                {options.map((o) => {
                  const on = o === current
                  return (
                    <li key={String(o.value)} role="option" aria-selected={on}>
                      <button type="button" className={on ? 'on' : ''} disabled={o.disabled} onClick={() => pick(o)}>
                        <span>{o.label}</span>
                        {on && <Icon name="check" size={18} strokeWidth={2.5} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

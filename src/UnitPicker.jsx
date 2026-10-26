import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BASE, canonicalUnit, formatAmount, parseAmount } from './lib/scale.js'
import Icon from './Icon.jsx'

// Choosing a unit by tapping instead of typing: a short row of the units
// that suit the ingredient, and a sheet with all of them by kind.

export const UNIT_GROUPS = [
  ['Weight', ['g', 'kg', 'oz', 'lb']],
  ['Volume', ['ml', 'dl', 'l', 'tsp', 'tbsp', 'cup']],
  ['Pieces', ['pcs', 'clove', 'slice', 'head', 'bunch', 'pack', 'can']],
  ['A little', ['pinch', 'handful']],
]

// Units that go with each other: the row offers the ones next to the usual unit
const FAMILY = {
  g: ['g', 'kg', 'pcs', 'pack'],
  kg: ['kg', 'g', 'pcs', 'pack'],
  ml: ['ml', 'l', 'pcs', 'pack'],
  l: ['l', 'ml', 'pcs', 'pack'],
  pcs: ['pcs', 'pack', 'g', 'kg'],
}

/** The units offered in the row for an ingredient usually counted in `usual`, with `value` among them (in front when it is another one). */
export function suggestedUnits(usual, value) {
  const list = FAMILY[usual] ?? [usual, 'pcs', 'g', 'pack']
  return value && !list.includes(value) ? [value, ...list] : list
}

/**
 * An amount in another unit of the same kind, "500" g → "0,5" kg, or the
 * amount as it is when the two don't convert (g and pcs).
 */
export function convertQty(qty, from, to) {
  const a = parseAmount(qty)
  const f = BASE[canonicalUnit(from)]
  const t = BASE[canonicalUnit(to)]
  if (!a || a.max != null || !f || !t || f[0] !== t[0]) return qty
  return formatAmount((a.min * f[1]) / t[1], to)
}

/** The unit as shown on a chip: pieces without a unit in a recipe read "pcs". */
const label = (u) => (u === '' ? 'pcs' : u)

/**
 * Every unit by kind in a bottom sheet. `recipe` units write pieces as no unit
 * (that is how recipes keep them) and allow typing any other unit.
 */
export function UnitSheet({ title = 'Unit', value, recipe = false, onPick, onClose }) {
  const canon = canonicalUnit(value)
  const known = canon != null && UNIT_GROUPS.some(([, us]) => us.includes(canon || 'pcs'))
  const [own, setOwn] = useState(known ? '' : value)
  const current = known ? canon || 'pcs' : null
  const pick = (u) => onPick(recipe && u === 'pcs' ? '' : u)

  return createPortal(
    <div className="sheet-backdrop select-backdrop" onClick={onClose}>
      <div className="sheet unit-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="select-title">{title}</h2>
        {UNIT_GROUPS.map(([kind, units]) => (
          <section key={kind}>
            <h3>{kind}</h3>
            <div className="unit-grid">
              {units.map((u) => (
                <button key={u} type="button" className={`chip-btn${current === u ? ' on' : ''}`} onClick={() => pick(u)}>
                  {current === u && <Icon name="check" size={14} strokeWidth={3} />}
                  {u}
                </button>
              ))}
            </div>
          </section>
        ))}
        {recipe && (
          <form
            className="unit-own"
            onSubmit={(e) => {
              e.preventDefault()
              onPick(own.trim())
            }}
          >
            <input aria-label="Other unit" placeholder="Other unit, e.g. jar" value={own} onChange={(e) => setOwn(e.target.value)} />
            <button type="submit" className="secondary" disabled={!own.trim()}>
              Use
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** A row of unit chips: the likely units, and "More" for the rest. */
export function UnitChips({ value, usual, onChange, title }) {
  const [open, setOpen] = useState(false)
  const units = suggestedUnits(usual, value)
  return (
    <div className="unit-chips" role="radiogroup" aria-label={title}>
      {units.map((u) => (
        <button key={u} type="button" role="radio" aria-checked={u === value} className={`chip-btn soft${u === value ? ' on' : ''}`} onClick={() => onChange(u)}>
          {label(u)}
        </button>
      ))}
      <button type="button" className="chip-btn add" onClick={() => setOpen(true)}>
        More <Icon name="down" size={14} />
      </button>
      {open && (
        <UnitSheet
          title={title}
          value={value}
          onPick={(u) => {
            setOpen(false)
            onChange(u)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

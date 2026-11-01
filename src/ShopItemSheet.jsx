import { useEffect, useRef, useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import NumberField, { unitStep } from './NumberField.jsx'
import { UnitChips, convertQty } from './UnitPicker.jsx'
import { defaultUnit } from './lib/defaultUnit.js'
import { packFor } from './lib/packs.js'
import { convertIngredient } from './lib/units.js'

const amountText = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')
// Recipes keep pieces as no unit; the chips call them pcs
const toChip = (unit) => (String(unit ?? '').trim() ? unit : 'pcs')
const fromChip = (unit) => (unit === 'pcs' ? '' : unit)

/**
 * One shopping list item: how much to buy (and its name, for things added
 * by hand), what each recipe needs of it, and removing it from the list.
 */
export default function ShopItemSheet({ item, many, units, packs, onSave, onDelete, onClose }) {
  const { match } = useCatalog()
  const entry = match(item.name)
  const own = String(item.key).startsWith('extra-')
  const staple = String(item.key).startsWith('stock-')
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.qty ?? '')
  const [unit, setUnit] = useState(toChip(item.unit || (own && !item.qty ? defaultUnit(entry ?? { name: item.name, aisle: item.aisle ?? 'Other' }) : '')))
  const qtyRef = useRef(null)
  useEffect(() => {
    if (own) qtyRef.current?.focus()
  }, [own])
  const pack = packFor(item.name, entry, { own: packs })
  const save = () => onSave({ name: name.trim() || item.name, qty: String(qty ?? '').trim(), unit: String(qty ?? '').trim() ? fromChip(unit) : '' })
  const usual = defaultUnit(entry ?? { name: item.name, aisle: item.aisle ?? 'Other' })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="item-head">
          <IngredientIcon entry={entry ?? { name: item.name }} size={48} />
          <div>
            <h2>{item.name}</h2>
            <span className="note">{staple ? 'Staple running low at home' : own ? 'Added by hand' : `For ${(item.from ?? []).join(', ')}`}</span>
          </div>
        </div>
        {own && (
          <>
            <label className="field" htmlFor="shop-item-name">
              Name
            </label>
            <input id="shop-item-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </>
        )}
        <label className="field">How much to buy</label>
        <div className="amount-row">
          <NumberField
            inputRef={qtyRef}
            step={unitStep(unit)}
            min={0}
            label="amount"
            placeholder="Some"
            aria-label="Amount"
            value={qty}
            onChange={setQty}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
        <UnitChips
          title="Unit"
          value={unit}
          usual={usual}
          onChange={(u) => {
            setQty((q) => convertQty(q, fromChip(unit), fromChip(u)))
            setUnit(u)
          }}
        />
        {pack && (
          <div className="quick">
            <button
              className="chip-btn"
              onClick={() => {
                const [q, u = ''] = pack.split(/\s+/)
                setQty(q)
                setUnit(toChip(u === 'pcs' ? '' : u))
              }}
            >
              One pack: {pack}
            </button>
          </div>
        )}
        {item.own && (
          <p className="hint">
            The recipes ask for {amountText(convertIngredient(item.own.was, units, match)) || 'some'}.{' '}
            <button
              className="link"
              onClick={() => {
                setQty(item.own.was.qty)
                setUnit(toChip(item.own.was.unit))
              }}
            >
              Use that
            </button>
          </p>
        )}
        {item.extra?.length > 0 && <p className="hint">Also: {item.extra.join(', ')}</p>}
        {item.uses?.length > 0 && (
          <ul className="uses-list">
            {item.uses.map((u, k) => (
              <li key={k}>
                <span className="uses-for">{[many || !u.group ? u.recipe : null, u.group].filter(Boolean).join(' · ')}</span>
                <span>
                  <strong>{amountText(convertIngredient(u, units, match)) || 'some'}</strong> {u.name}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="sheet-actions">
          <button className="secondary" onClick={onDelete}>
            Remove
          </button>
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

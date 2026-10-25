import { Fragment, useEffect, useRef, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { addToPantry, removeFromPantry, updatePantryItem } from './lib/pantry.js'
import { daysLeft, expiryLabel, isOut, shortfall } from './lib/stock.js'
import { STOCK_UNITS, defaultUnit, joinAmount, splitAmount } from './lib/defaultUnit.js'

const SOON = 3 // days
const QUICK = { g: ['100', '250', '500', '1000'], kg: ['1', '2', '5'], ml: ['250', '500', '1000'], l: ['1', '2'], pcs: ['1', '2', '6', '10'] }

/** Amount, unit, minimum and use-by date of one stock item, new or already at home. */
function ItemSheet({ item, entry, onSave, onRemove, onClose, message }) {
  const [initialQty, initialUnit] = splitAmount(item.amount)
  const unitDefault = defaultUnit(entry ?? { name: item.name, aisle: 'Other' })
  const [qty, setQty] = useState(initialQty)
  const [unit, setUnit] = useState(initialUnit || unitDefault)
  const [minQty, setMinQty] = useState(splitAmount(item.min_amount)[0])
  const [minUnit, setMinUnit] = useState(splitAmount(item.min_amount)[1] || initialUnit || unitDefault)
  const [expires, setExpires] = useState(item.expires_on ?? '')
  const [more, setMore] = useState(!!(item.min_amount || item.expires_on))
  const qtyRef = useRef(null)
  useEffect(() => {
    qtyRef.current?.focus()
  }, [])
  const unitSelect = (value, set, label) => (
    <select aria-label={label} value={value} onChange={(e) => set(e.target.value)}>
      {(STOCK_UNITS.includes(value) ? STOCK_UNITS : [value, ...STOCK_UNITS]).map((u) => (
        <option key={u}>{u}</option>
      ))}
    </select>
  )
  const save = () => onSave({ amount: joinAmount(qty, unit), min_amount: joinAmount(minQty, minUnit), expires_on: expires || null })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="item-head">
          <IngredientIcon entry={entry ?? { name: item.name }} size={56} />
          <div>
            <h2>{item.name}</h2>
            <span className="note">{item.id ? 'At home' : 'Add to what you have at home'}</span>
          </div>
        </div>
        <label className="field">How much is at home</label>
        <div className="amount-row">
          <input
            ref={qtyRef}
            inputMode="decimal"
            placeholder="Amount"
            aria-label="Amount"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          {unitSelect(unit, setUnit, 'Unit')}
        </div>
        {QUICK[unit] && (
          <div className="quick">
            {QUICK[unit].map((q) => (
              <button key={q} className={`chip-btn${qty === q ? ' on' : ''}`} onClick={() => setQty(q)}>
                {q} {unit === 'pcs' ? '' : unit}
              </button>
            ))}
          </div>
        )}
        <p className="hint">Leave the amount empty if you just have some.</p>
        {more ? (
          <>
            <label className="field">Always keep at least (staple)</label>
            <div className="amount-row">
              <input inputMode="decimal" placeholder="Not a staple" aria-label="Minimum amount" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
              {unitSelect(minUnit, setMinUnit, 'Minimum unit')}
            </div>
            <label className="field">Use by</label>
            <div className="amount-row">
              <input type="date" aria-label="Use by" value={expires} onChange={(e) => setExpires(e.target.value)} />
              {expires && (
                <button className="link" onClick={() => setExpires('')}>
                  Clear
                </button>
              )}
            </div>
          </>
        ) : (
          <button className="link more" onClick={() => setMore(true)}>
            + Minimum to keep, use-by date
          </button>
        )}
        {message && <p className="hint error">{message}</p>}
        <div className="sheet-actions">
          {item.id && (
            <button className="secondary" onClick={onRemove}>
              Remove
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            {item.id ? 'Cancel' : 'Back'}
          </button>
          <button onClick={save}>{item.id ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}

/** Picking ingredients to add: search, aisles, and a grid of pictures. */
function Picker({ items, onPick, onClose, added }) {
  const { entries, match } = useCatalog()
  const [query, setQuery] = useState('')
  const [aisle, setAisle] = useState(null)
  // Exactly this ingredient, not just the same kind (cream, not clotted cream)
  const key = (name) => (match(name)?.name ?? name).toLowerCase()
  const have = new Set(items.map((i) => key(i.name)))
  const q = query.trim().toLowerCase()
  const matches = (e) => !q || e.name.toLowerCase().includes(q) || e.aliases?.some((a) => a.includes(q))
  const shown = entries
    .filter((e) => matches(e) && (q || !aisle || e.aisle === aisle))
    .sort((a, b) => (q ? (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) : 0) || (q ? 0 : AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle)) || a.name.localeCompare(b.name))
  const exact = entries.some((e) => e.name.toLowerCase() === q)
  const aisles = AISLES.filter((a) => entries.some((e) => e.aisle === a))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-label="Add ingredients" onClick={(e) => e.stopPropagation()}>
        <div className="picker-top">
          <input className="search" type="search" placeholder="Search ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="link" onClick={onClose}>
            Done
          </button>
        </div>
        {!q && (
          <div className="aisle-chips">
            <button className={`chip-btn${aisle == null ? ' on' : ''}`} onClick={() => setAisle(null)}>
              All
            </button>
            {aisles.map((a) => (
              <button key={a} className={`chip-btn${aisle === a ? ' on' : ''}`} onClick={() => setAisle(a)}>
                {a}
              </button>
            ))}
          </div>
        )}
        {added && <p className="hint added">✓ {added}</p>}
        <div className="grid">
          {q && !exact && (
            <button className="tile custom" onClick={() => onPick({ name: query.trim() }, null)}>
              <span className="tile-plus" aria-hidden="true">
                +
              </span>
              <span className="tile-name">Add “{query.trim()}”</span>
            </button>
          )}
          {shown.map((e, n) => (
            <Fragment key={e.id ?? e.name}>
              {!q && !aisle && e.aisle !== shown[n - 1]?.aisle && <div className="grid-title">{e.aisle}</div>}
              <button className={`tile${have.has(key(e.name)) ? ' have' : ''}`} onClick={() => onPick({ name: e.name }, e)}>
                <IngredientIcon entry={e} size={48} />
                <span className="tile-name">{e.name}</span>
                {have.has(key(e.name)) && (
                  <span className="tile-check" aria-label="at home">
                    ✓
                  </span>
                )}
              </button>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The household's stock: amounts, staples to keep (with a minimum) and use-by dates. */
export default function PantryPage({ items, onChanged }) {
  const { match } = useCatalog()
  const [message, setMessage] = useState(null)
  const [query, setQuery] = useState('')
  const [picking, setPicking] = useState(false)
  const [added, setAdded] = useState(null)
  const [editing, setEditing] = useState(null) // { item, entry }

  const run = async (fn) => {
    setMessage(null)
    try {
      await fn()
      await onChanged()
      return true
    } catch (e) {
      setMessage(e?.message ?? String(e))
      return false
    }
  }

  const open = (item, entry) => {
    setMessage(null)
    // An ingredient already at home opens its item
    const key = (name) => (match(name)?.name ?? name).toLowerCase()
    const existing = items.find((i) => key(i.name) === key(item.name))
    setEditing({ item: existing ?? item, entry: entry ?? match(item.name) })
  }
  const save = async (patch) => {
    const { item } = editing
    const ok = await run(() => (item.id ? updatePantryItem(item.id, patch) : addToPantry(item.name, patch.amount, { min_amount: patch.min_amount, expires_on: patch.expires_on })))
    if (!ok) return
    setEditing(null)
    if (picking) setAdded(`${item.name}${patch.amount ? `, ${patch.amount}` : ''}`)
  }

  const aisleOf = (i) => match(i.name)?.aisle ?? 'Other'
  const days = (i) => daysLeft(i.expires_on)
  const q = query.trim().toLowerCase()
  const shown = items.filter((i) => !q || i.name.toLowerCase().includes(q))
  // Use soon first, then staples running low, then everything by aisle
  const section = (i) => {
    const d = days(i)
    if (d != null && d <= SOON && !isOut(i)) return 'Use soon'
    if (shortfall(i)) return 'Running low'
    if (isOut(i)) return 'Used up'
    return aisleOf(i)
  }
  const ORDER = ['Use soon', 'Running low', ...AISLES, 'Used up']
  const sorted = [...shown].sort(
    (a, b) =>
      ORDER.indexOf(section(a)) - ORDER.indexOf(section(b)) || (section(a) === 'Use soon' ? days(a) - days(b) : 0) || a.name.localeCompare(b.name),
  )
  const staples = items.filter((i) => i.min_amount?.trim()).length
  const low = items.filter((i) => shortfall(i)).length

  return (
    <>
      <header className="main-header">
        <h1>At home</h1>
        <button className="small" onClick={() => (setAdded(null), setPicking(true))}>
          + Add
        </button>
      </header>
      <p className="hint top">
        {items.length} item{items.length === 1 ? '' : 's'}
        {staples ? ` · ${staples} staple${staples === 1 ? '' : 's'}` : ''}
        {low ? ` · ${low} running low, on the shopping list` : ''}
      </p>
      {message && !editing && <p className="hint error">{message}</p>}
      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon" aria-hidden="true">
            🏠
          </div>
          <p>Nothing here yet.</p>
          <p className="hint">Add what is in your fridge and cupboards. Give staples a minimum to keep, and they go on the shopping list when they run low.</p>
          <button onClick={() => setPicking(true)}>Add ingredients</button>
        </div>
      ) : (
        <section className="card">
          {items.length > 8 && <input className="search" type="search" placeholder="Search what you have" value={query} onChange={(e) => setQuery(e.target.value)} />}
          <ul className="catalog stock">
            {sorted.map((i, n) => {
              const d = days(i)
              const short = shortfall(i)
              const out = isOut(i)
              return (
                <Fragment key={i.id}>
                  {(n === 0 || section(i) !== section(sorted[n - 1])) && (
                    <li className={`aisle${['Use soon', 'Running low'].includes(section(i)) ? ' alert' : ''}`}>{section(i)}</li>
                  )}
                  <li className={`editable${out ? ' out' : ''}`} onClick={() => open(i)}>
                    <IngredientIcon entry={match(i.name) ?? { name: i.name }} size={36} />
                    <span className="grow">
                      {i.name}
                      <span className="from">
                        {[
                          d != null ? (
                            <span key="e" className={d <= SOON ? 'warn' : ''}>
                              {expiryLabel(d)}
                            </span>
                          ) : null,
                          i.min_amount?.trim() ? <span key="m">keep {i.min_amount}</span> : null,
                          short ? (
                            <span key="s" className="warn">
                              buy {short.need}
                            </span>
                          ) : null,
                        ]
                          .filter(Boolean)
                          .flatMap((x, k) => (k ? [' · ', x] : [x]))}
                      </span>
                    </span>
                    <span className="stock-amount">{out ? 'used up' : i.amount || '✓'}</span>
                  </li>
                </Fragment>
              )
            })}
          </ul>
        </section>
      )}

      {picking && !editing && <Picker items={items} added={added} onPick={open} onClose={() => setPicking(false)} />}
      {editing && (
        <ItemSheet
          key={editing.item.id ?? editing.item.name}
          item={editing.item}
          entry={editing.entry}
          message={message}
          onSave={save}
          onRemove={async () => {
            if (await run(() => removeFromPantry(editing.item.id))) setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

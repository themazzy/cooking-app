import { Fragment, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { addToPantry, removeFromPantry, updatePantryItem } from './lib/pantry.js'
import { daysLeft, expiryLabel, isOut, shortfall } from './lib/stock.js'

const EMPTY = { name: '', amount: '', min_amount: '', expires_on: '' }
const SOON = 3 // days

/** The household's stock: amounts, staples to keep (with a minimum) and expiry dates. */
export default function PantryPage({ items, onChanged }) {
  const { entries, match } = useCatalog()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null) // the item in the edit sheet

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
  const add = () =>
    run(async () => {
      if (!name.trim()) return
      // Use the catalog's spelling when the name matches an ingredient
      await addToPantry(match(name)?.name ?? name, amount)
      setName('')
      setAmount('')
    })
  const save = async () => {
    const patch = { amount: form.amount.trim(), min_amount: form.min_amount.trim(), expires_on: form.expires_on || null }
    const ok = await run(() =>
      form.id ? updatePantryItem(form.id, { name: form.name.trim(), ...patch }) : addToPantry(match(form.name)?.name ?? form.name, patch.amount, patch),
    )
    if (ok) setForm(null)
  }

  const aisleOf = (i) => match(i.name)?.aisle ?? 'Other'
  const days = (i) => daysLeft(i.expires_on)
  const q = query.trim().toLowerCase()
  const shown = items.filter((i) => !q || i.name.toLowerCase().includes(q))
  // Expiring soon first, then staples running low, then everything by aisle
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
      ORDER.indexOf(section(a)) - ORDER.indexOf(section(b)) ||
      (section(a) === 'Use soon' ? days(a) - days(b) : 0) ||
      a.name.localeCompare(b.name),
  )
  const staples = items.filter((i) => i.min_amount?.trim()).length
  const low = items.filter((i) => shortfall(i)).length

  return (
    <>
      <header className="main-header">
        <h1>At home</h1>
        <button className="small" onClick={() => setForm({ ...EMPTY })}>
          + Add
        </button>
      </header>
      <p className="hint top">
        {items.length} item{items.length === 1 ? '' : 's'}
        {staples ? ` · ${staples} staple${staples === 1 ? '' : 's'}` : ''}
        {low ? ` · ${low} running low, on the shopping list` : ''}
      </p>
      <section className="card">
        <div className="row add-row">
          <input
            className="search grow"
            list="catalog-names"
            placeholder="Ingredient"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            className="search amount"
            placeholder="1 kg"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={!name.trim()}>
            Add
          </button>
        </div>
        <datalist id="catalog-names">
          {entries.map((e) => (
            <option key={e.id ?? e.name} value={e.name} />
          ))}
        </datalist>
        {message && !form && <p className="hint error">{message}</p>}
        {items.length > 8 && (
          <input className="search stock-search" type="search" placeholder="Search what you have" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        <ul className="catalog stock">
          {sorted.map((i, n) => {
            const d = days(i)
            const short = shortfall(i)
            const out = isOut(i)
            return (
              <Fragment key={i.id}>
                {(n === 0 || section(i) !== section(sorted[n - 1])) && <li className={`aisle${['Use soon', 'Running low'].includes(section(i)) ? ' alert' : ''}`}>{section(i)}</li>}
                <li className={`editable${out ? ' out' : ''}`} onClick={() => setForm({ ...EMPTY, ...i, min_amount: i.min_amount ?? '', expires_on: i.expires_on ?? '' })}>
                  <IngredientIcon entry={match(i.name) ?? { name: i.name }} size={36} />
                  <span className="grow">
                    {i.name}
                    <span className="from">
                      {[
                        d != null ? <span key="e" className={d <= SOON ? 'warn' : ''}>{expiryLabel(d)}</span> : null,
                        i.min_amount?.trim() ? <span key="m">keep {i.min_amount}</span> : null,
                        short ? <span key="s" className="warn">buy {short.need}</span> : null,
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
        {items.length === 0 && (
          <p className="hint">
            Nothing here yet. Add what is in your fridge and cupboards. Give staples a minimum to keep, and they go on the shopping list when they run low.
          </p>
        )}
      </section>

      {form && (
        <div className="sheet-backdrop" onClick={() => setForm(null)}>
          <div className="sheet" role="dialog" aria-label="Stock item" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <h2>{form.id ? form.name : 'Add to stock'}</h2>
            <div className="account">
              {!form.id && <input list="catalog-names" placeholder="Ingredient" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
              <label className="field">
                How much is at home
                <input placeholder="e.g. 1 kg, 750 ml, 6 (empty: some)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </label>
              <label className="field">
                Always keep at least
                <input placeholder="e.g. 2 l (empty: not a staple)" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
              </label>
              <label className="field">
                Use by
                <span className="row tight">
                  <input type="date" className="grow" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
                  {form.expires_on && (
                    <button className="link" onClick={() => setForm({ ...form, expires_on: '' })}>
                      Clear
                    </button>
                  )}
                </span>
              </label>
              <p className="hint">
                Cooking a recipe takes its amounts out of stock. Staples below their minimum go on the shopping list by themselves.
              </p>
              {message && <p className="hint error">{message}</p>}
              <div className="sheet-actions">
                {form.id && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      if (await run(() => removeFromPantry(form.id))) setForm(null)
                    }}
                  >
                    Remove
                  </button>
                )}
                <button className="secondary" onClick={() => setForm(null)}>
                  Cancel
                </button>
                <button disabled={!form.name.trim()} onClick={save}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { Fragment, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { addToPantry, removeFromPantry, updatePantryItem } from './lib/pantry.js'

/** Ingredients the household has at home. */
export default function PantryPage({ items, onChanged }) {
  const { entries, match } = useCatalog()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState(null)

  const run = async (fn) => {
    setMessage(null)
    try {
      await fn()
      await onChanged()
    } catch (e) {
      setMessage(e?.message ?? String(e))
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

  const aisleOf = (i) => match(i.name)?.aisle ?? 'Other'
  const sorted = [...items].sort((a, b) => AISLES.indexOf(aisleOf(a)) - AISLES.indexOf(aisleOf(b)) || a.name.localeCompare(b.name))

  return (
    <>
      <header className="main-header">
        <h1>At home</h1>
        <span className="note">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </header>
      <section className="card">
        <p className="hint top">What you already have. Shopping lists mark these, so you don't buy them twice.</p>
        <div className="row">
          <input
            className="search grow"
            list="catalog-names"
            placeholder="Add an ingredient"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            className="search amount"
            placeholder="Amount"
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
        {message && <p className="hint error">{message}</p>}
        <ul className="catalog">
          {sorted.map((i, n) => (
            <Fragment key={i.id}>
              {aisleOf(i) !== aisleOf(sorted[n - 1] ?? { name: '' }) || n === 0 ? <li className="aisle">{aisleOf(i)}</li> : null}
              <li>
                <IngredientIcon entry={match(i.name) ?? { name: i.name }} size={32} />
                <span className="grow">{i.name}</span>
                <input
                  className="pantry-amount"
                  aria-label={`Amount of ${i.name}`}
                  defaultValue={i.amount}
                  placeholder="amount"
                  onBlur={(e) => e.target.value !== i.amount && run(() => updatePantryItem(i.id, { amount: e.target.value }))}
                />
                <button className="icon" aria-label={`Remove ${i.name}`} onClick={() => run(() => removeFromPantry(i.id))}>
                  ×
                </button>
              </li>
            </Fragment>
          ))}
        </ul>
        {items.length === 0 && (
          <p className="hint">Nothing here yet. Add what is in your fridge and cupboards, or tick items on the shopping list and put them at home.</p>
        )}
      </section>
    </>
  )
}

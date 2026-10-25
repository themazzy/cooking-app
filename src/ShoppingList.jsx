import { Fragment, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'

const amountText = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')

/** The current shopping list by aisle: tick items off while shopping, add extras, copy it as text. */
export default function ShoppingList({ list, pantry = [], onChange, onNew, onToPantry }) {
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)
  const { match, canonical } = useCatalog()
  if (!list) {
    return (
      <section className="card">
        <h2>Shopping list</h2>
        <p className="hint">No list yet. Pick recipes on the saved recipes page and make one.</p>
        <button onClick={onNew}>Pick recipes</button>
      </section>
    )
  }
  const atHome = new Set(pantry.map((p) => canonical(p.name)))
  const isAtHome = (i) => atHome.has(canonical(i.name))
  const aisleOf = (i) => i.aisle ?? match(i.name)?.aisle ?? 'Other'
  // To buy by aisle, then what is probably at home, then the basket
  const rank = (i) => (i.checked ? 2000 : isAtHome(i) ? 1000 : 0) + Math.max(0, AISLES.indexOf(aisleOf(i)))
  const items = [...list.items].sort((a, b) => rank(a) - rank(b))
  const toggle = (key) => onChange({ ...list, items: list.items.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i)) })
  const add = () => {
    const text = extra.trim()
    if (!text) return
    const entry = match(text)
    onChange({
      ...list,
      items: [...list.items, { key: `extra-${Date.now()}`, name: text, aisle: entry?.aisle ?? 'Other', qty: '', unit: '', extra: [], from: [], checked: false }],
    })
    setExtra('')
  }
  const copy = async () => {
    const lines = items
      .filter((i) => !i.checked)
      .map((i) => `• ${[amountText(i), i.name].filter(Boolean).join(' ')}${i.extra.length ? ` (+ ${i.extra.join(', ')})` : ''}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="card">
      <h2>Shopping list</h2>
      <p className="note">
        For: {list.recipes.map((r) => `${r.title} (${r.servings ? `${r.portions} portions` : `×${r.portions}`})`).join(', ')}
      </p>
      <ul className="shopping">
        {items.map((i, n) => {
          const prev = items[n - 1]
          const heading = i.checked
            ? prev?.checked
              ? null
              : 'In the basket'
            : isAtHome(i)
              ? prev && isAtHome(prev) && !prev.checked
                ? null
                : 'Probably at home'
              : !prev || aisleOf(i) !== aisleOf(prev)
                ? aisleOf(i)
                : null
          return (
            <Fragment key={i.key}>
              {heading && <li className="aisle">{heading}</li>}
              <li className={i.checked ? 'checked' : ''}>
                <label>
                  <input type="checkbox" checked={!!i.checked} onChange={() => toggle(i.key)} />
                  <IngredientIcon entry={match(i.name)} />
                  <span>
                    {amountText(i) && <strong>{amountText(i)} </strong>}
                    {i.name}
                    {isAtHome(i) && !i.checked && <span className="badge">at home</span>}
                    {i.extra.length > 0 && <span className="note"> + {i.extra.join(', ')}</span>}
                    {list.recipes.length > 1 && i.from.length > 0 && <span className="from">{i.from.join(', ')}</span>}
                  </span>
                </label>
              </li>
            </Fragment>
          )
        })}
      </ul>
      <div className="row">
        <input className="search grow" placeholder="Add something else" value={extra} onChange={(e) => setExtra(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="secondary" onClick={add} disabled={!extra.trim()}>
          Add
        </button>
      </div>
      <div className="row">
        <button onClick={copy}>{copied ? 'Copied' : 'Copy list'}</button>
        <button className="secondary" onClick={() => onChange({ ...list, items: list.items.filter((i) => !i.checked) })}>
          Remove ticked
        </button>
        {onToPantry && list.items.some((i) => i.checked) && (
          <button
            className="secondary"
            onClick={async () => {
              await onToPantry(list.items.filter((i) => i.checked))
              onChange({ ...list, items: list.items.filter((i) => !i.checked) })
            }}
          >
            Put ticked at home
          </button>
        )}
        <button className="secondary" onClick={onNew}>
          New list
        </button>
      </div>
    </section>
  )
}

import { Fragment, useState } from 'react'
import { aisleOrder, isDefaultOrder, moveAisle } from './lib/aisles.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { ebagQuery, ebagUrl } from './lib/ebag.js'
import { openExternal } from './lib/pageReader.js'
import { isOut } from './lib/stock.js'
import { pantryError } from './lib/pantry.js'
import { convertIngredient } from './lib/units.js'
import Icon from './Icon.jsx'

const amountText = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')

/** Putting the shop's sections in the order you walk past them; both phones share it. */
function AisleSheet({ order, inUse, onChange, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Order of the shop" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Order of the shop</h2>
        <p className="hint">Move the sections into the order you walk through your shop. The list follows it on both phones.</p>
        <ol className="aisle-order">
          {order.map((a, n) => (
            <li key={a} className={inUse.has(a) ? '' : 'unused'}>
              <span className="grow">{a}</span>
              <button className="icon" aria-label={`Move ${a} up`} disabled={n === 0} onClick={() => onChange(moveAisle(order, n, -1))}>
                <Icon name="up" />
              </button>
              <button className="icon" aria-label={`Move ${a} down`} disabled={n === order.length - 1} onClick={() => onChange(moveAisle(order, n, 1))}>
                <Icon name="down" />
              </button>
            </li>
          ))}
        </ol>
        <div className="sheet-actions">
          <button className="secondary" disabled={isDefaultOrder(order)} onClick={() => onChange(aisleOrder(null))}>
            Reset
          </button>
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

/** The current shopping list by aisle: tick items off while shopping, add extras, copy it as text. */
/** `ebag` is the eBag.bg search link template, or null when the links are off. */
export default function ShoppingList({ list, pantry = [], ebag = null, units = 'original', onChange, onNew, onToPantry }) {
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(null) // key of the item showing what it is for
  const [toPantry, setToPantry] = useState(null) // null, 'saving' or an error
  const [ordering, setOrdering] = useState(false)
  const { match, canonical } = useCatalog()
  // A list object can exist only to carry the meal plan
  if (!list || (!list.items?.length && !list.recipes?.length)) {
    return (
      <>
        <header className="main-header">
          <h1>Shopping list</h1>
        </header>
        <div className="empty">
          <div className="empty-icon" aria-hidden="true">
            <Icon name="cart" size={44} />
          </div>
          <p>No list yet.</p>
          <p className="hint">Open a recipe and tap Add to list, or pick several recipes at once.</p>
          <button onClick={onNew}>Pick recipes</button>
        </div>
      </>
    )
  }
  const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => canonical(p.name)))
  // Staples on the list are there because the stock is low
  const isAtHome = (i) => !String(i.key).startsWith('stock-') && atHome.has(canonical(i.name))
  const aisleOf = (i) => i.aisle ?? match(i.name)?.aisle ?? 'Other'
  // To buy by aisle, then what is probably at home, then the basket
  const order = aisleOrder(list.aisles)
  const rank = (i) => (i.checked ? 2000 : isAtHome(i) ? 1000 : 0) + Math.max(0, order.indexOf(aisleOf(i)))
  const items = [...list.items].sort((a, b) => rank(a) - rank(b))
  const toggle = (key) => onChange({ ...list, items: list.items.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i)) })
  const add = () => {
    const text = extra.trim()
    if (!text) return
    const entry = match(text)
    onChange({
      ...list,
      items: [
        ...list.items,
        { key: `extra-${Date.now()}`, name: text, aisle: entry?.aisle ?? 'Other', qty: '', unit: '', extra: [], from: [], checked: false },
      ],
    })
    setExtra('')
  }
  const copy = async () => {
    const lines = items
      .filter((i) => !i.checked)
      .map((i) => `• ${[amountText(convertIngredient(i, units, match)), i.name].filter(Boolean).join(' ')}${i.extra.length ? ` (+ ${i.extra.join(', ')})` : ''}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <header className="main-header">
        <h1>Shopping list</h1>
        <div className="actions">
          <span className="note">{list.items.filter((i) => !i.checked).length} to buy</span>
          <button className="secondary round" aria-label="Order of the shop" title="Order of the shop" onClick={() => setOrdering(true)}>
            <Icon name="reorder" />
          </button>
        </div>
      </header>
      {ordering && (
        <AisleSheet
          order={order}
          inUse={new Set(list.items.map(aisleOf))}
          onChange={(next) => onChange({ ...list, aisles: isDefaultOrder(next) ? null : next })}
          onClose={() => setOrdering(false)}
        />
      )}
      <section className="card">
        {list.recipes.length > 0 && (
          <p className="note top">For {list.recipes.map((r) => `${r.title} (${r.servings ? `${r.portions} portions` : `×${r.portions}`})`).join(', ')}</p>
        )}
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
                <li className={`${i.checked ? 'checked' : ''}${open === i.key ? ' open' : ''}`}>
                  <label className="shop-tick">
                    <input type="checkbox" checked={!!i.checked} onChange={() => toggle(i.key)} />
                    <IngredientIcon entry={match(i.name)} />
                  </label>
                  {/* Tapping the name shows which recipe needs how much; the box ticks it off */}
                  <button
                    className="item-text"
                    aria-expanded={open === i.key}
                    onClick={() => (i.uses?.length ? setOpen(open === i.key ? null : i.key) : toggle(i.key))}
                  >
                      {amountText(convertIngredient(i, units, match)) && <strong>{amountText(convertIngredient(i, units, match))} </strong>}
                      {i.name}
                      {isAtHome(i) && !i.checked && <span className="badge">at home</span>}
                    {String(i.key).startsWith('stock-') && <span className="badge muted">staple</span>}
                      {i.extra.length > 0 && <span className="note"> + {i.extra.join(', ')}</span>}
                      {list.recipes.length > 1 && i.from.length > 0 && <span className="from">{i.from.join(', ')}</span>}
                    {i.uses?.length > 0 && <Icon name={open === i.key ? 'up' : 'down'} size={16} className="caret" />}
                  </button>
                  {open === i.key && (
                    <ul className="uses">
                      {i.uses.map((u, k) => (
                        <li key={k}>
                          <span className="uses-for">{[list.recipes.length > 1 || !u.group ? u.recipe : null, u.group].filter(Boolean).join(' · ')}</span>
                          <span>
                            <strong>{amountText(convertIngredient(u, units, match)) || 'some'}</strong> {u.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {ebag && !i.checked && ebagQuery(i.name, match(i.name)) && (
                    <button className="ebag" aria-label={`Search ${i.name} on eBag`} onClick={() => openExternal(ebagUrl(ebagQuery(i.name, match(i.name)), ebag))}>
                      eBag <Icon name="external" size={13} />
                    </button>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ul>
        <div className="row">
          <input
            className="search grow"
            placeholder="Add something else"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
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
              disabled={toPantry === 'saving'}
              onClick={async () => {
                setToPantry('saving')
                try {
                  await onToPantry(list.items.filter((i) => i.checked))
                  onChange({ ...list, items: list.items.filter((i) => !i.checked) })
                  setToPantry(null)
                } catch (err) {
                  // The ticked items stay on the list to try again
                  setToPantry(pantryError(err))
                }
              }}
            >
              {toPantry === 'saving' ? 'Saving…' : 'Put ticked at home'}
            </button>
          )}
          <button className="secondary" onClick={onNew}>
            New list
          </button>
        </div>
        {toPantry && toPantry !== 'saving' && <p className="hint error">{toPantry}</p>}
      </section>
    </>
  )
}

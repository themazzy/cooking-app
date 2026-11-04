import { Fragment, useRef, useState } from 'react'
import { aisleOrder, isDefaultOrder, moveAisle } from './lib/aisles.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { ebagQuery, ebagUrl } from './lib/ebag.js'
import { openExternal } from './lib/pageReader.js'
import { isOut } from './lib/stock.js'
import { pantryError } from './lib/pantry.js'
import { convertIngredient } from './lib/units.js'
import { addExtra, countBought, editItem, quickAdds, removeItems } from './lib/shopping.js'
import { toast } from './lib/toast.js'
import ShopItemSheet from './ShopItemSheet.jsx'
import ToHomeSheet from './ToHomeSheet.jsx'
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
export default function ShoppingList({ list, recipes = [], pantry = [], ebag = null, units = 'original', onChange, onNew, onToPantry }) {
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(null) // key of the item open in its sheet
  const [toPantry, setToPantry] = useState(null) // null, 'review', 'saving' or an error
  const [ordering, setOrdering] = useState(false)
  // Swiping a row to the left removes it
  const [swipe, setSwipe] = useState(null) // { key, dx }
  const drag = useRef(null)
  const { match, canonical } = useCatalog()
  const current = list ?? { createdAt: Date.now(), recipes: [], items: [] }
  const addText = (text) => {
    if (!String(text ?? '').trim()) return
    const { list: next, joined } = addExtra({ ...current, items: current.items ?? [] }, text, match)
    if (next !== current) onChange(next)
    if (joined) toast(next === current ? `${joined} is on the list already` : `Added to ${joined} on the list`, { kind: 'info' })
  }
  const add = () => {
    addText(extra)
    setExtra('')
  }
  // Staples kept at home, then what you buy most often
  const quick = quickAdds(current, pantry.filter((p) => String(p.min_amount ?? '').trim()).map((p) => p.name), match)
  const adder = (
    <>
      <div className="row">
        <input
          className="search grow"
          placeholder="Add something, e.g. 2 lemons"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="secondary" onClick={add} disabled={!extra.trim()}>
          Add
        </button>
      </div>
      {quick.length > 0 && (
        <div className="aisle-chips quick-add" aria-label="Add again">
          {quick.map((name) => (
            <button key={name} className="chip-btn soft" onClick={() => addText(name)}>
              <Icon name="plus" size={14} /> {name}
            </button>
          ))}
        </div>
      )}
    </>
  )
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
        <section className="list-page">{adder}</section>
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
  /** Removes items, with Undo in the toast; `bought` ones count for the quick-add row. */
  const remove = (keys, what, bought = false) => {
    const before = list
    const counted = bought ? countBought(list, list.items.filter((i) => keys.includes(i.key))) : list
    onChange(removeItems(counted, keys, recipes, match))
    toast(what, { action: { label: 'Undo', run: () => onChange(before) } })
  }
  const nameOf = (key) => list.items.find((i) => i.key === key)?.name ?? 'Item'
  const swipeHandlers = (key) => ({
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' || e.target.closest('input, .ebag, .item-edit')) return
      drag.current = { key, x: e.clientX, y: e.clientY, on: false }
    },
    onPointerMove: (e) => {
      const d = drag.current
      if (!d || d.key !== key) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.on && Math.abs(dy) > 12) return (drag.current = null)
      if (!d.on && dx < -12 && Math.abs(dx) > Math.abs(dy)) d.on = true
      if (d.on) setSwipe({ key, dx: Math.min(0, dx) })
    },
    onPointerUp: () => {
      const d = drag.current
      drag.current = null
      if (!d?.on) return
      const gone = (swipe?.key === key ? swipe.dx : 0) < -90
      setSwipe(null)
      if (gone) remove([key], `${nameOf(key)} removed`)
    },
    onPointerCancel: () => {
      drag.current = null
      setSwipe(null)
    },
    // A swipe is not a tap
    onClickCapture: (e) => {
      if (swipe?.key === key && swipe.dx < -12) e.stopPropagation()
    },
  })
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
      <section className="list-page">
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
                <li
                  className={`swipe-row${i.checked ? ' checked' : ''}${swipe?.key === i.key && swipe.dx < -90 ? ' going' : ''}`}
                  style={swipe?.key === i.key ? { transform: `translateX(${swipe.dx}px)` } : undefined}
                  {...swipeHandlers(i.key)}
                >
                  <label className="shop-tick">
                    <input type="checkbox" checked={!!i.checked} onChange={() => toggle(i.key)} />
                    <IngredientIcon entry={match(i.name)} />
                  </label>
                  {/* Tapping the name ticks it off too; the pencil opens it to change, remove or find on eBag */}
                  <button className="item-text" onClick={() => toggle(i.key)}>
                    {amountText(convertIngredient(i, units, match)) && <strong>{amountText(convertIngredient(i, units, match))} </strong>}
                    {i.name}
                    {isAtHome(i) && !i.checked && <span className="badge">at home</span>}
                    {String(i.key).startsWith('stock-') && <span className="badge muted">staple</span>}
                    {i.extra.length > 0 && <span className="note"> + {i.extra.join(', ')}</span>}
                    {list.recipes.length > 1 && i.from.length > 0 && <span className="from">{i.from.join(', ')}</span>}
                  </button>
                  <button className="icon item-edit" aria-label={`Change or remove ${i.name}`} title="Change or remove" onClick={() => setEditing(i.key)}>
                    <Icon name="pencil" size={18} />
                  </button>
                </li>
              </Fragment>
            )
          })}
        </ul>
        {adder}
        <div className="row">
          <button onClick={copy}>{copied ? 'Copied' : 'Copy list'}</button>
          <button
            className="secondary"
            disabled={!list.items.some((i) => i.checked)}
            onClick={() => {
              const ticked = list.items.filter((i) => i.checked)
              remove(
                ticked.map((i) => i.key),
                `${ticked.length} ticked item${ticked.length === 1 ? '' : 's'} removed`,
                true,
              )
            }}
          >
            Remove ticked
          </button>
          {onToPantry && list.items.some((i) => i.checked) && (
            <button className="secondary" disabled={toPantry === 'saving'} onClick={() => setToPantry('review')}>
              {toPantry === 'saving' ? 'Saving…' : 'Put ticked at home'}
            </button>
          )}
          <button className="secondary" onClick={onNew}>
            New list
          </button>
        </div>
        {toPantry && toPantry !== 'saving' && toPantry !== 'review' && <p className="hint error">{toPantry}</p>}
      </section>
      {editing && list.items.some((i) => i.key === editing) && (
        <ShopItemSheet
          item={list.items.find((i) => i.key === editing)}
          many={list.recipes.length > 1}
          units={units}
          packs={list.packs}
          onClose={() => setEditing(null)}
          onEbag={(() => {
            const it = list.items.find((i) => i.key === editing)
            const q = ebag && it && ebagQuery(it.name, match(it.name))
            return q ? () => openExternal(ebagUrl(q, ebag)) : null
          })()}
          onSave={(patch) => {
            onChange(editItem(list, editing, patch, match))
            setEditing(null)
          }}
          onDelete={() => {
            remove([editing], `${nameOf(editing)} removed`)
            setEditing(null)
          }}
        />
      )}
      {toPantry === 'review' && (
        <ToHomeSheet
          items={list.items.filter((i) => i.checked)}
          pantry={pantry}
          packs={list.packs}
          onClose={() => setToPantry(null)}
          onDone={async (rows, packs) => {
            setToPantry('saving')
            const withPacks = Object.keys(packs).length ? { ...list, packs: { ...(list.packs ?? {}), ...packs } } : list
            const done = []
            try {
              // Each saved item leaves the list, so trying again after an error does not add it twice
              await onToPantry(rows, (row) => done.push(row))
              setToPantry(null)
            } catch (err) {
              // What was not saved stays ticked on the list to try again; pack sizes are kept
              setToPantry(pantryError(err))
            }
            const saved = rows.filter((r) => done.includes(r))
            onChange(saved.length ? removeItems(countBought(withPacks, saved.map((r) => r.item)), saved.map((r) => r.item.key), recipes, match) : withPacks)
          }}
        />
      )}
    </>
  )
}

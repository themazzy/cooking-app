import { Fragment, useEffect, useRef, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, photoToIcon, useCatalog } from './catalog.jsx'
import { addToPantry, pantryError, removeFromPantry, renamePantryItems, updatePantryItem } from './lib/pantry.js'
import { addTo, daysLeft, expiryLabel, isOut, shortfall } from './lib/stock.js'
import { readReceiptPhotos } from './lib/ocr.js'
import { readReceipt } from './lib/receipt.js'
import ReceiptSheet from './ReceiptSheet.jsx'
import ScanSheet from './ScanSheet.jsx'
import { rememberBarcode } from './lib/barcode.js'
import { RowsSkeleton } from './Skeleton.jsx'
import { toast } from './lib/toast.js'
import { defaultUnit, joinAmount, splitAmount } from './lib/defaultUnit.js'
import { UnitChips, convertQty } from './UnitPicker.jsx'
import Icon from './Icon.jsx'
import NumberField, { unitStep } from './NumberField.jsx'

const SOON = 3 // days
const LINKED_KEY = 'cooking-app:linked-ingredients'

const QUICK = { g: ['100', '250', '500', '1000'], kg: ['1', '2', '5'], ml: ['250', '500', '1000'], l: ['1', '2'], pcs: ['1', '2', '6', '10'] }

/** Amount, unit, minimum and use-by date of one stock item, new or already at home. */
function ItemSheet({ item, entry, own, onSave, onRemove, onClose, onPicture, onRename, message }) {
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
  // Another unit of the same kind converts the amount (500 g → 0,5 kg)
  const unitChips = (value, set, amount, setAmount, title) => (
    <UnitChips
      title={title}
      value={value}
      usual={unitDefault}
      onChange={(u) => {
        setAmount(convertQty(amount, value, u))
        set(u)
      }}
    />
  )
  const save = () => onSave({ amount: joinAmount(qty, unit), min_amount: joinAmount(minQty, minUnit), expires_on: expires || null })
  const [savingPicture, setSavingPicture] = useState(false)
  const [pictureMenu, setPictureMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(own ? item.name : '')
  const [savingName, setSavingName] = useState(false)
  const rename = async () => {
    if (!newName.trim() || newName.trim() === item.name) return setRenaming(false)
    setSavingName(true)
    const ok = await onRename(newName.trim())
    setSavingName(false)
    if (ok) setRenaming(false)
  }
  const pickPicture = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSavingPicture(true)
    setPictureMenu(false)
    await onPicture(file)
    setSavingPicture(false)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="item-head">
          <button className="picture-edit" aria-label={`Change the picture of ${item.name}`} disabled={savingPicture} onClick={() => setPictureMenu(!pictureMenu)}>
            <IngredientIcon entry={entry ?? { name: item.name }} size={56} />
            <span className="picture-badge" aria-hidden="true">
              <Icon name={savingPicture ? 'clock' : 'camera'} size={14} />
            </span>
          </button>
          <div>
            <h2>{item.name}</h2>
            <span className="note">
              {item.id ? 'At home' : 'Add to what you have at home'}
              {own && entry?.base && entry.name !== entry.base ? ` · counts as ${entry.base}` : ''}
            </span>
          </div>
        </div>
        {pictureMenu && (
          <div className="row">
            <label className="button">
              <Icon name="camera" /> Take photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={pickPicture} />
            </label>
            <label className="button secondary">
              <Icon name="image" /> Choose photo
              <input type="file" accept="image/*" hidden onChange={pickPicture} />
            </label>
          </div>
        )}
        {item.id &&
          (renaming ? (
            <>
              <label className="field" htmlFor="item-name">
                {own ? 'Name' : 'Product name, e.g. the brand'}
              </label>
              <div className="amount-row">
                <input
                  id="item-name"
                  autoFocus
                  placeholder={`e.g. Coca-Cola Zero`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && rename()}
                />
                <button className="secondary" disabled={savingName || !newName.trim()} onClick={rename}>
                  {savingName ? 'Saving…' : 'Save name'}
                </button>
              </div>
              {!own && <p className="hint">It becomes one of your own ingredients, shown in Ingredients with its own picture and calories, and still counts as {item.name}.</p>}
            </>
          ) : (
            <button className="link more" onClick={() => setRenaming(true)}>
              {own ? 'Rename' : 'Keep as its own product (brand) in Ingredients'}
            </button>
          ))}
        <label className="field">How much is at home</label>
        <div className="amount-row">
          <NumberField
            inputRef={qtyRef}
            step={unitStep(unit)}
            min={0}
            label="amount"
            placeholder="Amount"
            aria-label="Amount"
            value={qty}
            onChange={setQty}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
        {unitChips(unit, setUnit, qty, setQty, 'Unit')}
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
              <NumberField step={unitStep(minUnit)} min={0} label="minimum" placeholder="Not a staple" aria-label="Minimum amount" value={minQty} onChange={setMinQty} />
            </div>
            {unitChips(minUnit, setMinUnit, minQty, setMinQty, 'Minimum unit')}
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
        {added && <p className="hint added"><Icon name="check" size={16} /> {added}</p>}
        <div className="grid">
          {q && !exact && (
            <button className="tile custom" onClick={() => onPick({ name: query.trim() }, null)}>
              <span className="tile-plus" aria-hidden="true">
                <Icon name="plus" />
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
                    <Icon name="check" />
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
export default function PantryPage({ items, loading = false, onChanged }) {
  const { entries, loaded, match, named, ensure, setPicture, update } = useCatalog()
  const [receipt, setReceipt] = useState(null) // { reading: pct } or { found }
  const [message, setMessage] = useState(null)
  const [query, setQuery] = useState('')
  const [picking, setPicking] = useState(false)
  const [added, setAdded] = useState(null)
  const [editing, setEditing] = useState(null) // { item, entry }
  const [scanning, setScanning] = useState(false)

  const run = async (fn) => {
    setMessage(null)
    try {
      await fn()
      await onChanged()
      return true
    } catch (e) {
      setMessage(pantryError(e))
      return false
    }
  }

  // Everything at home is in the ingredient list too: names the catalog does not
  // have become the household's own ingredients (once per name on this phone,
  // so one deleted from Ingredients does not come back)
  useEffect(() => {
    if (!loaded) return
    let linked
    try {
      linked = new Set(JSON.parse(localStorage.getItem(LINKED_KEY)) ?? [])
    } catch {
      linked = new Set()
    }
    const missing = [...new Set(items.map((i) => i.name.trim()).filter((n) => n && !named(n) && !linked.has(n.toLowerCase())))]
    if (!missing.length) return
    ;(async () => {
      for (const name of missing) {
        try {
          await ensure(name)
          linked.add(name.toLowerCase())
        } catch {
          // offline: tried again next time
        }
      }
      try {
        localStorage.setItem(LINKED_KEY, JSON.stringify([...linked]))
      } catch {
        // a convenience
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loaded])

  const changePicture = async (name, file) => {
    try {
      await setPicture(name, await photoToIcon(file))
      toast(`New picture for ${name}`)
    } catch (e) {
      toast(e?.message ?? String(e), { kind: 'error' })
    }
  }

  // The household's own ingredient (not an everyday one, nor its picture override)
  const ownEntry = (name) => {
    const e = named(name)
    return e?.household_id && !entries.some((x) => !x.household_id && x.name.toLowerCase() === e.name.toLowerCase()) ? e : null
  }

  // Renames what is at home; an everyday ingredient becomes the household's own product counting as it
  const renameItem = async (newName) => {
    const { item } = editing
    const entry = named(item.name)
    const own = ownEntry(item.name)
    const ok = await run(async () => {
      if (own) await update(own.id, { name: newName })
      else await ensure(newName, { base: entry?.base ?? entry?.name ?? item.name, aisle: entry?.aisle })
      await renamePantryItems(item.name, newName)
    })
    if (!ok) return false
    toast(`${item.name} is now ${newName}`)
    setEditing((ed) => ed && { ...ed, item: { ...ed.item, name: newName } })
    return true
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
    if (!picking) toast(`${item.name} saved`)
    if (picking) setAdded(`${item.name}${patch.amount ? `, ${patch.amount}` : ''}`)
  }

  // Receipt photos collect first (a long receipt takes several), then are read together
  const [shots, setShots] = useState(null) // null when the receipt sheet is closed, else [{ file, url }]
  const addShots = (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) setShots((list) => [...(list ?? []), ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const closeShots = () =>
    setShots((list) => {
      for (const s of list ?? []) URL.revokeObjectURL(s.url)
      return null
    })
  const readShots = () => {
    const files = shots.map((s) => s.file)
    closeShots()
    onReceipt(files)
  }

  const onReceipt = async (files) => {
    if (!files.length) return
    setMessage(null)
    setReceipt({ reading: 0, status: 'Reading the receipt…' })
    try {
      const text = await readReceiptPhotos(files, (p) =>
        setReceipt({
          reading: Math.round((p.progress ?? 0) * 100),
          status: p.status === 'recognizing text' ? 'Reading the receipt…' : 'Starting the text reader…',
        }),
      )
      setReceipt({ found: readReceipt(text, entries) })
    } catch (err) {
      setReceipt(null)
      setMessage(err?.message ?? String(err))
    }
  }
  // Each ingredient once, its amounts added up, then added to what is at home
  const addFromReceipt = async (rows) => {
    const merged = new Map()
    for (const r of rows) {
      const name = r.entry?.name ?? r.name.trim()
      if (!name) continue
      const prev = merged.get(name)
      merged.set(name, prev == null ? r.amount : addTo(prev, ...(r.amount.match(/^(\S+)\s*(.*)$/)?.slice(1) ?? ['', ''])))
    }
    const ok = await run(async () => {
      for (const [name, amount] of merged) {
        const key = name.toLowerCase()
        const have = items.find((i) => (match(i.name)?.name ?? i.name).toLowerCase() === key)
        if (have) await updatePantryItem(have.id, { amount: amount ? addTo(have.amount, ...amount.match(/^(\S+)\s*(.*)$/).slice(1)) : have.amount })
        else await addToPantry(name, amount)
      }
    })
    if (ok) toast(`${merged.size} item${merged.size === 1 ? '' : 's'} from the receipt put at home`)
    setReceipt(null)
  }

  // A scanned product: its amount added to what is at home, and the barcode remembered.
  // Returns true, or what went wrong for the scan sheet to show.
  const addScanned = async ({ code, ingredient, own, base, aisle, picture, kcal, product, pack, amount }) => {
    let remembered = true
    try {
      // A product kept under its own name is one of the household's ingredients, with the pack photo
      if (own) await ensure(ingredient, { base, aisle, image_data: picture, kcal })
      const key = ingredient.toLowerCase()
      const have = items.find((i) => (match(i.name)?.name ?? i.name).toLowerCase() === key)
      if (have) await updatePantryItem(have.id, { amount: amount ? addTo(have.amount, ...amount.match(/^(\S+)\s*(.*)$/).slice(1)) : have.amount })
      else await addToPantry(ingredient, amount)
      remembered = await rememberBarcode(code, { ingredient, product, pack })
      await onChanged()
    } catch (e) {
      return pantryError(e)
    }
    toast(`${ingredient}${amount ? `, ${amount}` : ''} put at home`)
    if (!remembered) toast('Scanned products are not remembered yet: run supabase-product-barcodes.sql in Supabase', { kind: 'error', id: 'barcodes-table' })
    return true
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
        <div className="actions">
          <button className="small secondary" onClick={() => (setMessage(null), setScanning(true))}>
            <Icon name="barcode" /> Scan
          </button>
          <button className="small secondary" disabled={!!receipt && !receipt.found} onClick={() => setShots([])}>
            <Icon name="camera" /> Receipt
          </button>
          <button className="small" onClick={() => (setAdded(null), setPicking(true))}>
            <Icon name="plus" size={16} strokeWidth={2.5} /> Add
          </button>
        </div>
      </header>
      <p className="hint top">
        {loading && !items.length ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
        {staples ? ` · ${staples} staple${staples === 1 ? '' : 's'}` : ''}
        {low ? ` · ${low} running low, on the shopping list` : ''}
      </p>
      {message && !editing && <p className="hint error">{message}</p>}
      {receipt?.reading != null && (
        <div className="card">
          {receipt.status} {receipt.reading}%
          <progress max="100" value={receipt.reading} />
        </div>
      )}
      {loading && items.length === 0 ? (
        <RowsSkeleton />
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon" aria-hidden="true">
            <Icon name="home" size={44} />
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
                    <span className="stock-amount">{out ? 'used up' : i.amount || <Icon name="check" size={16} />}</span>
                  </li>
                </Fragment>
              )
            })}
          </ul>
        </section>
      )}

      {shots && (
        <div className="sheet-backdrop" onClick={closeShots}>
          <div className="sheet" role="dialog" aria-label="Receipt photos" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <h2>Read a receipt</h2>
            <p className="hint top">Take a photo of the receipt, flat and in good light. For a long one, take several, top to bottom.</p>
            {shots.length > 0 && (
              <ol className="photo-pages">
                {shots.map((p, n) => (
                  <li key={p.url}>
                    <img src={p.url} alt={`Photo ${n + 1}`} />
                    <span className="page-no">{n + 1}</span>
                    <button
                      className="remove"
                      aria-label={`Remove photo ${n + 1}`}
                      onClick={() =>
                        setShots((list) => {
                          URL.revokeObjectURL(list[n].url)
                          return list.filter((_, i) => i !== n)
                        })
                      }
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="row">
              <label className={`button${shots.length ? ' secondary' : ''}`}>
                <Icon name="camera" /> {shots.length ? 'Take another' : 'Take photo'}
                <input type="file" accept="image/*" capture="environment" hidden onChange={addShots} />
              </label>
              <label className="button secondary">
                <Icon name="image" /> From gallery
                <input type="file" accept="image/*" multiple hidden onChange={addShots} />
              </label>
            </div>
            {shots.length > 0 && (
              <button className="big read-pages" onClick={readShots}>
                Read {shots.length} photo{shots.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}
      {receipt?.found && <ReceiptSheet found={receipt.found} onAdd={addFromReceipt} onClose={() => setReceipt(null)} />}
      {scanning && (
        <ScanSheet
          onAdd={addScanned}
          onClose={() => setScanning(false)}
          renderPicker={(onPick, onClose) => <Picker items={items} onPick={onPick} onClose={onClose} />}
        />
      )}
      {picking && !editing && <Picker items={items} added={added} onPick={open} onClose={() => setPicking(false)} />}
      {editing && (
        <ItemSheet
          key={editing.item.id ?? editing.item.name}
          item={editing.item}
          entry={named(editing.item.name) ?? editing.entry}
          message={message}
          onSave={save}
          own={!!ownEntry(editing.item.name)}
          onPicture={(file) => changePicture(editing.item.name, file)}
          onRename={renameItem}
          onRemove={async () => {
            if (await run(() => removeFromPantry(editing.item.id))) {
              toast(`${editing.item.name} removed`)
              setEditing(null)
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

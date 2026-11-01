import { useEffect, useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import NumberField, { unitStep } from './NumberField.jsx'
import { UnitChips, UnitSheet, convertQty } from './UnitPicker.jsx'
import { scannedPacks } from './lib/barcode.js'
import { defaultUnit } from './lib/defaultUnit.js'
import { boughtAmount, packFor, packsAmount } from './lib/packs.js'
import { addTo, isOut } from './lib/stock.js'
import Icon from './Icon.jsx'

const amountText = (qty, unit) => [qty, unit].filter((x) => String(x ?? '').trim()).join(' ')
const toChip = (unit) => (String(unit ?? '').trim() ? unit : 'pcs')
const fromChip = (unit) => (unit === 'pcs' ? '' : unit)

/** Setting how much one pack of an ingredient holds; remembered for both phones. */
function PackSheet({ name, pack, usual, onSave, onClose }) {
  const [q0, u0 = ''] = String(pack ?? '').split(/\s+/)
  const [qty, setQty] = useState(pack ? q0 : '')
  const [unit, setUnit] = useState(pack ? toChip(u0 === 'pcs' ? '' : u0) : usual)
  const save = () => onSave(String(qty).trim() ? amountText(qty, unit) : '')
  return (
    <div className="sheet-backdrop select-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Pack of ${name}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>One pack of {name}</h2>
        <p className="hint">What one pack, bottle or bag holds where you shop. Both phones remember it.</p>
        <div className="amount-row">
          <NumberField autoFocus step={unitStep(unit)} min={0} label="pack size" placeholder="Not sold in packs" aria-label="Pack size" value={qty} onChange={setQty} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <UnitChips
          title="Pack unit"
          value={unit}
          usual={usual}
          onChange={(u) => {
            setQty((q) => convertQty(q, unit, u))
            setUnit(u)
          }}
        />
        <div className="sheet-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

/**
 * Putting what was bought at home. Each ticked item starts at the whole
 * packs that cover the list (2 tbsp of butter → one 250 g block), and the
 * amount, unit and pack size can be changed before it is added.
 */
export default function ToHomeSheet({ items, pantry, packs: ownPacks = {}, onDone, onClose }) {
  const { match, canonical } = useCatalog()
  const [scanned, setScanned] = useState(null)
  const [packs, setPacks] = useState(ownPacks ?? {})
  const [changed, setChanged] = useState({}) // name → pack set here
  useEffect(() => {
    let live = true
    scannedPacks().then((m) => live && setScanned(m))
    return () => {
      live = false
    }
  }, [])
  const start = (i, known = scanned) => {
    const entry = match(i.name)
    return { on: true, touched: false, ...boughtAmount(i, entry, packFor(i.name, entry, { own: packs, scanned: known })) }
  }
  const [rows, setRows] = useState(() => Object.fromEntries(items.map((i) => [i.key, start(i)])))
  // Scanned packs arrive a moment later; rows not changed yet take them
  useEffect(() => {
    if (!scanned) return
    setRows((r) => Object.fromEntries(items.map((i) => [i.key, r[i.key]?.touched ? r[i.key] : start(i, scanned)])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanned])
  const [packing, setPacking] = useState(null) // item whose pack size is being set
  const [unitFor, setUnitFor] = useState(null) // item whose unit is being picked
  const set = (key, patch) => setRows((r) => ({ ...r, [key]: { ...r[key], ...patch, touched: true } }))
  const atHome = (i) => pantry.find((p) => canonical(p.name) === canonical(i.name))
  const chosen = items.filter((i) => rows[i.key]?.on)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Put at home" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Put at home</h2>
        <p className="hint">How much you bought. Whole packs are filled in where the pack size is known; tap the pack to change it.</p>
        <ul className="shopping sheet-list to-home">
          {items.map((i) => {
            const r = rows[i.key]
            const have = atHome(i)
            const after = addTo(have && !isOut(have) ? have.amount : '', r.qty, r.unit)
            const listAmount = amountText(i.qty, i.unit)
            return (
              <li key={i.key} className={r.on ? '' : 'checked'}>
                <label className="shop-tick">
                  <input type="checkbox" checked={r.on} onChange={() => set(i.key, { on: !r.on })} aria-label={`Put ${i.name} at home`} />
                  <IngredientIcon entry={match(i.name)} />
                </label>
                <div className="to-home-text">
                  <span className="to-home-name">{i.name}</span>
                  <span className="from">
                    {[listAmount && `list ${listAmount}`, have && `at home ${have.amount || 'some'} → ${after || 'some'}`].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {r.on && (
                  <div className="to-home-amount">
                    <NumberField step={unitStep(r.unit)} min={0} label={`${i.name} bought`} placeholder="Some" aria-label={`${i.name} bought`} value={r.qty} onChange={(qty) => set(i.key, { qty, packs: null })} />
                    <button className="chip-btn soft" onClick={() => setUnitFor(i)} aria-label={`Unit of ${i.name}`}>
                      {toChip(r.unit)}
                    </button>
                    {r.pack ? (
                      <span className="pack-step">
                        <button className="icon" aria-label="One pack less" disabled={(r.packs ?? 1) <= 1} onClick={() => set(i.key, { packs: (r.packs ?? 1) - 1, ...packsAmount((r.packs ?? 1) - 1, r.pack) })}>
                          <Icon name="minus" size={16} />
                        </button>
                        <button className="link" onClick={() => setPacking(i)}>
                          {r.packs ? `${r.packs} × ` : ''}
                          {r.pack}
                        </button>
                        <button className="icon" aria-label="One pack more" onClick={() => set(i.key, { packs: (r.packs ?? 0) + 1, ...packsAmount((r.packs ?? 0) + 1, r.pack) })}>
                          <Icon name="plus" size={16} />
                        </button>
                      </span>
                    ) : (
                      <button className="link" onClick={() => setPacking(i)}>
                        + pack size
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="sheet-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={!chosen.length} onClick={() => onDone(chosen.map((i) => ({ item: i, qty: rows[i.key].qty, unit: rows[i.key].unit })), changed, items.filter((i) => !rows[i.key]?.on))}>
            Put {chosen.length} at home
          </button>
        </div>
        {unitFor && (
          <UnitSheet
            title={`Unit of ${unitFor.name}`}
            value={toChip(rows[unitFor.key].unit)}
            onPick={(u) => {
              const r = rows[unitFor.key]
              set(unitFor.key, { unit: fromChip(u), qty: convertQty(r.qty, r.unit, fromChip(u)), packs: null })
              setUnitFor(null)
            }}
            onClose={() => setUnitFor(null)}
          />
        )}
        {packing && (
          <PackSheet
            name={packing.name}
            pack={rows[packing.key].pack}
            usual={defaultUnit(match(packing.name) ?? { name: packing.name, aisle: 'Other' })}
            onClose={() => setPacking(null)}
            onSave={(pack) => {
              const entry = match(packing.name)
              const name = (entry?.name ?? packing.name).toLowerCase()
              setPacks((p) => ({ ...p, [name]: pack }))
              setChanged((c) => ({ ...c, [name]: pack }))
              set(packing.key, boughtAmount(packing, entry, pack))
              setPacking(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

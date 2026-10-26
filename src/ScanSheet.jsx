import { useEffect, useRef, useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { canScan, isValidBarcode, lookupBarcode, normalizeBarcode, scanBarcode } from './lib/barcode.js'
import { defaultUnit, joinAmount, splitAmount } from './lib/defaultUnit.js'
import { UnitChips, convertQty } from './UnitPicker.jsx'
import Icon from './Icon.jsx'

const SOURCE = {
  household: 'Saved by your household',
  openfoodfacts: 'Found in Open Food Facts',
}

/**
 * Scanning a product into what is at home: the barcode is looked up (the
 * household's own list, then Open Food Facts), the person checks which
 * ingredient it is and how much a pack holds, and both are remembered.
 * `renderPicker(onPick, onClose)` shows the ingredient grid for a product
 * that is unknown or was guessed wrong.
 */
export default function ScanSheet({ onAdd, onClose, renderPicker }) {
  const { match } = useCatalog()
  const [found, setFound] = useState(null) // the lookup result being checked
  const [busy, setBusy] = useState(null) // 'scanning' | 'looking' | 'saving'
  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(!canScan())
  const [error, setError] = useState(null)
  const [picking, setPicking] = useState(false)
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [packs, setPacks] = useState(1)
  const [count, setCount] = useState(0) // products added since the sheet opened
  const started = useRef(false)

  const look = async (code) => {
    setError(null)
    setBusy('looking')
    try {
      const result = await lookupBarcode(code, match)
      const [q, u] = splitAmount(result.pack)
      setQty(q)
      setUnit(u || defaultUnit(result.entry ?? { name: result.ingredient || result.product, aisle: 'Other' }))
      setPacks(1)
      setFound(result)
      if (!result.entry && !result.ingredient) setPicking(true)
    } catch (e) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(null)
    }
  }

  const scan = async () => {
    setError(null)
    setBusy('scanning')
    try {
      const code = await scanBarcode()
      setBusy(null)
      if (code) await look(code)
      else if (!found && !count) onClose()
    } catch (e) {
      setBusy(null)
      setError(e?.message ?? String(e))
      setTyping(true)
    }
  }

  // The camera opens straight away; the sheet is for checking what was found
  useEffect(() => {
    if (started.current || !canScan()) return
    started.current = true
    scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitTyped = () => {
    const code = normalizeBarcode(typed)
    if (!isValidBarcode(code)) return setError('That number is not a whole barcode. Type all the digits under the stripes.')
    setTyped('')
    look(code)
  }

  const add = async (next) => {
    const ingredient = found.entry?.name ?? found.ingredient
    if (!ingredient) return setPicking(true)
    setBusy('saving')
    setError(null)
    const pack = joinAmount(qty, unit)
    const n = Number(String(qty).replace(',', '.'))
    const total = pack && packs > 1 && n > 0 ? joinAmount(String(Math.round(n * packs * 1000) / 1000), unit) : pack
    const ok = await onAdd({ code: found.code, ingredient, product: found.product, pack, amount: total, packs })
    setBusy(null)
    // true, or what went wrong
    if (ok !== true) return setError(ok)
    setCount((c) => c + 1)
    setFound(null)
    if (next) scan()
    else onClose()
  }

  const name = found?.entry?.name ?? found?.ingredient
  const usual = defaultUnit(found?.entry ?? { name: name || found?.product || '', aisle: 'Other' })

  if (picking && found) {
    return renderPicker(
      (item, entry) => {
        setFound((f) => ({ ...f, entry: entry ?? null, ingredient: entry?.name ?? item.name }))
        if (!qty) setUnit(defaultUnit(entry ?? { name: item.name, aisle: 'Other' }))
        setPicking(false)
      },
      () => setPicking(false),
    )
  }

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onClose}>
      <div className="sheet" role="dialog" aria-label="Scan a product" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        {!found ? (
          <>
            <h2>Scan a product</h2>
            {busy === 'looking' && <p className="hint top">Looking the product up…</p>}
            {busy === 'scanning' && <p className="hint top">The camera is open. Point it at the barcode.</p>}
            {count > 0 && !busy && <p className="hint added"><Icon name="check" size={16} /> {count} product{count === 1 ? '' : 's'} put at home</p>}
            {error && <p className="hint error">{error}</p>}
            {typing && (
              <>
                <label className="field" htmlFor="scan-typed">Barcode number</label>
                <div className="amount-row">
                  <input id="scan-typed" inputMode="numeric" placeholder="e.g. 3800201980654" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitTyped()} />
                  <button className="secondary" disabled={!typed.trim() || !!busy} onClick={submitTyped}>
                    Look up
                  </button>
                </div>
              </>
            )}
            <div className="sheet-actions">
              <button className="secondary" onClick={onClose}>
                {count ? 'Done' : 'Cancel'}
              </button>
              {canScan() && (
                <button disabled={!!busy} onClick={scan}>
                  <Icon name="barcode" /> Scan
                </button>
              )}
            </div>
            {canScan() && !typing && (
              <button className="link more" onClick={() => setTyping(true)}>
                Type the number instead
              </button>
            )}
          </>
        ) : (
          <>
            <div className="item-head">
              <IngredientIcon entry={found.entry ?? { name: name || found.product }} size={56} />
              <div>
                <h2>{found.product || 'Unknown product'}</h2>
                <span className="note">
                  {SOURCE[found.source] ?? (found.offline ? 'Open Food Facts could not be reached' : 'Not in Open Food Facts')} · {found.code}
                </span>
              </div>
            </div>
            <label className="field">What it is</label>
            <button className="scan-ingredient secondary" onClick={() => setPicking(true)}>
              <span className="grow">{name || 'Pick the ingredient'}</span>
              <Icon name="pencil" size={16} />
            </button>
            <label className="field" htmlFor="scan-pack">One pack holds</label>
            <div className="amount-row">
              <input id="scan-pack" inputMode="decimal" placeholder="Amount" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <UnitChips
              title="Pack unit"
              value={unit}
              usual={usual}
              onChange={(u) => {
                setQty(convertQty(qty, unit, u))
                setUnit(u)
              }}
            />
            <div className="scan-packs">
              <span className="field">Packs</span>
              <div className="stepper small">
                <button className="secondary round" aria-label="Fewer packs" disabled={packs <= 1} onClick={() => setPacks(packs - 1)}>
                  <Icon name="minus" />
                </button>
                <span className="count">{packs}</span>
                <button className="secondary round" aria-label="More packs" onClick={() => setPacks(packs + 1)}>
                  <Icon name="plus" />
                </button>
              </div>
            </div>
            <p className="hint">What you pick here is remembered, so the next scan of this product fills it in on both phones.</p>
            {error && <p className="hint error">{error}</p>}
            <div className="sheet-actions">
              <button className="secondary" disabled={!!busy} onClick={() => setFound(null)}>
                Back
              </button>
              {canScan() && (
                <button className="secondary" disabled={!!busy || !name} onClick={() => add(true)}>
                  Add, scan next
                </button>
              )}
              <button disabled={!!busy || !name} onClick={() => add(false)}>
                {busy === 'saving' ? 'Saving…' : 'Add at home'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

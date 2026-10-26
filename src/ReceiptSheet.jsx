import { useState } from 'react'
import { IngredientIcon } from './catalog.jsx'
import Icon from './Icon.jsx'

/**
 * What a receipt photo found: every matched line ticked with its amount,
 * ready to add to the stock; items that matched no ingredient are listed
 * below and can be added under their own name.
 */
export default function ReceiptSheet({ found, onAdd, onClose }) {
  const [rows, setRows] = useState(() => found.filter((f) => f.entry).map((f, n) => ({ ...f, key: n, on: true })))
  const [unknown, setUnknown] = useState(() => found.filter((f) => !f.entry).map((f, n) => ({ ...f, key: `u${n}` })))
  const addUnknown = (u) => {
    setUnknown((list) => list.filter((x) => x !== u))
    setRows((r) => [...r, { ...u, on: true }])
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (key, patch) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const count = rows.filter((r) => r.on).length

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-label="Receipt" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>From the receipt</h2>
        <p className="hint top">
          {rows.length || unknown.length
            ? 'Untick anything you do not want at home and fix amounts. Amounts add to what you already have.'
            : 'No items found on this receipt. A sharp, straight photo of the whole receipt in good light reads best.'}
        </p>
        <div className="receipt-list">
          <ul className="shopping">
            {rows.map((r) => (
              <li key={r.key} className={r.on ? '' : 'checked'}>
                <label>
                  <input type="checkbox" checked={r.on} onChange={() => set(r.key, { on: !r.on })} />
                  <IngredientIcon entry={r.entry ?? { name: r.name }} />
                  {r.entry ? (
                    <span className="receipt-name">
                      {r.entry.name}
                      {r.count > 1 && <span className="count"> ×{r.count}</span>}
                      <span className="from">{r.name}</span>
                    </span>
                  ) : (
                    <input className="receipt-own" aria-label="Name" value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} />
                  )}
                </label>
                <input className="pantry-amount" aria-label={`Amount of ${r.entry?.name ?? r.name}`} placeholder="some" value={r.amount} onChange={(e) => set(r.key, { amount: e.target.value })} />
              </li>
            ))}
          </ul>
          {unknown.length > 0 && (
            <details className="unknown" open={!rows.length}>
              <summary>Not recognised ({unknown.length})</summary>
              <ul>
                {unknown.map((u) => (
                  <li key={u.key}>
                    <span className="note">{u.name}</span>
                    <button type="button" className="small secondary" onClick={() => addUnknown(u)}>
                      <Icon name="plus" size={16} /> Add
                    </button>
                  </li>
                ))}
              </ul>
              <p className="hint">Add puts an item at home under the name from the receipt, which you can change first.</p>
            </details>
          )}
        </div>
        {error && <p className="hint error">{error}</p>}
        <div className="sheet-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={!count || busy}
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                await onAdd(rows.filter((r) => r.on))
              } catch (e) {
                setError(e?.message ?? String(e))
                setBusy(false)
              }
            }}
          >
            {busy ? 'Adding…' : `Add ${count} to At home`}
          </button>
        </div>
      </div>
    </div>
  )
}

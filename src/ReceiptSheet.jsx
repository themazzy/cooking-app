import { useState } from 'react'
import { IngredientIcon } from './catalog.jsx'

/**
 * What a receipt photo found: every matched line ticked with its amount,
 * ready to add to the stock; lines that matched nothing are listed below.
 */
export default function ReceiptSheet({ found, onAdd, onClose }) {
  const [rows, setRows] = useState(() => found.filter((f) => f.entry).map((f, n) => ({ ...f, key: n, on: true })))
  const unknown = found.filter((f) => !f.entry)
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
          {rows.length ? 'Untick anything you do not want at home and fix amounts. Amounts add to what you already have.' : 'No ingredients recognised on this receipt.'}
        </p>
        <div className="receipt-list">
          <ul className="shopping">
            {rows.map((r) => (
              <li key={r.key} className={r.on ? '' : 'checked'}>
                <label>
                  <input type="checkbox" checked={r.on} onChange={() => set(r.key, { on: !r.on })} />
                  <IngredientIcon entry={r.entry} />
                  <span>
                    {r.entry.name}
                    <span className="from">{r.line}</span>
                  </span>
                </label>
                <input className="pantry-amount" aria-label={`Amount of ${r.entry.name}`} placeholder="some" value={r.amount} onChange={(e) => set(r.key, { amount: e.target.value })} />
              </li>
            ))}
          </ul>
          {unknown.length > 0 && (
            <details className="unknown">
              <summary>Not recognised ({unknown.length})</summary>
              <ul>
                {unknown.map((u, n) => (
                  <li key={n} className="note">
                    {u.line}
                  </li>
                ))}
              </ul>
              <p className="hint">Add these with + Add if they are ingredients.</p>
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

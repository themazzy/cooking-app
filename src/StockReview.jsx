import { useEffect, useRef, useState } from 'react'
import { pantryError } from './lib/pantry.js'
import { formatStock, parseStock, takeUsed, usesUp } from './lib/stock.js'

const usedUp = (amount) => {
  const s = parseStock(amount)
  return s ? formatStock({ value: 0, base: s.base }) : '0'
}

/**
 * After cooking: what comes out of the stock, for the cook to check. Each
 * ingredient kept at home can be left out, or have how much was used (or how
 * much is left) changed. Nothing changes until Update. Embedded (on the cooking
 * mode's finish card) it has no button of its own: onChoose gets the chosen
 * rows each time they change, and the card saves them with everything else.
 */
export default function StockReview({ rows: start, onApply, embedded = false, onChoose }) {
  const [rows, setRows] = useState(start)
  const [state, setState] = useState(null) // null, 'saving', 'done' or an error
  // Starts again when the pantry loads or changes (not while the cook types)
  const signature = start.map((r) => `${r.item.id}:${r.item.amount}:${r.used}`).join('|')
  useEffect(() => {
    setRows(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
  const chooseRef = useRef(onChoose)
  chooseRef.current = onChoose
  useEffect(() => {
    if (embedded) chooseRef.current?.(rows.filter((r) => r.on).map((r) => ({ item: r.item, next: r.next.trim() })))
  }, [rows, embedded])
  if (!rows.length) return null

  const set = (n, patch) => setRows((list) => list.map((r, i) => (i === n ? { ...r, ...patch } : r)))
  const chosen = rows.filter((r) => r.on)

  if (state === 'done') {
    return (
      <div className="card stock-plan">
        <h2>Stock updated</h2>
        <p className="hint">The pantry on both phones shows what is left.</p>
      </div>
    )
  }

  return (
    <div className={embedded ? 'stock-plan embedded' : 'card stock-plan'}>
      <h2>{embedded ? 'Take out of At home' : 'Take it out of the stock?'}</h2>
      <p className="hint">{embedded ? 'Check what you used. It is saved when you tap Done.' : 'Check what you used. Nothing changes until you tap Update.'}</p>
      <ul className="stock-review">
        {rows.map((r, n) => {
          const compares = !r.used || takeUsed(r.item.amount, r.used) != null
          return (
            <li key={r.item.id} className={r.on ? '' : 'off'}>
              <label className="stock-name">
                <input type="checkbox" checked={r.on} onChange={(e) => set(n, { on: e.target.checked })} />
                <strong>{r.item.name}</strong>
                <span className="note">at home: {r.item.amount || 'some'}</span>
              </label>
              <div className="stock-fields">
                <label>
                  Used
                  <input
                    value={r.used}
                    placeholder="amount"
                    onChange={(e) => {
                      const used = e.target.value
                      const next = takeUsed(r.item.amount, used)
                      set(n, next != null ? { used, next, on: true } : { used })
                    }}
                  />
                </label>
                <label>
                  Left
                  <input value={r.next} placeholder="amount" onChange={(e) => set(n, { next: e.target.value, on: true })} />
                </label>
                <button className="link" onClick={() => set(n, { next: usedUp(r.item.amount), on: true })}>
                  All used
                </button>
              </div>
              {r.on && usesUp(r.item, r.next) && <span className="note">Used up: it leaves the pantry</span>}
              {r.on && !usesUp(r.item, r.next) && r.item.min_amount?.trim() && parseStock(r.next)?.value === 0 && <span className="note">Staple: stays at 0 and goes on the list</span>}
              {!compares && <span className="note">The units differ, so type what is left</span>}
            </li>
          )
        })}
      </ul>
      {!embedded && (
      <button
        className="secondary"
        disabled={!chosen.length || state === 'saving'}
        onClick={async () => {
          setState('saving')
          try {
            await onApply(chosen.map((r) => ({ item: r.item, next: r.next.trim() })))
            setState('done')
          } catch (err) {
            setState(pantryError(err))
          }
        }}
      >
        {state === 'saving' ? 'Updating…' : `Update ${chosen.length} item${chosen.length === 1 ? '' : 's'}`}
      </button>
      )}
      {state && state !== 'saving' && <p className="hint error">{state}</p>}
    </div>
  )
}

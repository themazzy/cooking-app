import { useState } from 'react'
import { dayKey } from './lib/plan.js'
import { addCooked, cookedAgo, editCooked, removeCooked } from './lib/history.js'
import { raterName } from './lib/ratings.js'
import Icon from './Icon.jsx'

/** When the recipe was cooked, with a note each time (editable), and a button to add today. */
export default function CookedLog({ cooked = [], by = null, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // { at, note }
  const saveEdit = () => {
    onChange(editCooked({ cooked }, editing.at, editing.note))
    setEditing(null)
  }
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [note, setNote] = useState('')
  const save = () => {
    const [y, m, d] = day.split('-').map(Number)
    const now = new Date()
    // A past day keeps the time of day so two on one day stay in order
    const at = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime()
    onChange(addCooked({ cooked }, at, note, by))
    setAdding(false)
    setNote('')
    setDay(dayKey(new Date()))
  }
  const newest = [...cooked].sort((a, b) => b.at - a.at)
  return (
    <section className="card cooked-log">
      <div className="section-head">
        <h2>Cooked {cooked.length ? `${cooked.length}×` : ''}</h2>
        {!adding && (
          <button className="small" onClick={() => setAdding(true)}>
            <Icon name="check" /> Cooked it
          </button>
        )}
      </div>
      {adding && (
        <div className="cooked-form">
          <label>
            Day <input type="date" value={day} max={dayKey(new Date())} onChange={(e) => setDay(e.target.value || dayKey(new Date()))} />
          </label>
          <textarea rows="2" placeholder="How did it go? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row">
            <button className="secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button onClick={save}>Save</button>
          </div>
        </div>
      )}
      {!newest.length && !adding && <p className="hint">Not cooked yet. Tap Cooked it after you make it.</p>}
      <ul className="cooked-list">
        {newest.map((c) => (
          <li key={c.at}>
            <div>
              <strong>{new Date(c.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> <span className="note">{cookedAgo(c.at)}</span>
              {c.by && raterName(c.by) && <span className="note cooked-by"> · {raterName(c.by)}</span>}
              {editing?.at === c.at ? (
                <div className="cooked-edit">
                  <textarea rows="2" autoFocus placeholder="How did it go? (empty removes the note)" value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
                  <div className="row">
                    <button className="secondary" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button onClick={saveEdit}>Save</button>
                  </div>
                </div>
              ) : (
                c.note && <p>{c.note}</p>
              )}
            </div>
            {editing?.at !== c.at && (
              <span className="row-actions">
                <button className="link" aria-label={c.note ? 'Edit the note' : 'Add a note'} onClick={() => setEditing({ at: c.at, note: c.note ?? '' })}>
                  <Icon name="pencil" />
                </button>
                <button className="link remove" aria-label="Remove this entry" onClick={() => onChange(removeCooked({ cooked }, c.at))}>
                  <Icon name="close" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

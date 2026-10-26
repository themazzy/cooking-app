import { useState } from 'react'
import { collectionName, toggleCollection } from './lib/collections.js'
import Icon from './Icon.jsx'

/** Putting a recipe into collections, or starting a new one. Each tap is saved. */
export default function CollectionSheet({ picked = [], all = [], onChange, onClose }) {
  const [name, setName] = useState('')
  const has = (c) => picked.some((p) => p.toLocaleLowerCase() === c.toLocaleLowerCase())
  // Collections this recipe is in come first only if no other recipe uses them yet
  const names = [...all, ...picked.filter((p) => !all.some((a) => a.toLocaleLowerCase() === p.toLocaleLowerCase()))]
  const add = () => {
    const clean = collectionName(name)
    if (clean && !has(clean)) onChange(toggleCollection(picked, clean))
    setName('')
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Collections" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Collections</h2>
        <p className="hint">Your own folders of recipes, shared with your household.</p>
        {names.length > 0 && (
          <ul className="select-options collection-options">
            {names.map((c) => (
              <li key={c}>
                <button type="button" className={has(c) ? 'on' : ''} aria-pressed={has(c)} onClick={() => onChange(toggleCollection(picked, c))}>
                  <Icon name="folder" size={18} />
                  <span className="grow">{c}</span>
                  {has(c) && <Icon name="check" size={18} strokeWidth={2.5} />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <input className="grow" placeholder="New collection, e.g. Christmas" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="New collection" />
          <button className="secondary" disabled={!name.trim()} onClick={add}>
            <Icon name="plus" /> Add
          </button>
        </div>
        <div className="sheet-actions">
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

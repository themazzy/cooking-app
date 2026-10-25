import { useState } from 'react'

const matches = (r, q) =>
  !q || r.title?.toLowerCase().includes(q) || r.ingredients?.some((i) => i.name?.toLowerCase().includes(q))

/**
 * Saved recipes, newest first, with a search over names and ingredients.
 * With `selection` ({ id: portions }) each recipe can be ticked for a
 * shopping list and given the number of portions to buy for.
 */
export default function RecipeList({ recipes, limit, onOpen, selection, onSelect }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = recipes.filter((r) => matches(r, q)).slice(0, limit ?? Infinity)
  return (
    <>
      {!limit && recipes.length > 5 && (
        <input className="search" type="search" placeholder="Search recipes or ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      <ul className="recipe-list">
        {shown.map((r) => {
          const portions = selection?.[r.id]
          const picked = portions != null
          return (
            <li key={r.id} className={selection ? 'selectable' : ''}>
              {selection && (
                <input
                  type="checkbox"
                  aria-label={`Add ${r.title} to the shopping list`}
                  checked={picked}
                  onChange={() => onSelect(r.id, picked ? null : r.servings ?? 1)}
                />
              )}
              <button className="link" onClick={() => (selection ? onSelect(r.id, picked ? null : r.servings ?? 1) : onOpen(r.id))}>
                <span className="recipe-title">{r.title || 'Untitled recipe'}</span>
                <span className="note">
                  {[r.servings ? `${r.servings} portions` : null, `${r.ingredients?.length ?? 0} ingredients`, r.platform, r.video ? '▶ video' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </button>
              {picked && (
                <div className="stepper small">
                  <button className="secondary" aria-label="Fewer portions" disabled={portions <= 1} onClick={() => onSelect(r.id, portions - 1)}>
                    −
                  </button>
                  <span className="count">{r.servings ? portions : `×${portions}`}</span>
                  <button className="secondary" aria-label="More portions" onClick={() => onSelect(r.id, portions + 1)}>
                    +
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {shown.length === 0 && <p className="hint">{q ? 'No recipe matches.' : 'No recipes yet. Import one from a reel or a website, or add one by hand.'}</p>}
    </>
  )
}

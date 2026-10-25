import { useState } from 'react'

const matches = (r, q) =>
  !q || r.title?.toLowerCase().includes(q) || r.ingredients?.some((i) => i.name?.toLowerCase().includes(q))

/** Saved recipes, newest first, with a search over names and ingredients. */
export default function RecipeList({ recipes, limit, onOpen }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = recipes.filter((r) => matches(r, q)).slice(0, limit ?? Infinity)
  return (
    <>
      {!limit && recipes.length > 5 && (
        <input className="search" type="search" placeholder="Search recipes or ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      <ul className="recipe-list">
        {shown.map((r) => (
          <li key={r.id}>
            <button className="link" onClick={() => onOpen(r.id)}>
              <span className="recipe-title">{r.title || 'Untitled recipe'}</span>
              <span className="note">
                {[r.servings ? `${r.servings} portions` : null, `${r.ingredients?.length ?? 0} ingredients`, r.platform, r.video ? '▶ video' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="hint">{q ? 'No recipe matches.' : 'No saved recipes yet.'}</p>}
    </>
  )
}

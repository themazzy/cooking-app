import { useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'

const matches = (r, q) =>
  !q || r.title?.toLowerCase().includes(q) || r.ingredients?.some((i) => i.name?.toLowerCase().includes(q))

const PLATFORM = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube', web: 'Website', photo: 'Photo' }

/** The video's picture, or the first ingredients' pictures when there is no video. */
function Thumb({ recipe }) {
  const { match } = useCatalog()
  if (recipe.thumb) return <img className="thumb" src={recipe.thumb} alt="" loading="lazy" />
  const icons = (recipe.ingredients ?? [])
    .map((i) => match(i.name))
    .filter(Boolean)
    .slice(0, 4)
  return (
    <span className={`thumb mosaic n${icons.length}`} aria-hidden="true">
      {icons.length ? icons.map((e, n) => <IngredientIcon key={n} entry={e} size={28} />) : <span className="thumb-letter">{recipe.title?.[0] ?? '?'}</span>}
    </span>
  )
}

/**
 * Saved recipes, newest first, with a search over names and ingredients.
 * With `selection` ({ id: portions }) each recipe can be ticked for a
 * shopping list and given the number of portions to buy for.
 */
export default function RecipeList({ recipes, onOpen, selection, onSelect }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = recipes.filter((r) => matches(r, q))
  return (
    <>
      {recipes.length > 4 && (
        <input className="search" type="search" placeholder="Search recipes or ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      <ul className="recipe-cards">
        {shown.map((r) => {
          const portions = selection?.[r.id]
          const picked = portions != null
          const toggle = () => onSelect(r.id, picked ? null : r.servings ?? 1)
          return (
            <li key={r.id} className={`recipe-card${picked ? ' picked' : ''}`}>
              <button className="card-main" onClick={() => (selection ? toggle() : onOpen(r.id))} aria-pressed={selection ? picked : undefined}>
                <Thumb recipe={r} />
                <span className="card-text">
                  <span className="recipe-title">{r.title || 'Untitled recipe'}</span>
                  <span className="note">
                    {[r.servings ? `${r.servings} portions` : null, `${r.ingredients?.filter((i) => i.name?.trim()).length ?? 0} ingredients`, PLATFORM[r.platform]]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {selection && <span className={`tick${picked ? ' on' : ''}`} aria-hidden="true">{picked ? '✓' : ''}</span>}
              </button>
              {picked && (
                <div className="card-portions">
                  <span className="note">Portions to buy for</span>
                  <div className="stepper small">
                    <button className="secondary round" aria-label="Fewer portions" disabled={portions <= 1} onClick={() => onSelect(r.id, portions - 1)}>
                      −
                    </button>
                    <span className="count">{r.servings ? portions : `×${portions}`}</span>
                    <button className="secondary round" aria-label="More portions" onClick={() => onSelect(r.id, portions + 1)}>
                      +
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {shown.length === 0 &&
        (q ? (
          <p className="hint">No recipe matches.</p>
        ) : (
          <div className="empty">
            <div className="empty-icon" aria-hidden="true">🍳</div>
            <p>No recipes yet.</p>
            <p className="hint">Share a reel or a recipe page to the app, or use Import or + Add above.</p>
          </div>
        ))}
    </>
  )
}

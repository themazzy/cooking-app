import { useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import Stars from './Stars.jsx'
import { formatMinutes, totalMinutes } from './lib/recipeMeta.js'
import { homeMatch } from './lib/stock.js'
import { cookedAgo, lastCooked } from './lib/history.js'

const matches = (r, q) =>
  !q ||
  r.title?.toLowerCase().includes(q) ||
  r.cuisine?.toLowerCase().includes(q) ||
  r.note?.toLowerCase().includes(q) ||
  r.categories?.some((c) => c.toLowerCase().includes(q)) ||
  r.ingredients?.some((i) => i.name?.toLowerCase().includes(q))

const QUICK = 30
const byCount = (values) => {
  const counts = new Map()
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b))
}

const PLATFORM = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube', web: 'Website', photo: 'Photo' }

/** The cook's photo, the video's picture or the website's, else the first ingredients' pictures. */
function Thumb({ recipe }) {
  const { match } = useCatalog()
  const [broken, setBroken] = useState(false)
  const src = recipe.photoThumb ?? recipe.photo ?? recipe.thumb ?? (broken ? null : recipe.image)
  if (src) return <img className="thumb" src={src} alt="" loading="lazy" onError={() => src === recipe.image && setBroken(true)} />
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

/** One short row of numbers under the title: time, portions, what is at home, rating. */
function CardFacts({ recipe: r, home }) {
  const minutes = totalMinutes(r)
  const facts = [
    minutes ? <span key="t">⏱ {r.timesEstimated ? '~' : ''}{formatMinutes(minutes)}</span> : null,
    r.servings ? <span key="p" title="Portions">👤 {r.servings}</span> : null,
    home?.total ? (
      <span key="h" className={home.missing.length === 0 ? 'home-ok' : ''} title="Ingredients at home">
        🏠 {home.have}/{home.total}
      </span>
    ) : null,
    r.rating ? <Stars key="r" value={r.rating} size="small" /> : null,
    r.note?.trim() ? <span key="n" title="Has a note">📝</span> : null,
  ].filter(Boolean)
  return facts.length ? <span className="card-facts">{facts}</span> : null
}

/**
 * Saved recipes, newest first, with a search over names and ingredients.
 * With `selection` ({ id: portions }) each recipe can be ticked for a
 * shopping list and given the number of portions to buy for.
 */
export default function RecipeList({ recipes, pantry = [], onOpen, selection, onSelect }) {
  const { canonical } = useCatalog()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [cuisine, setCuisine] = useState(null)
  const [quick, setQuick] = useState(false)
  const [fromHome, setFromHome] = useState(false)
  const [sort, setSort] = useState('new')
  const q = query.trim().toLowerCase()
  const categories = byCount(recipes.flatMap((r) => r.categories ?? []))
  const cuisines = byCount(recipes.map((r) => r.cuisine))
  const timed = recipes.some((r) => totalMinutes(r))
  const rated = recipes.some((r) => r.rating)
  const cooked = recipes.some((r) => r.cooked?.length)
  // What can be cooked from what is at home: recipes missing at most this many ingredients
  const home = new Map(pantry.length ? recipes.map((r) => [r.id, homeMatch(r, pantry, canonical)]) : [])
  const MISSING_OK = 2
  const filtered = !!(category || cuisine || quick || fromHome)
  const shown = recipes
    .filter(
      (r) =>
        matches(r, q) &&
        (!category || r.categories?.includes(category)) &&
        (!cuisine || r.cuisine === cuisine) &&
        (!quick || (totalMinutes(r) != null && totalMinutes(r) <= QUICK)) &&
        (!fromHome || (home.get(r.id)?.total > 0 && home.get(r.id).missing.length <= MISSING_OK)),
    )
    .sort((a, b) =>
      sort === 'az'
        ? (a.title || '').localeCompare(b.title || '')
        : sort === 'quick'
          ? (totalMinutes(a) ?? 1e9) - (totalMinutes(b) ?? 1e9)
          : sort === 'rated'
            ? (b.rating ?? 0) - (a.rating ?? 0)
            : sort === 'home'
              ? (home.get(a.id)?.missing.length ?? 1e9) - (home.get(b.id)?.missing.length ?? 1e9) || (home.get(b.id)?.have ?? 0) - (home.get(a.id)?.have ?? 0)
              : sort === 'lately'
                ? (lastCooked(a) ?? 0) - (lastCooked(b) ?? 0)
                : 0,
    )
  const showFilters = recipes.length > 1 && (categories.length || cuisines.length || timed || home.size)
  return (
    <>
      {recipes.length > 4 && (
        <input className="search" type="search" placeholder="Search recipes, ingredients, categories" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      {showFilters ? (
        <div className="recipe-filters">
          <div className="aisle-chips">
            <button className={`chip-btn${!filtered ? ' on' : ''}`} onClick={() => (setCategory(null), setCuisine(null), setQuick(false), setFromHome(false))}>
              All
            </button>
            {home.size > 0 && (
              <button className={`chip-btn${fromHome ? ' on' : ''}`} aria-pressed={fromHome} onClick={() => (setFromHome(!fromHome), !fromHome && setSort('home'))}>
                🏠 Can cook now
              </button>
            )}
            {timed && (
              <button className={`chip-btn${quick ? ' on' : ''}`} aria-pressed={quick} onClick={() => setQuick(!quick)}>
                ⏱ Under {QUICK} min
              </button>
            )}
            {categories.map((c) => (
              <button key={c} className={`chip-btn${category === c ? ' on' : ''}`} aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
          {cuisines.length > 0 && (
            <div className="aisle-chips">
              {cuisines.map((c) => (
                <button key={c} className={`chip-btn soft${cuisine === c ? ' on' : ''}`} aria-pressed={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="sort-row">
            <span className="note">
              {shown.length} recipe{shown.length === 1 ? '' : 's'}
            </span>
            <select className="sort-select" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              {[
                ['new', 'Newest'],
                ['az', 'A–Z'],
                ...(timed ? [['quick', 'Quickest']] : []),
                ...(rated ? [['rated', 'Top rated']] : []),
                ...(home.size ? [['home', 'Most at home']] : []),
                ...(cooked ? [['lately', 'Not cooked lately']] : []),
              ].map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
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
                  <CardFacts recipe={r} home={home.get(r.id)} />
                  {(r.cuisine || lastCooked(r) || PLATFORM[r.platform]) && (
                    <span className="card-sub">
                      {[r.cuisine, lastCooked(r) ? `Cooked ${cookedAgo(lastCooked(r))}` : PLATFORM[r.platform]].filter(Boolean).join(' · ')}
                    </span>
                  )}
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
        (q || filtered ? (
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

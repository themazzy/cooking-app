import { useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import Stars from './Stars.jsx'
import { formatMinutes, totalMinutes } from './lib/recipeMeta.js'
import { homeMatch } from './lib/stock.js'
import { cookedAgo, lastCooked } from './lib/history.js'
import { averageRating } from './lib/ratings.js'
import { allCollections, inCollection } from './lib/collections.js'
import Select from './Select.jsx'
import Icon from './Icon.jsx'
import { formatKcal, portionKcal } from './lib/calories.js'

const matches = (r, q) =>
  !q ||
  r.title?.toLowerCase().includes(q) ||
  r.cuisine?.toLowerCase().includes(q) ||
  r.note?.toLowerCase().includes(q) ||
  r.categories?.some((c) => c.toLowerCase().includes(q)) ||
  r.collections?.some((c) => c.toLowerCase().includes(q)) ||
  r.ingredients?.some((i) => i.name?.toLowerCase().includes(q))

// Quick filters: total time and calories of one portion at most this much
const TIMES = [30, 60]
const KCALS = [500, 700]
const TOP_RATED = 4
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

/** One short row of numbers under the title: time, kcal per portion, what is at home, rating. */
function CardFacts({ recipe: r, home, kcal }) {
  const minutes = totalMinutes(r)
  const facts = [
    minutes ? <span key="t"><Icon name="clock" size={14} /> {r.timesEstimated ? '~' : ''}{formatMinutes(minutes)}</span> : null,
    kcal != null ? <span key="k" title="Calories per portion"><Icon name="flame" size={14} /> {formatKcal(kcal)} kcal</span> : null,
    home?.total ? (
      <span key="h" className={home.missing.length === 0 ? 'home-ok' : ''} title="Ingredients at home">
        <Icon name="home" size={14} /> {home.have}/{home.total}
      </span>
    ) : null,
    averageRating(r) ? <Stars key="r" value={Math.round(averageRating(r))} size="small" /> : null,
    r.note?.trim() ? <span key="n" title="Has a note"><Icon name="note" size={14} /></span> : null,
  ].filter(Boolean)
  return facts.length ? <span className="card-facts">{facts}</span> : null
}

/** The collection being looked at, with renaming it for every recipe in it. */
function CollectionHead({ collection, onRename, onClose }) {
  const [name, setName] = useState(null) // the new name while renaming
  const save = () => {
    if (name?.trim() && name.trim() !== collection.name) onRename(collection.name, name)
    setName(null)
  }
  return (
    <div className="collection-head">
      {name == null ? (
        <>
          <h2>
            <Icon name="folder" size={18} /> {collection.name}
          </h2>
          {onRename && (
            <button className="small secondary" onClick={() => setName(collection.name)}>
              <Icon name="pencil" size={15} /> Rename
            </button>
          )}
          <button className="icon" aria-label="Show all recipes" onClick={onClose}>
            <Icon name="close" />
          </button>
        </>
      ) : (
        <>
          <input autoFocus aria-label="Collection name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => (e.key === 'Enter' ? save() : e.key === 'Escape' && setName(null))} />
          <button className="small" onClick={save}>
            Save
          </button>
        </>
      )}
    </div>
  )
}

/**
 * Saved recipes, newest first, with a search over names and ingredients.
 * With `selection` ({ id: portions }) each recipe can be ticked for a
 * shopping list and given the number of portions to buy for.
 */
export default function RecipeList({ recipes, pantry = [], onOpen, selection, onSelect, onRenameCollection }) {
  const { canonical, match } = useCatalog()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [collection, setCollection] = useState(null) // its name
  const [cuisine, setCuisine] = useState(null)
  const [maxTime, setMaxTime] = useState(null) // minutes
  const [maxKcal, setMaxKcal] = useState(null) // per portion
  const [topRated, setTopRated] = useState(false)
  const [notCooked, setNotCooked] = useState(false)
  const [fromHome, setFromHome] = useState(false)
  const [sort, setSort] = useState('new')
  const q = query.trim().toLowerCase()
  const categories = byCount(recipes.flatMap((r) => r.categories ?? []))
  const cuisines = byCount(recipes.map((r) => r.cuisine))
  const collections = allCollections(recipes)
  const open = collections.find((c) => c.name.toLowerCase() === collection?.toLowerCase()) ?? null
  const timed = recipes.some((r) => totalMinutes(r))
  const rated = recipes.some((r) => averageRating(r))
  const cooked = recipes.some((r) => r.cooked?.length)
  const kcal = new Map(recipes.map((r) => [r.id, portionKcal(r, match)]))
  const counted = [...kcal.values()].some((k) => k != null)
  // What can be cooked from what is at home: recipes missing at most this many ingredients
  const home = new Map(pantry.length ? recipes.map((r) => [r.id, homeMatch(r, pantry, canonical)]) : [])
  const MISSING_OK = 2
  const filtered = !!(category || cuisine || maxTime || maxKcal || topRated || notCooked || fromHome)
  const clearFilters = () => (setCategory(null), setCuisine(null), setMaxTime(null), setMaxKcal(null), setTopRated(false), setNotCooked(false), setFromHome(false))
  const shown = recipes
    .filter(
      (r) =>
        matches(r, q) &&
        (!open || inCollection(r, open.name)) &&
        (!category || r.categories?.includes(category)) &&
        (!cuisine || r.cuisine === cuisine) &&
        (!maxTime || (totalMinutes(r) != null && totalMinutes(r) <= maxTime)) &&
        (!maxKcal || (kcal.get(r.id) != null && kcal.get(r.id) <= maxKcal)) &&
        (!topRated || averageRating(r) >= TOP_RATED) &&
        (!notCooked || !r.cooked?.length) &&
        (!fromHome || (home.get(r.id)?.total > 0 && home.get(r.id).missing.length <= MISSING_OK)),
    )
    .sort((a, b) => {
      const by = {
        az: () => (a.title || '').localeCompare(b.title || ''),
        quick: () => (totalMinutes(a) ?? 1e9) - (totalMinutes(b) ?? 1e9),
        light: () => (kcal.get(a.id) ?? 1e9) - (kcal.get(b.id) ?? 1e9),
        rated: () => (averageRating(b) ?? 0) - (averageRating(a) ?? 0),
        home: () => (home.get(a.id)?.missing.length ?? 1e9) - (home.get(b.id)?.missing.length ?? 1e9) || (home.get(b.id)?.have ?? 0) - (home.get(a.id)?.have ?? 0),
        lately: () => (lastCooked(a) ?? 0) - (lastCooked(b) ?? 0),
      }[sort]
      return by ? by() : 0
    })
  const showFilters = recipes.length > 1 && (categories.length || cuisines.length || timed || counted || rated || cooked || home.size)
  const quickFilters = [
    ...(timed ? TIMES.map((m) => [`t${m}`, `Under ${m} min`, maxTime === m, () => setMaxTime(maxTime === m ? null : m)]) : []),
    ...(counted ? KCALS.map((k) => [`k${k}`, `Under ${k} kcal`, maxKcal === k, () => setMaxKcal(maxKcal === k ? null : k)]) : []),
    ...(rated ? [['top', `${TOP_RATED}+ stars`, topRated, () => setTopRated(!topRated)]] : []),
    ...(cooked ? [['new', 'Not cooked yet', notCooked, () => setNotCooked(!notCooked)]] : []),
  ]
  return (
    <>
      {collections.length > 0 && (
        <div className="collection-tiles" role="group" aria-label="Collections">
          {collections.map((c) => {
            const on = open?.name === c.name
            return (
              <button key={c.name} className={`collection-tile${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setCollection(on ? null : c.name)}>
                <Icon name="folder" size={20} />
                <strong>{c.name}</strong>
                <span className="note">
                  {c.count} recipe{c.count === 1 ? '' : 's'}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {open && (
        <CollectionHead
          key={open.name}
          collection={open}
          onClose={() => setCollection(null)}
          onRename={
            onRenameCollection &&
            (async (from, to) => {
              const renamed = await onRenameCollection(from, to)
              if (renamed) setCollection(renamed)
            })
          }
        />
      )}
      {recipes.length > 4 && (
        <input className="search" type="search" placeholder="Search recipes, ingredients, categories" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}
      {showFilters ? (
        <div className="recipe-filters">
          <div className="aisle-chips">
            <button className={`chip-btn${!filtered ? ' on' : ''}`} onClick={clearFilters}>
              All
            </button>
            {home.size > 0 && (
              <button className={`chip-btn${fromHome ? ' on' : ''}`} aria-pressed={fromHome} onClick={() => (setFromHome(!fromHome), !fromHome && setSort('home'))}>
                Can cook now
              </button>
            )}
            {categories.map((c) => (
              <button key={c} className={`chip-btn${category === c ? ' on' : ''}`} aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
          {quickFilters.length > 0 && (
            <div className="aisle-chips" role="group" aria-label="Time, calories and rating">
              {quickFilters.map(([k, label, on, toggle]) => (
                <button key={k} className={`chip-btn${on ? ' on' : ''}`} aria-pressed={on} onClick={toggle}>
                  {label}
                </button>
              ))}
            </div>
          )}
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
            <Select className="sort-select" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              {[
                ['new', 'Newest'],
                ['az', 'A–Z'],
                ...(timed ? [['quick', 'Quickest']] : []),
                ...(counted ? [['light', 'Fewest kcal']] : []),
                ...(rated ? [['rated', 'Top rated']] : []),
                ...(home.size ? [['home', 'Most at home']] : []),
                ...(cooked ? [['lately', 'Not cooked lately']] : []),
              ].map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
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
                  <CardFacts recipe={r} home={home.get(r.id)} kcal={kcal.get(r.id)} />
                  {(r.cuisine || lastCooked(r) || PLATFORM[r.platform]) && (
                    <span className="card-sub">
                      {[r.cuisine, lastCooked(r) ? `Cooked ${cookedAgo(lastCooked(r))}` : PLATFORM[r.platform]].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {selection && <span className={`tick${picked ? ' on' : ''}`} aria-hidden="true">{picked ? <Icon name="check" size={16} strokeWidth={3} /> : null}</span>}
              </button>
              {picked && (
                <div className="card-portions">
                  <span className="note">Portions to buy for</span>
                  <div className="stepper small">
                    <button className="secondary round" aria-label="Fewer portions" disabled={portions <= 1} onClick={() => onSelect(r.id, portions - 1)}>
                      <Icon name="minus" />
                    </button>
                    <span className="count">{r.servings ? portions : `×${portions}`}</span>
                    <button className="secondary round" aria-label="More portions" onClick={() => onSelect(r.id, portions + 1)}>
                      <Icon name="plus" />
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
            <div className="empty-icon" aria-hidden="true">
              <Icon name="pot" size={44} />
            </div>
            <p>No recipes yet.</p>
            <p className="hint">Share a reel or a recipe page to the app, or use Import or + Add above.</p>
          </div>
        ))}
    </>
  )
}

import { useState } from 'react'
import { useCatalog } from './catalog.jsx'
import Stars from './Stars.jsx'
import { addToPlan, dayKey, dayLabel, planEntries, removeFromPlan, setPlanPortions, weekDays, weekStart } from './lib/plan.js'
import { homeMatch } from './lib/stock.js'
import { cookedAgo, lastCooked } from './lib/history.js'
import { averageRating } from './lib/ratings.js'
import Icon from './Icon.jsx'

/** Picking a recipe for a day: search, with what is at home and when it was last cooked. */
function PickSheet({ day, recipes, pantry, onPick, onClose }) {
  const { canonical } = useCatalog()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = recipes
    .filter((r) => !q || r.title?.toLowerCase().includes(q) || r.ingredients?.some((i) => i.name?.toLowerCase().includes(q)))
    .map((r) => ({ r, home: homeMatch(r, pantry, canonical) }))
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Plan a recipe for ${dayLabel(day)}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>{dayLabel(day)}</h2>
        <input className="search" type="search" placeholder="Search recipes" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="pick-list">
          {shown.map(({ r, home }) => (
            <li key={r.id}>
              <button className="link" onClick={() => onPick({ id: r.id, portions: r.servings ?? 1 })}>
                <span className="recipe-title">{r.title || 'Untitled recipe'}</span>
                <span className="note">
                  {[
                    home.total ? `${home.have}/${home.total} at home` : null,
                    lastCooked(r) ? `cooked ${cookedAgo(lastCooked(r))}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {averageRating(r) ? <Stars value={Math.round(averageRating(r))} size="small" /> : null}
                </span>
              </button>
            </li>
          ))}
          {!shown.length && <li className="hint">No recipes found.</li>}
        </ul>
        <div className="sheet-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The week's meals: recipes and portions per day, and one tap to put the
 * whole week on the shopping list.
 */
export default function PlanPage({ plan = {}, recipes, pantry, onChange, onShop, onOpen }) {
  const [offset, setOffset] = useState(0)
  const [picking, setPicking] = useState(null) // day key
  const [shopped, setShopped] = useState(null) // week start that was added to the list
  const start = weekStart(new Date(), offset)
  const days = weekDays(start)
  const today = dayKey(new Date())
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const entries = planEntries(plan, days, recipes)
  const planned = days.reduce((n, d) => n + (plan[d]?.length ?? 0), 0)
  const change = (next) => {
    setShopped(null)
    onChange(next)
  }

  return (
    <>
      <header className="main-header">
        <h1>Meal plan</h1>
      </header>
      <div className="week-nav">
        <button className="secondary round" aria-label="Previous week" onClick={() => setOffset(offset - 1)}>
          <Icon name="left" />
        </button>
        <button className="link" onClick={() => setOffset(0)} disabled={offset === 0}>
          {offset === 0 ? 'This week' : offset === 1 ? 'Next week' : offset === -1 ? 'Last week' : `${dayLabel(days[0])} – ${dayLabel(days[6])}`}
        </button>
        <button className="secondary round" aria-label="Next week" onClick={() => setOffset(offset + 1)}>
          <Icon name="right" />
        </button>
      </div>

      <ol className="plan-days">
        {days.map((day) => (
          <li key={day} className={`card plan-day${day === today ? ' today' : ''}${day < today ? ' past' : ''}`}>
            <div className="section-head">
              <h2>
                {dayLabel(day)}
                {day === today && <span className="badge">today</span>}
              </h2>
              <button className="small secondary" onClick={() => setPicking(day)}>
                <Icon name="plus" size={16} strokeWidth={2.5} /> Add
              </button>
            </div>
            {(plan[day] ?? []).map((e, n) => {
              const r = byId.get(e.id)
              return (
                <div key={n} className="plan-entry">
                  <button className="link plan-title" disabled={!r} onClick={() => onOpen(e.id)}>
                    {r ? r.title || 'Untitled recipe' : 'Deleted recipe'}
                  </button>
                  <div className="stepper small">
                    <button className="secondary round" aria-label="Fewer portions" disabled={e.portions <= 1} onClick={() => change(setPlanPortions(plan, day, n, e.portions - 1))}>
                      <Icon name="minus" />
                    </button>
                    <span className="count">
                      {r?.servings ? e.portions : `×${e.portions}`}
                      <span className="count-label">{r?.servings ? 'port.' : 'recipe'}</span>
                    </span>
                    <button className="secondary round" aria-label="More portions" onClick={() => change(setPlanPortions(plan, day, n, Math.min(99, e.portions + 1)))}>
                      <Icon name="plus" />
                    </button>
                  </div>
                  <button className="link remove" aria-label="Remove from the plan" onClick={() => change(removeFromPlan(plan, day, n))}>
                    <Icon name="close" />
                  </button>
                </div>
              )
            })}
          </li>
        ))}
      </ol>

      {planned > 0 && (
        <button className="big plan-shop" disabled={!entries.length} onClick={() => (onShop(entries), setShopped(start))}>
          {shopped === start ? <><Icon name="check" /> On the shopping list</> : <><Icon name="cart" /> {`Shop for this week (${entries.length} recipe${entries.length === 1 ? '' : 's'})`}</>}
        </button>
      )}
      {planned > 0 && <p className="hint">Recipes already on the list get this week&apos;s portions; the rest of the list stays.</p>}

      {picking && (
        <PickSheet
          day={picking}
          recipes={recipes}
          pantry={pantry}
          onClose={() => setPicking(null)}
          onPick={(entry) => {
            change(addToPlan(plan, picking, entry))
            setPicking(null)
          }}
        />
      )}
    </>
  )
}

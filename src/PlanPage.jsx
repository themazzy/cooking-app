import { useState } from 'react'
import { useCatalog } from './catalog.jsx'
import Stars from './Stars.jsx'
import { addToPlan, dayKey, dayLabel, planEntries, removeFromPlan, setPlanPortions, weekDays, weekStart } from './lib/plan.js'
import { homeMatch } from './lib/stock.js'
import { cookedAgo, lastCooked } from './lib/history.js'
import { averageRating } from './lib/ratings.js'
import { commonKeys, leftoverSuggestions, leftovers, planWeek } from './lib/suggest.js'
import Icon from './Icon.jsx'

/** Picking a recipe for a day: search, with what is at home and when it was last cooked. */
function PickSheet({ day, recipes, pantry, planned, onPick, onClose }) {
  const { canonical, match } = useCatalog()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  // Recipes that use up what the week's other meals leave, or what must be used soon
  const left = leftovers(planned, pantry, { canonical, match }, { common: commonKeys(recipes, canonical) })
  const suggested = q ? [] : leftoverSuggestions(recipes, left, canonical, { exclude: new Set(planned.map((r) => r.id)), limit: 4 })
  const shown = recipes
    .filter((r) => !q || r.title?.toLowerCase().includes(q) || r.ingredients?.some((i) => i.name?.toLowerCase().includes(q)))
    .map((r) => ({ r, home: homeMatch(r, pantry, canonical) }))
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Plan a recipe for ${dayLabel(day)}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>{dayLabel(day)}</h2>
        <input className="search" type="search" placeholder="Search recipes" value={query} onChange={(e) => setQuery(e.target.value)} />
        {suggested.length > 0 && (
          <>
            <h3 className="pick-head">Uses up leftovers</h3>
            <ul className="pick-list suggested">
              {suggested.map(({ recipe: r, uses }) => (
                <li key={r.id}>
                  <button className="link" onClick={() => onPick({ id: r.id, portions: r.servings ?? 1 })}>
                    <span className="recipe-title">{r.title || 'Untitled recipe'}</span>
                    <span className="note">
                      uses{' '}
                      {uses
                        .slice(0, 4)
                        .map((u) => `${u.name.toLowerCase()}${u.soon ? ' (use soon)' : ''}`)
                        .join(', ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="pick-head">All recipes</h3>
          </>
        )}
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
 * "Plan my week": a proposed recipe for each free day, which can be
 * reshuffled or dropped day by day before it goes on the plan.
 */
function PlanWeekSheet({ days, recipes, pantry, planned, onAdd, onClose }) {
  const { canonical, match } = useCatalog()
  const propose = (forDays, others = [], skip = new Set()) =>
    planWeek(
      forDays,
      recipes.filter((r) => !skip.has(r.id)),
      { planned: [...planned, ...others], pantry, canonical, match },
    )
  const [picks, setPicks] = useState(() => propose(days))
  // Another recipe for one day, keeping the other days' picks
  const reshuffle = (n) => {
    const others = picks.filter((_, i) => i !== n).map((p) => p.recipe)
    const [next] = propose([picks[n].day], others, new Set([picks[n].recipe.id]))
    if (next) setPicks(picks.map((p, i) => (i === n ? next : p)))
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Plan my week" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Plan my week</h2>
        <p className="hint top">From your saved recipes: well rated, not cooked lately, mostly in stock, and using up what the other days leave over.</p>
        {picks.length === 0 ? (
          <p className="hint">No recipes left to suggest. Recipes cooked in the last week, and desserts, drinks and sides, are not picked.</p>
        ) : (
          <ul className="week-picks">
            {picks.map((p, n) => (
              <li key={p.day}>
                <span className="day">{dayLabel(p.day)}</span>
                <span className="grow">
                  <span className="recipe-title">{p.recipe.title || 'Untitled recipe'}</span>
                  {p.why.length > 0 && <span className="note">{p.why.join(' · ')}</span>}
                </span>
                <button className="link" aria-label={`Another recipe for ${dayLabel(p.day)}`} onClick={() => reshuffle(n)}>
                  <Icon name="shuffle" size={18} />
                </button>
                <button className="link" aria-label={`Leave ${dayLabel(p.day)} free`} onClick={() => setPicks(picks.filter((_, i) => i !== n))}>
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="sheet-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="secondary" aria-label="Shuffle all days" onClick={() => setPicks(propose(days))}>
            <Icon name="shuffle" />
          </button>
          <button disabled={!picks.length} onClick={() => onAdd(picks)}>
            Add {picks.length} to the plan
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
  const [proposing, setProposing] = useState(false)
  const start = weekStart(new Date(), offset)
  const days = weekDays(start)
  const today = dayKey(new Date())
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const entries = planEntries(plan, days, recipes)
  const planned = days.reduce((n, d) => n + (plan[d]?.length ?? 0), 0)
  // The week's recipes, for leftovers; free days from today on get "Plan my week"
  const weekRecipes = [...new Set(days.flatMap((d) => (plan[d] ?? []).map((e) => e.id)))].map((id) => byId.get(id)).filter(Boolean)
  const freeDays = days.filter((d) => d >= today && !plan[d]?.length)
  const change = (next) => {
    setShopped(null)
    onChange(next)
  }

  return (
    <>
      <header className="main-header">
        <h1>Meal plan</h1>
        <div className="actions">
          <button className="small" disabled={!freeDays.length || !recipes.length} onClick={() => setProposing(true)}>
            <Icon name="wand" /> Plan my week
          </button>
        </div>
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
          planned={weekRecipes}
          onClose={() => setPicking(null)}
          onPick={(entry) => {
            change(addToPlan(plan, picking, entry))
            setPicking(null)
          }}
        />
      )}
      {proposing && (
        <PlanWeekSheet
          days={freeDays}
          recipes={recipes}
          pantry={pantry}
          planned={weekRecipes}
          onClose={() => setProposing(false)}
          onAdd={(picks) => {
            change(picks.reduce((next, p) => addToPlan(next, p.day, { id: p.recipe.id, portions: p.recipe.servings ?? 1 }), plan))
            setProposing(false)
          }}
        />
      )}
    </>
  )
}

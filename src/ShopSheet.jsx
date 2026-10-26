import { useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { scaleIngredients } from './lib/scale.js'
import { isOut } from './lib/stock.js'
import Icon from './Icon.jsx'

/**
 * Adding one recipe to the shopping list: every ingredient is ticked except
 * the ones at home, so you untick what you do not need and add the rest.
 */
export default function ShopSheet({ recipe, portions: startPortions, pantry, onAdd, onClose }) {
  const { match, canonical } = useCatalog()
  const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => canonical(p.name)))
  const [portions, setPortions] = useState(startPortions)
  const [skip, setSkip] = useState(() => new Set(recipe.ingredients.flatMap((i, n) => (atHome.has(canonical(i.name)) ? [n] : []))))
  const factor = recipe.servings ? portions / recipe.servings : portions
  const scaled = scaleIngredients(recipe.ingredients, factor)
  const real = scaled.map((i, n) => [i, n]).filter(([i]) => i.name?.trim())
  const count = real.filter(([, n]) => !skip.has(n)).length
  const toggle = (n) =>
    setSkip((s) => {
      const next = new Set(s)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Add to the shopping list" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Add to the shopping list</h2>
        <div className="servings">
          <span>Portions</span>
          <div className="stepper">
            <button className="secondary" aria-label="Fewer portions" disabled={portions <= 1} onClick={() => setPortions((n) => n - 1)}>
              <Icon name="minus" />
            </button>
            <span className="count">{recipe.servings ? portions : `×${portions}`}</span>
            <button className="secondary" aria-label="More portions" onClick={() => setPortions((n) => Math.min(99, n + 1))}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
        <p className="hint">Untick what you already have. Things you keep at home start unticked.</p>
        <ul className="shopping sheet-list">
          {real.map(([i, n]) => (
            <li key={n} className={skip.has(n) ? 'checked' : ''}>
              <label>
                <input type="checkbox" checked={!skip.has(n)} onChange={() => toggle(n)} />
                <IngredientIcon entry={match(i.name)} />
                <span>
                  {[i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ') && <strong>{[i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')} </strong>}
                  {i.name}
                  {atHome.has(canonical(i.name)) && <span className="badge">at home</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="sheet-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={!count} onClick={() => onAdd({ id: recipe.id, portions, skip: [...skip] })}>
            Add {count} item{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}

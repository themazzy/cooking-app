import { useRef, useState } from 'react'
import { emptyIngredient, joinSteps } from './lib/recipeEdit.js'
import { splitSteps } from './lib/cook.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import Icon from './Icon.jsx'
import { UnitSheet } from './UnitPicker.jsx'

/** Ingredients as editable rows and each step in its own box, in order. */
export default function RecipeEditor({ recipe, source, onChange, onReset }) {
  const { match } = useCatalog()
  const { ingredients, steps } = recipe

  const setIngredients = (next) => onChange({ ...recipe, ingredients: next })
  const update = (n, field, value) => setIngredients(ingredients.map((i, k) => (k === n ? { ...i, [field]: value } : i)))
  const remove = (n) => setIngredients(ingredients.filter((_, k) => k !== n))
  const insertAfter = (n) => {
    const next = [...ingredients]
    next.splice(n + 1, 0, emptyIngredient(ingredients[n]?.group ?? ''))
    setIngredients(next)
  }
  // The steps are kept as a list here and saved back as numbered text ("1. …\n2. …")
  const [unitFor, setUnitFor] = useState(null) // the ingredient row whose unit is being picked
  const [list, setList] = useState(() => withBlank(splitSteps(steps)))
  const saved = useRef(steps)
  if (steps !== saved.current) {
    // Changed from outside (re-read from source)
    saved.current = steps
    setList(withBlank(splitSteps(steps)))
  }
  const setSteps = (next) => {
    setList(next)
    saved.current = joinSteps(next)
    onChange({ ...recipe, steps: saved.current })
  }
  const setStep = (n, text) => setSteps(list.map((s, k) => (k === n ? text : s)))
  const move = (n, by) => {
    const next = [...list]
    ;[next[n], next[n + by]] = [next[n + by], next[n]]
    setSteps(next)
  }
  const removeStep = (n) => setSteps(withBlank(list.filter((_, k) => k !== n)))

  const renameGroup = (from, to) => setIngredients(ingredients.map((i) => (i.group === from ? { ...i, group: to } : i)))

  return (
    <div className="editor">
      <h3>Ingredients {source ? <span className="note">(from the {source})</span> : null}</h3>
      <>
        <div className="ingredients">
          {ingredients.length > 0 && (
            <div className="ing-row ing-head" aria-hidden="true">
              <span className="pic" />
              <span className="qty">Qty</span>
              <span className="unit">Unit</span>
              <span className="name">Ingredient</span>
              <span className="del" />
            </div>
          )}
          {ingredients.map((i, n) => (
            <div key={n}>
              {i.group && i.group !== ingredients[n - 1]?.group && (
                <input className="group" aria-label="Ingredient group" value={i.group} onChange={(e) => renameGroup(i.group, e.target.value)} />
              )}
              <div className="ing-row">
                <span className="pic">
                  <IngredientIcon entry={match(i.name)} size={22} />
                </span>
                <input className="qty" aria-label="Amount" inputMode="decimal" value={i.qty} onChange={(e) => update(n, 'qty', e.target.value)} />
                <button type="button" className={`unit unit-btn${i.unit ? '' : ' empty'}`} aria-label={`Unit: ${i.unit || 'none'}`} onClick={() => setUnitFor(n)}>
                  {i.unit || (i.qty.trim() ? 'pcs' : '–')}
                </button>
                <input className="name" aria-label="Ingredient" value={i.name} onChange={(e) => update(n, 'name', e.target.value)} />
                <button className="icon del" aria-label="Remove ingredient" onClick={() => remove(n)}>
                  <Icon name="close" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <button className="secondary" onClick={() => insertAfter(ingredients.length - 1)}>
            Add ingredient
          </button>
        </div>
      </>

      {unitFor != null && ingredients[unitFor] && (
        <UnitSheet
          recipe
          title={ingredients[unitFor].name.trim() ? `Unit for ${ingredients[unitFor].name.trim()}` : 'Unit'}
          value={ingredients[unitFor].unit}
          onPick={(u) => {
            update(unitFor, 'unit', u)
            setUnitFor(null)
          }}
          onClose={() => setUnitFor(null)}
        />
      )}

      <h3>Steps</h3>
      <ol className="step-edit">
        {list.map((text, n) => (
          <li key={n}>
            <div className="step-edit-head">
              <span className="step-no">{n + 1}</span>
              <span className="grow" />
              <button className="icon" aria-label="Move step up" disabled={n === 0} onClick={() => move(n, -1)}>
                <Icon name="up" />
              </button>
              <button className="icon" aria-label="Move step down" disabled={n === list.length - 1} onClick={() => move(n, 1)}>
                <Icon name="down" />
              </button>
              <button className="icon" aria-label="Remove step" onClick={() => removeStep(n)}>
                <Icon name="close" />
              </button>
            </div>
            <textarea rows={2} aria-label={`Step ${n + 1}`} placeholder={n === 0 ? 'What to do first' : 'Then…'} value={text} onChange={(e) => setStep(n, e.target.value)} />
          </li>
        ))}
      </ol>
      <div className="row">
        <button className="secondary" onClick={() => setSteps([...list, ''])}>
          <Icon name="plus" /> Add step
        </button>
      </div>
      <div className="row">
        <button className="secondary" onClick={onReset}>
          Re-read from source
        </button>
      </div>
    </div>
  )
}

/** At least one (empty) box to type the first step in. */
const withBlank = (list) => (list.length ? list : [''])

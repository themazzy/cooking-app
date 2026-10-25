import { useState } from 'react'
import { emptyIngredient, recipeToText } from './lib/recipeEdit.js'

/** Ingredients as editable rows and the steps as one text box, one step per line. */
export default function RecipeEditor({ recipe, title, source, scaled, onChange, onReset }) {
  const [copied, setCopied] = useState(false)
  const { ingredients, steps } = recipe

  const setIngredients = (next) => {
    setCopied(false)
    onChange({ ...recipe, ingredients: next })
  }
  const update = (n, field, value) => setIngredients(ingredients.map((i, k) => (k === n ? { ...i, [field]: value } : i)))
  const remove = (n) => setIngredients(ingredients.filter((_, k) => k !== n))
  const insertAfter = (n) => {
    const next = [...ingredients]
    next.splice(n + 1, 0, emptyIngredient(ingredients[n]?.group ?? ''))
    setIngredients(next)
  }
  const renameGroup = (from, to) => setIngredients(ingredients.map((i) => (i.group === from ? { ...i, group: to } : i)))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recipeToText(scaled ? { ...recipe, ingredients: scaled } : recipe, title))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="editor">
      <h3>Ingredients {source ? <span className="note">(from the {source})</span> : null}</h3>
      {scaled ? (
        // Scaled amounts are for reading; editing works on the original portions
        <ul className="scaled">
          {scaled.map((i, n) => (
            <li key={n}>
              {i.group && i.group !== scaled[n - 1]?.group && <div className="group-title">{i.group}</div>}
              <span className="qty">{[i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')}</span> {i.name}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="ingredients">
            {ingredients.map((i, n) => (
              <div key={n}>
                {i.group && i.group !== ingredients[n - 1]?.group && (
                  <input
                    className="group"
                    aria-label="Ingredient group"
                    value={i.group}
                    onChange={(e) => renameGroup(i.group, e.target.value)}
                  />
                )}
                <div className="ing-row">
                  <input className="qty" aria-label="Amount" inputMode="decimal" value={i.qty} onChange={(e) => update(n, 'qty', e.target.value)} />
                  <input className="unit" aria-label="Unit" value={i.unit} onChange={(e) => update(n, 'unit', e.target.value)} />
                  <input className="name" aria-label="Ingredient" value={i.name} onChange={(e) => update(n, 'name', e.target.value)} />
                  <button className="icon" aria-label="Remove ingredient" onClick={() => remove(n)}>
                    ×
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
      )}

      <h3>Steps</h3>
      <textarea
        rows={Math.max(6, steps.split('\n').length + 1)}
        placeholder="One step per line"
        value={steps}
        onChange={(e) => {
          setCopied(false)
          onChange({ ...recipe, steps: e.target.value })
        }}
      />
      <div className="row">
        <button onClick={copy}>{copied ? 'Copied' : 'Copy recipe'}</button>
        <button className="secondary" onClick={onReset}>
          Re-read from source
        </button>
      </div>
    </div>
  )
}

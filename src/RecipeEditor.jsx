import { emptyIngredient } from './lib/recipeEdit.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'

/** Ingredients as editable rows and the steps as one text box, one step per line. */
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
                <input className="unit" aria-label="Unit" value={i.unit} onChange={(e) => update(n, 'unit', e.target.value)} />
                <input className="name" aria-label="Ingredient" value={i.name} onChange={(e) => update(n, 'name', e.target.value)} />
                <button className="icon del" aria-label="Remove ingredient" onClick={() => remove(n)}>
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

      <h3>Steps</h3>
      <textarea
        rows={Math.max(6, steps.split('\n').length + 1)}
        placeholder="One step per line"
        value={steps}
        onChange={(e) => onChange({ ...recipe, steps: e.target.value })}
      />
      <div className="row">
        <button className="secondary" onClick={onReset}>
          Re-read from source
        </button>
      </div>
    </div>
  )
}

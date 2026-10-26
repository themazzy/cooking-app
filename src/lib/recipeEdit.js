import { splitSteps } from './cook.js'
import { tidyIngredient } from './ingredients.js'

// Editable form of a parsed recipe. Quantities stay text while editing so
// "1–2" or "½" can be typed; scaling and shopping lists parse them later.

const num = (x) => String(Math.round(x * 100) / 100).replace('.', ',')

export const fmtQty = (i) => {
  if (i.quantity == null) return ''
  return i.quantityMax != null ? `${num(i.quantity)}–${num(i.quantityMax)}` : num(i.quantity)
}

export const emptyIngredient = (group = '') => ({ qty: '', unit: '', name: '', group })

/** { ingredients: [{ qty, unit, name, group }], steps } from pickRecipe output. */
export function toEditable(parsed) {
  return {
    ingredients: (parsed?.ingredients ?? []).map((i) =>
      tidyIngredient({
        qty: fmtQty(i),
        unit: i.unit ?? '',
        name: i.note ? `${i.name}, ${i.note}` : i.name,
        group: i.group ?? '',
      }),
    ),
    steps: (parsed?.steps ?? []).join('\n'),
  }
}

/** Steps from the editor's boxes as stored text: "1. Chop.\n2. Fry." (empty boxes left out, line breaks inside a step kept). */
export const joinSteps = (list) =>
  list
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, n) => `${n + 1}. ${s}`)
    .join('\n')

/** Plain text for sharing or pasting elsewhere. */
export function recipeToText(recipe, title) {
  const lines = []
  if (title) lines.push(title, '')
  let group = ''
  for (const i of recipe.ingredients) {
    if (!i.name.trim() && !i.qty.trim()) continue
    if (i.group !== group) {
      group = i.group
      if (group) lines.push('', `${group}:`)
    }
    lines.push(`• ${[i.qty, i.unit, i.name].map((s) => s.trim()).filter(Boolean).join(' ')}`)
  }
  const steps = splitSteps(recipe.steps)
  if (steps.length) {
    lines.push('', 'Steps:')
    steps.forEach((s, n) => lines.push(`${n + 1}. ${s}`))
  }
  return lines.join('\n').trim()
}

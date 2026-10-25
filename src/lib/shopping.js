import { buildShoppingList } from './scale.js'

// The shopping list is rebuilt from its recipes whenever one is added, so
// amounts of the same ingredient keep adding up. Ticks and extras stay.

/** [{ id, portions, skip }] from the list plus saved recipes → parts for buildShoppingList. */
export function partsFor(entries, recipes) {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  return entries
    .map((e) => {
      const recipe = byId.get(e.id)
      if (!recipe) return null
      const skip = new Set(e.skip ?? [])
      return {
        recipe: { ...recipe, ingredients: (recipe.ingredients ?? []).filter((_, k) => !skip.has(k)) },
        factor: recipe.servings ? e.portions / recipe.servings : e.portions,
        entry: { id: recipe.id, title: recipe.title, servings: recipe.servings, portions: e.portions, skip: [...skip] },
      }
    })
    .filter(Boolean)
}

/** The list for these recipes, keeping what was ticked or added by hand on `previous`. */
export function makeList(entries, recipes, match, previous = null) {
  const parts = partsFor(entries, recipes)
  const ticked = new Set((previous?.items ?? []).filter((i) => i.checked).map((i) => i.key))
  const extras = (previous?.items ?? []).filter((i) => String(i.key).startsWith('extra-'))
  return {
    createdAt: previous?.createdAt ?? Date.now(),
    recipes: parts.map((p) => p.entry),
    items: [...buildShoppingList(parts, match).map((i) => ({ ...i, checked: ticked.has(i.key) })), ...extras],
  }
}

/** Adds a recipe to the list, or changes its portions when it is already there. */
export function addToList(previous, entry, recipes, match) {
  const others = (previous?.recipes ?? []).filter((r) => r.id !== entry.id)
  return makeList([...others, entry], recipes, match, previous)
}

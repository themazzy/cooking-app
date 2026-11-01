import { buildShoppingList, shopKey, sumRow } from './scale.js'
import { parseIngredientLine } from './ingredients.js'
import { formatAmount } from './scale.js'

// The shopping list is rebuilt from its recipes whenever one is added, so
// amounts of the same ingredient keep adding up. Ticks, extras and amounts
// changed by hand stay; items removed from the list stay removed (their
// recipe lines are skipped), so adding another recipe does not bring back
// what was already bought.

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

const sameAmount = (a, b) => String(a?.qty ?? '') === String(b?.qty ?? '') && String(a?.unit ?? '') === String(b?.unit ?? '')

/** The list for these recipes, keeping what was ticked, added or changed by hand on `previous`. */
export function makeList(entries, recipes, match, previous = null) {
  const parts = partsFor(entries, recipes)
  const before = new Map((previous?.items ?? []).map((i) => [i.key, i]))
  const extras = (previous?.items ?? []).filter((i) => /^(extra|stock)-/.test(String(i.key)))
  const items = buildShoppingList(parts, match).map((i) => {
    const old = before.get(i.key)
    const item = { ...i, checked: !!old?.checked }
    // An amount set by hand stays while the recipes still ask for what they did then
    if (old?.own && sameAmount(old.own.was, i)) return { ...item, qty: old.own.qty, unit: old.own.unit, own: old.own }
    return item
  })
  return {
    ...(previous ?? {}),
    createdAt: previous?.createdAt ?? Date.now(),
    recipes: parts.map((p) => p.entry),
    items: [...items, ...extras],
  }
}

/** Adds a recipe to the list, or changes its portions when it is already there. */
export function addToList(previous, entry, recipes, match) {
  const others = (previous?.recipes ?? []).filter((r) => r.id !== entry.id)
  return makeList([...others, entry], recipes, match, previous)
}

/**
 * The list without these items. Recipe items are left out of their recipes
 * (skip), so they don't come back when the list is rebuilt; staples stay
 * away (`snoozed`) until they are restocked.
 */
export function removeItems(list, keys, recipes, match) {
  const gone = new Set(keys)
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const fromRecipes = new Set((list.items ?? []).filter((i) => gone.has(i.key) && !/^(extra|stock)-/.test(String(i.key))).map((i) => i.key))
  const staples = (list.items ?? []).filter((i) => gone.has(i.key) && String(i.key).startsWith('stock-')).map((i) => i.key)
  return {
    ...list,
    recipes: (list.recipes ?? []).map((r) => {
      if (!fromRecipes.size) return r
      const lines = byId.get(r.id)?.ingredients ?? []
      const skip = new Set(r.skip ?? [])
      lines.forEach((ing, n) => {
        const row = sumRow(ing)
        if (row && fromRecipes.has(shopKey(row.name, match))) skip.add(n)
      })
      return skip.size === (r.skip ?? []).length ? r : { ...r, skip: [...skip].sort((a, b) => a - b) }
    }),
    items: (list.items ?? []).filter((i) => !gone.has(i.key)),
    ...(staples.length ? { snoozed: [...new Set([...(list.snoozed ?? []), ...staples])] } : {}),
  }
}

/**
 * The list with one item changed by hand: { name, qty, unit }. A recipe
 * item remembers what the recipes asked for, so the change holds until a
 * recipe changes the amount again; the name only changes on extras.
 */
export function editItem(list, key, { name, qty = '', unit = '' }, match) {
  return {
    ...list,
    items: (list.items ?? []).map((i) => {
      if (i.key !== key) return i
      if (String(key).startsWith('extra-')) {
        const text = String(name ?? i.name).trim() || i.name
        return { ...i, name: text, aisle: match?.(text)?.aisle ?? i.aisle ?? 'Other', qty, unit }
      }
      if (sameAmount(i, { qty, unit })) return i
      const was = i.own?.was ?? { qty: i.qty ?? '', unit: i.unit ?? '' }
      return sameAmount(was, { qty, unit }) ? (({ own: _o, ...rest }) => ({ ...rest, qty, unit }))(i) : { ...i, qty, unit, own: { qty, unit, was } }
    }),
  }
}

/** A typed extra ("500 g mince", "2 lemons", "bread") as a list item. */
export function extraItem(text, match, now = Date.now()) {
  const typed = String(text ?? '').trim()
  const line = parseIngredientLine(typed)
  const amount = line?.quantity != null
  const name = amount && line.name ? line.name : typed
  const qty = amount ? (line.quantityMax != null ? `${formatAmount(line.quantity, line.unit ?? '')}–${formatAmount(line.quantityMax, line.unit ?? '')}` : formatAmount(line.quantity, line.unit ?? '')) : ''
  const entry = match?.(name)
  return {
    key: `extra-${now}`,
    name: entry?.name ?? name.charAt(0).toUpperCase() + name.slice(1),
    aisle: entry?.aisle ?? 'Other',
    qty,
    unit: amount ? (line.unit ?? '') : '',
    extra: [],
    from: [],
    checked: false,
  }
}

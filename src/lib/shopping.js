import { buildShoppingList, shopKey, sumRow } from './scale.js'
import { parseIngredientLine } from './ingredients.js'
import { formatAmount } from './scale.js'
import { addTo, parseStock } from './stock.js'

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

const amountOf = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')

/**
 * Adds a typed extra, joining it to a line of the same ingredient still to
 * buy: "200 g butter" on 2 tbsp of butter from a recipe becomes one line.
 * Returns { list, joined } where joined is the name of the line it went to.
 */
export function addExtra(list, text, match, now = Date.now()) {
  const item = extraItem(text, match, now)
  const key = shopKey(item.name, match)
  const same = (list.items ?? []).find((i) => !i.checked && shopKey(i.name, match) === key)
  if (!same) return { list: { ...list, items: [...(list.items ?? []), item] }, joined: null }
  const typed = amountOf(item)
  // Nothing more to add: it is on the list already
  if (!typed) return { list, joined: same.name }
  const have = parseStock(amountOf(same))
  const add = parseStock(typed)
  let qty
  let unit
  if (!amountOf(same)) ({ qty, unit } = item)
  else if (have && add && have.base === add.base) {
    const m = addTo(amountOf(same), item.qty, item.unit).match(/^(\S+)\s*(.*)$/)
    qty = m[1]
    unit = m[2]
  } else return { list: { ...list, items: [...(list.items ?? []), item] }, joined: null }
  return { list: editItem(list, same.key, { name: same.name, qty, unit }, match), joined: same.name }
}

/** Counts bought items by name (lowercase) for the quick-add row. */
export function countBought(list, items) {
  const often = { ...(list.often ?? {}) }
  for (const i of items) {
    const n = String(i.name ?? '').trim().toLowerCase()
    if (n) often[n] = (often[n] ?? 0) + 1
  }
  return { ...list, often }
}

/**
 * Names for the quick-add row: staples, then what is bought most often,
 * leaving out what is already on the list to buy.
 */
export function quickAdds(list, staples = [], match = null, max = 8) {
  const onList = new Set((list?.items ?? []).filter((i) => !i.checked).map((i) => shopKey(i.name, match)))
  const out = []
  const seen = new Set()
  const push = (name) => {
    const k = shopKey(name, match)
    if (!name || seen.has(k) || onList.has(k) || (list?.hidden ?? []).includes(k)) return
    seen.add(k)
    out.push(match?.(name)?.name ?? name.charAt(0).toUpperCase() + name.slice(1))
  }
  const often = Object.entries(list?.often ?? {})
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
  for (const name of [...staples, ...often]) if (out.length < max) push(name)
  return out
}

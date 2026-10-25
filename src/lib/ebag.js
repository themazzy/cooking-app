import { BULGARIAN } from '../data/bulgarian.js'

// Shopping on eBag.bg: each list item links to eBag's search for it, in
// Bulgarian. There is no public eBag API, so this is a link, not a cart.

export const EBAG_SEARCH = 'https://www.ebag.bg/search/?products%5Bquery%5D={q}'

/**
 * The Bulgarian search word for a list item: from the catalog entry, then the
 * entry it counts as, else the item's own name (local brands are typed as
 * they are sold). '' means nothing to buy (water).
 */
export function ebagQuery(name, entry) {
  for (const key of [entry?.name, entry?.base]) {
    if (!key) continue
    const bg = BULGARIAN.get(key.toLowerCase())
    if (bg != null) return bg
  }
  if (entry?.household_id) return entry.name
  return String(name ?? '')
    .split(/[,(]/)[0]
    .trim()
}

export const ebagUrl = (query, template = EBAG_SEARCH) => template.replace('{q}', encodeURIComponent(query))

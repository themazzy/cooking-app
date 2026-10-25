import { DESKTOP_UA, getText } from '../http.js'
import { decodeEntities, htmlToText, metaContent } from './html.js'

const isType = (node, type) => [].concat(node?.['@type'] ?? []).some((t) => String(t).toLowerCase() === type)

/** schema.org Recipe object from the page's JSON-LD blocks, or null. */
export function findRecipeJsonLd(html) {
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 8) return null
    if (Array.isArray(node)) {
      for (const n of node) {
        const found = visit(n, depth + 1)
        if (found) return found
      }
      return null
    }
    if (isType(node, 'recipe')) return node
    return visit(node['@graph'], depth + 1) ?? visit(node.mainEntity, depth + 1)
  }
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const found = visit(JSON.parse(m[1].trim()))
      if (found) return found
    } catch {
      // some sites ship broken JSON-LD; try the next block
    }
  }
  return null
}

const clean = (s) => decodeEntities(htmlToText(String(s ?? ''))).replace(/\s+/g, ' ').trim()

/** Steps from recipeInstructions: a string, HowToSteps, or HowToSections of steps. */
function instructionLines(value) {
  if (!value) return []
  if (typeof value === 'string') return htmlToText(value).split('\n').map((s) => s.trim()).filter(Boolean)
  if (Array.isArray(value)) return value.flatMap(instructionLines)
  if (isType(value, 'howtosection')) {
    const steps = instructionLines(value.itemListElement)
    return value.name ? [`${clean(value.name)}:`, ...steps] : steps
  }
  const text = clean(value.text ?? value.name ?? '')
  return text ? [text] : []
}

/**
 * The recipe written out as text with "Ingredients:" and "Instructions:"
 * headers, so the same parser reads it as a reel caption.
 */
export function recipeJsonLdToText(recipe, groups = []) {
  const lines = []
  const name = clean(recipe.name)
  if (name) lines.push(name)
  const yieldText = [].concat(recipe.recipeYield ?? [])[0]
  if (yieldText) lines.push(`(${clean(yieldText)})`)
  const ingredients = [].concat(recipe.recipeIngredient ?? recipe.ingredients ?? []).map(clean).filter(Boolean)
  if (groups.length) {
    // The page's groups ("Dough:", "Topping:") become sub-headings the parser keeps.
    // JSON-LD lines are tidier, so use them when they line up with the page's list.
    const lineUp = groups.reduce((n, g) => n + g.items.length, 0) === ingredients.length
    let n = 0
    lines.push('', 'Ingredients:')
    for (const g of groups) {
      if (g.name) lines.push('', `${g.name}:`)
      for (const item of g.items) lines.push(`- ${lineUp ? ingredients[n++] : item}`)
    }
  } else if (ingredients.length) lines.push('', 'Ingredients:', ...ingredients.map((i) => `- ${i}`))
  const steps = instructionLines(recipe.recipeInstructions)
  if (steps.length) lines.push('', 'Instructions:', ...steps)
  return lines.join('\n').trim()
}

/** First picture URL of a schema.org image: a string, an ImageObject or a list of either. */
export function jsonLdImage(image) {
  for (const i of [].concat(image ?? [])) {
    const url = typeof i === 'string' ? i : (i?.url ?? i?.contentUrl)
    if (typeof url === 'string' && url.trim()) return url.trim()
  }
  return null
}

// Where recipe plugins put the ingredient list (WP Recipe Maker, Tasty, Create, generic themes)
const INGREDIENT_BOXES = ['.wprm-recipe-ingredients-container', '.tasty-recipes-ingredients', '.mv-create-ingredients', '[class*="recipe-ingredients"]', '[class*="ingredients"]']
const GROUP_HEADINGS = 'h2, h3, h4, h5, h6, .wprm-recipe-group-name, p > strong:only-child, p > b:only-child, li'

/**
 * Ingredient groups as the page shows them ([{ name, items }]); schema.org
 * has no place for them, so they only exist in the HTML. Empty when the
 * list is not split into at least two named parts.
 */
export function ingredientGroups(html) {
  if (typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const selector of INGREDIENT_BOXES) {
    for (const box of doc.querySelectorAll(selector)) {
      const groups = []
      let current = null
      // Some engines return a selector list grouped by selector, not in page order
      const found = [...box.querySelectorAll(GROUP_HEADINGS)].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      for (const el of found) {
        if (el.tagName === 'LI') {
          if (el.querySelector('li')) continue
          const text = clean(el.textContent)
          if (!text) continue
          if (!current) groups.push((current = { name: '', items: [] }))
          current.items.push(text)
        } else if (!el.closest('li')) {
          const name = clean(el.textContent).replace(/:$/, '')
          if (name && !/^ingredients?$/i.test(name)) groups.push((current = { name, items: [] }))
        }
      }
      const filled = groups.filter((g) => g.items.length)
      if (filled.length >= 2 && filled.filter((g) => g.name).length >= filled.length - 1) return filled
    }
  }
  return []
}

export function parseRecipePage(html) {
  const recipe = findRecipeJsonLd(html)
  if (recipe) {
    const author = [].concat(recipe.author ?? [])[0]
    return {
      description: recipeJsonLdToText(recipe, ingredientGroups(html)),
      author: (typeof author === 'string' ? author : author?.name) || metaContent(html, 'og:site_name') || null,
      image: jsonLdImage(recipe.image) ?? metaContent(html, 'og:image'),
      structured: true,
    }
  }
  // No structured data: hand the page's main text to the parser
  const body = html.match(/<(article|main)\b[\s\S]*?<\/\1>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? ''
  const text = htmlToText(body.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ''))
  return {
    description: text ? text.slice(0, 20000) : metaContent(html, 'og:description'),
    author: metaContent(html, 'og:site_name'),
    image: metaContent(html, 'og:image'),
    structured: false,
  }
}

export async function fetchWebRecipe(url) {
  const page = await getText(url, { ua: DESKTOP_UA })
  const parsed = parseRecipePage(page.text)
  if (!parsed.description) throw new Error('Could not find a recipe on this page.')
  let image = null
  try {
    // Pages often give the picture relative to themselves; plain http would be blocked in the app
    if (parsed.image) image = new URL(parsed.image, page.url).href.replace(/^http:/, 'https:')
  } catch {
    image = null
  }
  return { platform: 'web', url: page.url, ...parsed, image, author: parsed.author || new URL(page.url).hostname, videoUrl: null, comments: [] }
}

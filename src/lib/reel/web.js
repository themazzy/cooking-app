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
export function recipeJsonLdToText(recipe) {
  const lines = []
  const name = clean(recipe.name)
  if (name) lines.push(name)
  const yieldText = [].concat(recipe.recipeYield ?? [])[0]
  if (yieldText) lines.push(`(${clean(yieldText)})`)
  const ingredients = [].concat(recipe.recipeIngredient ?? recipe.ingredients ?? []).map(clean).filter(Boolean)
  if (ingredients.length) lines.push('', 'Ingredients:', ...ingredients.map((i) => `- ${i}`))
  const steps = instructionLines(recipe.recipeInstructions)
  if (steps.length) lines.push('', 'Instructions:', ...steps)
  return lines.join('\n').trim()
}

export function parseRecipePage(html) {
  const recipe = findRecipeJsonLd(html)
  if (recipe) {
    const author = [].concat(recipe.author ?? [])[0]
    return {
      description: recipeJsonLdToText(recipe),
      author: (typeof author === 'string' ? author : author?.name) || metaContent(html, 'og:site_name') || null,
      structured: true,
    }
  }
  // No structured data: hand the page's main text to the parser
  const body = html.match(/<(article|main)\b[\s\S]*?<\/\1>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? ''
  const text = htmlToText(body.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ''))
  return {
    description: text ? text.slice(0, 20000) : metaContent(html, 'og:description'),
    author: metaContent(html, 'og:site_name'),
    structured: false,
  }
}

export async function fetchWebRecipe(url) {
  const page = await getText(url, { ua: DESKTOP_UA })
  const parsed = parseRecipePage(page.text)
  if (!parsed.description) throw new Error('Could not find a recipe on this page.')
  return { platform: 'web', url: page.url, ...parsed, author: parsed.author || new URL(page.url).hostname, videoUrl: null, comments: [] }
}

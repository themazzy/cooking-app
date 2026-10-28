import { DESKTOP_UA, FetchError, getText } from '../http.js'
import { runInPage } from '../pageReader.js'
import { decodeEntities, htmlToText, metaContent } from './html.js'
import { categoriesFrom, cuisineFrom, detectServings, durationMinutes, servingsFrom } from '../recipeMeta.js'
import { tagsFromSchema } from '../recipeTags.js'
import { recipeFromPage, recipePart } from './pageRecipe.js'
import { sectionHeading } from '../ingredients.js'

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
    // Some sites put raw line breaks inside the strings, which JSON.parse refuses
    for (const raw of [m[1].trim(), m[1].trim().replace(/[\u0000-\u001f]+/g, ' ')]) {
      try {
        const found = visit(JSON.parse(raw))
        if (found) return found
        break
      } catch {
        // broken JSON-LD; try it without control characters, then the next block
      }
    }
  }
  return null
}

const clean = (s) => decodeEntities(htmlToText(String(s ?? ''))).replace(/\s+/g, ' ').trim()

/** Steps from recipeInstructions: a string, HowToSteps, or HowToSections of steps. */
// A shop's note in place of the method: "Našli jste v receptu chybu? Napište nám…"
const NOT_A_STEP = /^(?:našli jste v receptu chybu|našli ste v recepte chybu|found (?:a mistake|an error) in (?:this|the) recipe)/i

function instructionLines(value) {
  if (!value) return []
  if (typeof value === 'string') return htmlToText(value).split('\n').map((s) => s.trim()).filter((s) => s && !NOT_A_STEP.test(s))
  if (Array.isArray(value)) return value.flatMap(instructionLines)
  if (isType(value, 'howtosection')) {
    const steps = instructionLines(value.itemListElement)
    return value.name ? [`${clean(value.name)}:`, ...steps] : steps
  }
  const text = clean(value.text ?? value.name ?? '')
  return text && !NOT_A_STEP.test(text) ? [text] : []
}

/**
 * The recipe written out as text with "Ingredients:" and "Instructions:"
 * headers, so the same parser reads it as a reel caption.
 */
export function recipeJsonLdToText(recipe, groups = [], pageSteps = []) {
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
  // Some shops leave recipeInstructions empty and write the method only on the page
  const own = instructionLines(recipe.recipeInstructions)
  const steps = own.length ? own : pageSteps
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
/** Text a reader sees: without screen-reader labels ("Completed step") and tick buttons. */
const ownText = (el) => {
  const copy = el.cloneNode(true)
  for (const hidden of copy.querySelectorAll('.screen-reader-text, .sr-only, .visually-hidden, button, input, label, script')) hidden.remove()
  return copy.textContent
}

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
          const text = clean(ownText(el))
          if (!text) continue
          if (!current) groups.push((current = { name: '', items: [] }))
          current.items.push(text)
        } else if (!el.closest('li')) {
          const name = clean(el.textContent).replace(/:$/, '')
          // "Ingredients", or Weber's "the Přísady", is the list's title, not a group
          if (name && sectionHeading(name.replace(/^the\s+/i, '')) !== 'ingredients') groups.push((current = { name, items: [] }))
        }
      }
      const filled = groups.filter((g) => g.items.length)
      if (filled.length >= 2 && filled.filter((g) => g.name).length >= filled.length - 1) return filled
    }
  }
  return []
}

/** Portions, times (minutes), categories and cuisine of a schema.org Recipe. */
export function recipeJsonLdMeta(recipe) {
  return {
    servings: servingsFrom(recipe.recipeYield ?? recipe.yield ?? recipe.servings),
    prepMin: durationMinutes(recipe.prepTime),
    cookMin: durationMinutes(recipe.cookTime ?? recipe.performTime),
    totalMin: durationMinutes(recipe.totalTime),
    categories: categoriesFrom(recipe.recipeCategory),
    cuisine: cuisineFrom(recipe.recipeCuisine),
    tags: tagsFromSchema(recipe),
  }
}

/** Portions from microdata (itemprop="recipeYield") or a recipe plugin's servings box, or null. */
export function microdataServings(html) {
  const tag = html.match(/<[^>]+itemprop=["']recipeYield["'][^>]*>/i)?.[0]
  if (tag) {
    const content = tag.match(/content=(["'])([\s\S]*?)\1/i)?.[2]
    const inner = html.slice(html.indexOf(tag) + tag.length).match(/^([\s\S]{0,200}?)<\//)?.[1]
    const n = servingsFrom(content ? decodeEntities(content) : clean(inner))
    if (n) return n
  }
  // WP Recipe Maker, Tasty, Create
  const box = html.match(/class=["'][^"']*(?:wprm-recipe-servings|tasty-recipes-yield|mv-create-yield)[^"']*["'][^>]*>([\s\S]{0,200}?)<\/(?:span|div|li)/i)?.[1]
  return box ? servingsFrom(clean(box)) : null
}

/**
 * `site`: what a site gives outside its page ({ steps, totalMin }, see albertRecipe);
 * its steps fill an empty method and its time replaces the page's times.
 */
export function parseRecipePage(html, site = null) {
  const recipe = findRecipeJsonLd(html)
  if (recipe) {
    const author = [].concat(recipe.author ?? [])[0]
    const meta = recipeJsonLdMeta(recipe)
    meta.servings ??= microdataServings(html)
    if (site && 'totalMin' in site) Object.assign(meta, { prepMin: null, cookMin: null, totalMin: site.totalMin })
    const pageSteps = instructionLines(recipe.recipeInstructions).length ? [] : site?.steps?.length ? site.steps : recipeFromPage(html)?.steps ?? []
    return {
      description: recipeJsonLdToText(recipe, ingredientGroups(html), pageSteps),
      author: (typeof author === 'string' ? author : author?.name) || metaContent(html, 'og:site_name') || null,
      image: jsonLdImage(recipe.image) ?? metaContent(html, 'og:image'),
      meta,
      structured: true,
    }
  }
  // No structured data: read the recipe from the page's lists and headings
  const page = recipeFromPage(html)
  if (page) {
    return {
      description: page.text,
      author: metaContent(html, 'og:site_name'),
      image: metaContent(html, 'og:image'),
      meta: {
        servings: microdataServings(html) ?? page.servings,
        prepMin: page.prepMin,
        cookMin: page.cookMin,
        totalMin: page.totalMin,
      },
      structured: false,
    }
  }
  // No list of ingredients found: hand the page's main text to the parser
  const body = html.match(/<(article|main)\b[\s\S]*?<\/\1>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? ''
  const text = recipePart(htmlToText(body.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, '')))
  return {
    description: text ? text.slice(0, 20000) : metaContent(html, 'og:description'),
    author: metaContent(html, 'og:site_name'),
    image: metaContent(html, 'og:image'),
    meta: { servings: microdataServings(html) ?? detectServings(text) },
    structured: false,
  }
}

/** A bot check (Cloudflare "Just a moment…", a captcha) instead of the page. */
export const isBotWall = (html) =>
  !/application\/ld\+json/i.test(html) && /<title>\s*(?:just a moment|attention required|access denied|one more step)|challenges\.cloudflare\.com|cf-browser-verification|g-recaptcha|hcaptcha/i.test(html)

// Runs inside the page (sent as source text): waits until the bot check has
// let the browser through and the page is there, then hands back its HTML.
function pageHtmlInPage({ waitMs }) {
  const started = Date.now()
  const ready = () =>
    document.querySelector('script[type="application/ld+json"]') ||
    (!/just a moment|attention required|one more step/i.test(document.title) && (document.body?.innerText ?? '').length > 2000)
  const tick = () => {
    if (ready() || Date.now() - started > waitMs) {
      window.__cookingResult = { html: document.documentElement.outerHTML, url: location.href }
    } else setTimeout(tick, 500)
  }
  tick()
}

/**
 * The page's HTML. Sites behind Cloudflare and similar answer plain HTTP with
 * a bot check (403); a real browser engine passes it, so try that next.
 */
async function loadPage(url) {
  const page = await getText(url, { ua: DESKTOP_UA, allowError: true })
  if (page.status < 400 && !isBotWall(page.text)) return page
  const r = await runInPage(url, pageHtmlInPage, { waitMs: 25000 }, { timeoutMs: 32000, reinject: true }).catch(() => null)
  if (r?.html && !isBotWall(r.html)) return { text: r.html, url: r.url || page.url, status: 200 }
  const host = new URL(url).hostname
  throw new FetchError(`${host} blocks apps with a bot check. Open the page in the browser and copy the recipe into "Or paste a recipe text".`, page.status)
}

// albert.cz sends the method to the browser through its GraphQL API, not in the page, and its
// JSON-LD says 2 hours for every recipe; the real time is a range like "16-30 minut".
const ALBERT_PAGE = /^https?:\/\/(?:www\.)?albert\.cz\/.*\/r\/([A-Za-z0-9]+)\/?(?:[?#]|$)/i
const ALBERT_QUERY =
  'query getRecipe($code:String!$lang:String!){getRecipe(code:$code lang:$lang){preparationTimeName recipeCookingSteps{description stepNumber}}}'

/** Minutes of Albert's time label ("16-30 minut", "Do 15 minut", "Více než 120 minut"), at its upper end. */
const albertMinutes = (label) => {
  const s = String(label ?? '').trim()
  return durationMinutes(s) ?? (Number(s.match(/(\d+)\s*min/i)?.[1]) || null)
}

/** Steps and time from Albert's getRecipe answer, or null. */
export function albertRecipe(json) {
  const r = json?.data?.getRecipe
  if (!r) return null
  const steps = [...(r.recipeCookingSteps ?? [])]
    .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0))
    .map((step) => clean(step.description))
    .filter(Boolean)
  return { steps, totalMin: albertMinutes(r.preparationTimeName) }
}

/** What albert.cz gives outside the page; without the API, at least the time the page shows. */
async function albertExtra(url, html) {
  const code = url.match(ALBERT_PAGE)?.[1]
  if (!code) return null
  const fromPage = { steps: [], totalMin: albertMinutes(html.match(/"preparationTimeName":"([^"]*)"/)?.[1]) }
  try {
    const query = new URLSearchParams({ operationName: 'getRecipe', query: ALBERT_QUERY, variables: JSON.stringify({ code, lang: 'cs' }) })
    const r = await getText(`https://www.albert.cz/api/v1/?${query}`, {
      ua: DESKTOP_UA,
      headers: { Accept: 'application/json', 'apollo-require-preflight': 'true', 'x-apollo-operation-name': 'getRecipe' },
    })
    const found = albertRecipe(JSON.parse(r.text))
    return found ? { steps: found.steps, totalMin: found.totalMin ?? fromPage.totalMin } : fromPage
  } catch {
    return fromPage
  }
}

export async function fetchWebRecipe(url) {
  const page = await loadPage(url)
  const parsed = parseRecipePage(page.text, await albertExtra(page.url || url, page.text))
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

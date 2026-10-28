import { parseIngredientLine, sectionHeading } from '../ingredients.js'
import { detectServings, timesFromText } from '../recipeMeta.js'

// Reads a recipe page that has no schema.org data by its structure: the list (or table) of
// amounts nearest an ingredient heading, the steps after it, and nothing past the end of the
// recipe (comments, related articles, shop, share buttons). Flattening the whole page to text
// and guessing line by line picked those up as steps and ingredients.

// Parts of a page that are never the recipe, by their class or id
const JUNK = /(?:^|[\s_-])(?:comments?|komentar\w*|discussion|diskuse|related|souvisej\w*|podobne|share|sharing|sdilet|social|sidebar|newsletter|subscribe|breadcrumbs?|cookies?|consent|advert\w*|ads?|adsense|banner|promo\w*|sponsor\w*|widget|menu|navigation|navbar|nav|footer|site-header|author-?box|about-?author|bio|tags?|tag-?list|tagcloud|popular|recommended|doporuc\w*|more-articles|read-?more|gallery|login|modal|popup|toolbar|pagination|rating|reviews?)(?:$|[\s_-])/i
// Recipe parts keep their box even when a theme gives it a class like "recipe-share-box"
const RECIPE_PART = /ingredient|instruction|recipe-?(?:body|content|card|steps?)|wprm-recipe|tasty-recipes|mv-create/i
// Text that marks the end of the recipe
const STOP = /^(?:komentář\p{L}*|\d+\s+komentář\p{L}*|comments?|\d+\s+comments?|leave a (?:comment|reply)|napsat komentář|přidat komentář|jak se vám líbil\p{L}*|další (?:články|recepty|návody)|související|podobné recepty|mohlo by vás (?:také )?zajímat|mohlo by vás|sdílet|share|tisk(?:nout)?(?: recept)?|print(?: recipe)?|about the|o autorovi|o autorce|newsletter|nahlásit chybu|tipy na recepty|vybrané pro vás|našli jste v receptu chybu|legenda zkratek|рецептата е добавена|рецептата за .{1,60} е (?:изпълнена|готова)|топ \d+ рецепти|inzerce|you may also like|more recipes|related|подобни рецепти|още рецепти|коментар\p{L}*|сподел\p{L}*|súvisiace|ďalšie recepty|komentár\p{L}*|podobné recepty)(?!\p{L})/iu
// Byline and picture credits inside the article
const CREDIT = /^(?:foto|photo|zdroj|source|autor|author|text|източник|снимка|снимки)\s*[:]?\s*\S/iu

const words = (s) => s.split(/\s+/).filter(Boolean).length
const textOf = (el) => (el.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
/** Text of an element with <br> as line breaks. */
const linesOf = (el) => {
  const copy = el.cloneNode(true)
  for (const br of copy.querySelectorAll('br')) br.replaceWith('\n')
  return (copy.textContent ?? '').replace(/ /g, ' ').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}
// An amount and a name: "4.7" (a rating) or "sготвена на: 22.08.2026" are not ingredients
const hasAmount = (line) => {
  if (words(line) > 14 || /\d{1,2}\.\s?\d{1,2}\.\s?\d{4}/.test(line)) return false
  const parsed = parseIngredientLine(line)
  return parsed?.quantity != null && /\p{L}{2}/u.test(parsed.name ?? '')
}
// A step reads as a sentence; an ingredient as a short name
const stepLike = (line) => words(line) >= 5 && !hasAmount(line)

function pageTitle(doc) {
  const site = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim()
  const h1 = [...doc.querySelectorAll('article h1, main h1, h1, .entry-title, .post-title, .recipe-title')].map(textOf).find((t) => t && words(t) <= 20)
  if (h1) return h1
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? doc.title ?? ''
  // "Boršč | KITCHENETTE", "Recept - SLEPIČÁRNA": the site's name after the title
  const parts = og.split(/\s+[|–—-]\s+/)
  return (parts.length > 1 && (words(parts.at(-1)) <= 4 || parts.at(-1) === site) ? parts.slice(0, -1).join(' - ') : og).trim() || null
}

function removeJunk(root) {
  for (const el of root.querySelectorAll('script, style, noscript, svg, iframe, nav, footer, aside, button, select, template, .screen-reader-text, .sr-only, .visually-hidden')) el.remove()
  // Comment and search forms; some recipe plugins put the ingredient checkboxes in a form
  for (const el of root.querySelectorAll('form')) if (el.querySelector('textarea, input[type="email"], input[type="search"], input[type="password"]')) el.remove()
  for (const el of [...root.querySelectorAll('[class], [id]')]) {
    // The post itself stays, whatever its classes; a related article inside it does not
    if (!el.isConnected || (/^(?:ARTICLE|MAIN)$/.test(el.tagName) && !el.parentElement?.closest('article'))) continue
    // WordPress names a post by its tags and categories ("tag-recept", "category-polevky")
    const name = `${el.getAttribute('class') ?? ''} ${el.getAttribute('id') ?? ''}`
      .split(/\s+/)
      .filter((c) => !/^(?:tag|category|post|postid|format|status|type)-/.test(c))
      .join(' ')
    if (!JUNK.test(name) || RECIPE_PART.test(name)) continue
    // A wrapper of the whole article ("post-with-sidebar") stays when the recipe is inside it
    if (el.querySelector('[class*="ingredient" i], [class*="instruction" i], [class*="recipe" i], article') || el.querySelectorAll('li').length > 40) continue
    el.remove()
  }
}

/** The page as a run of blocks in reading order: headings, paragraphs and lists (with their items). */
function blocksOf(root) {
  const blocks = []
  // Text and inline tags between boxes are a paragraph: "<div><strong>1.</strong> Předehřejte…<p></p></div>"
  const paragraph = (nodes) => {
    const box = root.ownerDocument.createElement('div')
    for (const n of nodes) box.append(n.cloneNode(true))
    const lines = linesOf(box)
    // A step's number in its own tag ("<strong>2.</strong><p>…</p>")
    if (!lines.length || (lines.length === 1 && /^\d{1,2}[.)]?$/.test(lines[0]))) return
    // A bold paragraph on its own is a heading on blogs: "<p><strong>Co na knedlíky?</strong></p>",
    // and so is a short line ending in a colon ("Na halušky:") or a section name ("INGREDIENCE")
    const strong = box.querySelector('strong, b')
    const heading = lines.length === 1 && words(lines[0]) <= 8 && ((strong && textOf(strong) === lines[0]) || /[:：]$/.test(lines[0]) || sectionHeading(lines[0]))
    blocks.push(heading ? { kind: 'heading', text: lines[0] } : { kind: 'para', lines })
  }
  const walk = (el, { inline = true } = {}) => {
    let run = []
    const flush = () => {
      if (inline && run.length) paragraph(run)
      run = []
    }
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        run.push(child)
        continue
      }
      if (child.nodeType !== 1) continue
      const tag = child.tagName
      if (INLINE.test(tag) && !child.querySelector(BLOCK)) {
        run.push(child)
        continue
      }
      flush()
      if (/^H[1-6]$/.test(tag)) {
        const t = textOf(child)
        if (t) blocks.push({ kind: 'heading', text: t })
      } else if (tag === 'UL' || tag === 'OL') {
        list(child)
      } else if (tag === 'TABLE' && !child.querySelector('ul, ol, table, h1, h2, h3, h4, h5, h6')) {
        // A table of amounts; a table that lays out the whole page is walked like any box
        const items = [...child.querySelectorAll('tr')].map((tr) => [...tr.children].map(textOf).filter(Boolean).join(' ')).filter(Boolean)
        if (items.length) blocks.push({ kind: 'list', items, ordered: false })
      } else {
        walk(child)
      }
    }
    flush()
  }
  // A list item with a list inside is a heading for it: "<li><strong>na guláš:</strong><ul>…"
  const list = (el) => {
    const items = []
    for (const li of el.children) {
      if (li.tagName !== 'LI') continue
      const inner = li.querySelector('ul, ol')
      if (inner) {
        if (items.length) blocks.push({ kind: 'list', items: items.splice(0), ordered: el.tagName === 'OL' })
        // The label is the item's own text; broken pages can leave the rest of the article inside the item
        const copy = li.cloneNode(true)
        for (const l of copy.querySelectorAll('ul, ol, p, div, table, article, section, h1, h2, h3, h4, h5, h6')) l.remove()
        const label = textOf(copy)
        if (label && words(label) <= 10) blocks.push({ kind: 'heading', text: label })
        walk(li, { inline: false })
        continue
      }
      const t = textOf(li).replace(BULLET, '')
      if (t) items.push(t)
    }
    if (items.length) blocks.push({ kind: 'list', items, ordered: el.tagName === 'OL' })
  }
  walk(root)
  // Blogs put each ingredient in its own <p>: a run of short paragraphs is one block
  const short = (b) => b?.kind === 'para' && b.lines.every((l) => words(l) <= 12)
  return blocks.reduce((out, b) => {
    if (short(b) && short(out.at(-1))) out.at(-1).lines.push(...b.lines)
    else out.push(b.kind === 'para' ? { ...b, lines: [...b.lines] } : b)
    return out
  }, [])
}

const isIngredientList = (b) => {
  const amounts = b.items.filter(hasAmount).length
  return amounts >= 2 && amounts >= b.items.length * 0.4 && b.items.filter(stepLike).length < b.items.length / 2
}
// Ingredient lines written as a paragraph with <br>s
const isIngredientPara = (b) => b.lines.length >= 2 && b.lines.filter(hasAmount).length >= Math.max(2, b.lines.length * 0.5)
const isStepList = (b) => b.items.length >= 2 && b.items.filter(stepLike).length >= b.items.length * 0.6
// The part an ingredient heading names: "Co na knedlíky?" → "knedlíky", "Ingredients" → none
const groupLabel = (text) => {
  const name = text
    .replace(/[:：?？\s]+$/u, '')
    .replace(/^(?:co (?:na|do|pro)|co potřebujete (?:na|do|pro)|suroviny (?:na|do|pro)|přísady (?:na|do|pro)|ingredience (?:na|do|pro)|ingredients? for(?: the)?|for the|за)\s+/iu, '')
  return !name || sectionHeading(name) || detectServings(name) ? null : name[0].toLocaleUpperCase() + name.slice(1)
}
const INLINE = /^(?:A|ABBR|B|BR|CITE|CODE|DEL|EM|FONT|I|INS|LABEL|MARK|Q|S|SMALL|SPAN|STRONG|SUB|SUP|TIME|U)$/
const BLOCK = 'address, article, blockquote, div, dl, figure, h1, h2, h3, h4, h5, h6, header, li, ol, p, pre, section, table, ul'
const BULLET = /^[•·▪●◦*]\s*/u
const NUMBERED = /^\d{1,2}\s*[.)]\s*\S/
const TAG_RUN = /^(?:\p{Lu}[\p{Ll}-]*\s+){3,}\p{Lu}[\p{Ll}-]*$/u
/** A line where the recipe has ended: comments, related articles, share buttons, credits. */
export const endOfRecipe = (text) => STOP.test(text) || CREDIT.test(text)

/** Page text cut where the recipe ends: the first comment or share line after an ingredient. */
export function recipePart(text) {
  const lines = text.split('\n')
  const first = lines.findIndex(hasAmount)
  const end = first < 0 ? -1 : lines.findIndex((l, i) => i > first && STOP.test(l.trim()))
  return end < 0 ? text : lines.slice(0, end).join('\n')
}

/**
 * { title, text, servings, prepMin, cookMin, totalMin, steps, notes } read from the page, the
 * text written with "Ingredients:" and "Instructions:" headings for the recipe parser, or null
 * when the page has no list of ingredients.
 */
export function recipeFromPage(html) {
  if (typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = pageTitle(doc)
  const body = doc.body
  if (!body) return null
  removeJunk(body)
  const blocks = blocksOf(body)

  // The recipe starts at the first list of amounts that follows an ingredient heading, else the first list of amounts
  const ingredientAt = (i) => (blocks[i].kind === 'list' && isIngredientList(blocks[i])) || (blocks[i].kind === 'para' && isIngredientPara(blocks[i]))
  const headed = (i) => blocks.slice(Math.max(0, i - 4), i).some((b) => b.kind === 'heading' && sectionHeading(b.text) === 'ingredients')
  const candidates = blocks.map((_, i) => i).filter(ingredientAt)
  const start = candidates.find(headed) ?? candidates[0]
  if (start == null) return null

  const groups = []
  let label = null
  let i = start
  // A heading right above the first list names its group (unless it is just "Ingredients")
  for (let j = start - 1; j >= Math.max(0, start - 2); j--) {
    if (blocks[j].kind === 'heading') {
      if (!detectServings(blocks[j].text)) label = groupLabel(blocks[j].text)
      break
    }
  }
  for (; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.kind === 'heading') {
      const kind = sectionHeading(b.text)
      if (kind === 'steps' || kind === 'notes' || kind === 'equipment' || endOfRecipe(b.text)) break
      // "Co na knedlíky?" after "Co na vývar?" is the next part; with no list after it, the next recipe
      if (kind === 'ingredients' && groups.length && !ingredientAt(i + 1)) break
      label = groupLabel(b.text)
      continue
    }
    // A named part after the first can list names only: "na posypání: mák, cukr, máslo"
    const namesOnly = b.kind === 'list' && groups.length && label && b.items.every((item) => words(item) <= 6 && !stepLike(item))
    if (b.kind === 'list' && (isIngredientList(b) || namesOnly)) {
      groups.push({ name: label, items: b.items })
      label = null
      continue
    }
    if (b.kind === 'para' && isIngredientPara(b)) {
      groups.push({ name: label, items: b.lines })
      label = null
      continue
    }
    // An ingredient list can come with a short note ("Můžete přidat slaninu"); a list of sentences is the method
    if (b.kind === 'list' && isStepList(b)) break
    if (b.kind === 'para' && b.lines.some((l) => words(l) >= 8)) break
  }

  // The method: a list of sentences, or paragraphs, until the recipe ends
  const steps = []
  const notes = []
  let mode = 'steps'
  let quiet = 0
  let fromParas = 0
  for (; i < blocks.length && steps.length < 60; i++) {
    const b = blocks[i]
    const text = b.kind === 'heading' ? b.text : (b.lines ?? b.items).join(' ')
    if (endOfRecipe(text)) break
    if (b.kind === 'heading') {
      const kind = sectionHeading(b.text)
      // The next recipe on the page, or the tools
      if (kind === 'ingredients' && steps.length) break
      if (kind === 'equipment') mode = 'skip'
      else if (kind === 'notes') mode = 'notes'
      else if (kind === 'steps') mode = 'steps'
      // A sub-heading of the method ("Omáčka"); a heading after the method ends it
      else if (steps.length && mode === 'steps') {
        const next = blocks[i + 1]
        if (!next || (next.kind === 'list' ? !isStepList(next) : next.kind !== 'para')) break
        steps.push(`${b.text.replace(/:$/, '')}:`)
      }
      continue
    }
    if (b.kind === 'list' && isIngredientList(b)) {
      if (steps.length) break
      continue
    }
    let lines = b.kind === 'list' ? b.items : b.lines
    // "Рецептата за мусака е изпълнена!" under the last step
    const end = lines.findIndex(endOfRecipe)
    if (end >= 0) {
      lines = lines.slice(0, end)
      i = blocks.length
    }
    if (mode === 'skip') continue
    if (mode === 'notes') {
      notes.push(...lines)
      continue
    }
    // A run of capitalised words is the article's tags ("Sůl Mouka Koření Paprika")
    if (steps.length && lines.length === 1 && TAG_RUN.test(lines[0])) break
    // Every item of a list in the method is a step ("Podávejte s knedlíkem."); loose paragraphs need a sentence
    const sentences = b.kind === 'list' ? lines : lines.filter((l) => words(l) >= 4 || NUMBERED.test(l))
    // After "1. … 2. …" a paragraph without a number is the author's bio or an ad
    if (NUMBERED.test(steps[0] ?? '') && sentences.length && !sentences.some((l) => NUMBERED.test(l))) break
    if (!sentences.length) {
      // Labels and captions between the steps; a run of them is the end of the article
      if (steps.length && ++quiet >= 3) break
      continue
    }
    quiet = 0
    // An introduction above a numbered list of steps is not a step
    if (b.kind === 'list' && b.ordered && isStepList(b) && fromParas === steps.length && fromParas && fromParas <= 2) steps.splice(0)
    if (b.kind === 'para' && fromParas === steps.length) fromParas += sentences.length
    steps.push(...sentences)
  }

  // Headings of the next part of the article ("Recepty na rychlé večeře:") with nothing under them
  while (steps.length && /:$/.test(steps.at(-1))) steps.pop()

  const lines = [title ?? '', '', 'Ingredients:']
  const named = groups.filter((g) => g.name).length
  for (const g of groups) {
    if (named && groups.length > 1 && g.name) lines.push('', `${g.name.replace(/:$/, '')}:`)
    // "Plnka:" written as an item of the list starts a group
    for (const item of g.items) lines.push(/^[^\d:]{2,30}:$/u.test(item) && words(item) <= 4 ? `\n${item}` : `- ${item}`)
  }
  if (steps.length) lines.push('', 'Instructions:', ...steps)

  // Portions and times are usually written just above the list ("4 porce", "příprava: 20 minut")
  const around = blocks
    .slice(Math.max(0, start - 8), start)
    .flatMap((b) => (b.kind === 'heading' ? [b.text] : (b.lines ?? b.items)))
    .filter((l) => words(l) <= 12)
    .join('\n')
  return { title, text: lines.join('\n'), servings: detectServings(around), ...timesFromText(around), notes, steps }
}

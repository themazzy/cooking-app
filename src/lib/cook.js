// Helpers for cooking mode: the steps one by one, the ingredients each step
// mentions, and timers for the times written in a step.

/** The steps text as a list, one step per non-empty line, without "1." numbering. */
export const splitSteps = (steps) =>
  String(steps ?? '')
    .split('\n')
    .map((s) => s.trim().replace(/^(?:\d+[.)]|step\s*\d+[:.]?|[-•*])\s*/i, ''))
    .filter(Boolean)

const UNIT_SECONDS = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600 }
const TIME = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|[hms])\b/gi

/** "Bake for 25–30 minutes" → [{ label: '25–30 min', seconds: 1800 }]. A range counts at its upper end. */
export function findTimers(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(TIME)) {
    const unit = m[3].toLowerCase()
    const per = UNIT_SECONDS[unit]
    if (!per) continue
    const lo = Number(m[1].replace(',', '.'))
    const hi = m[2] ? Number(m[2].replace(',', '.')) : null
    const seconds = Math.round((hi ?? lo) * per)
    if (!seconds || seconds > 24 * 3600) continue
    const short = per === 1 ? 's' : per === 60 ? 'min' : 'h'
    out.push({ label: `${m[2] ? `${m[1]}–${m[2]}` : m[1]} ${short}`, seconds })
  }
  return out
}

const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .split(/[,(]/)[0]
    .replace(/[^\p{L}\s-]/gu, ' ')
    .trim()

const forms = (term) => {
  const t = words(term)
  if (!t) return []
  const out = new Set([t])
  if (t.endsWith('es')) out.add(t.slice(0, -2))
  if (t.endsWith('s')) out.add(t.slice(0, -1))
  else out.add(`${t}s`)
  return [...out].filter((x) => x.length > 2)
}

/**
 * Indexes of the ingredients a step mentions, by the ingredient's own name,
 * its catalog name and aliases, or the last word of its name ("red onion" → "onion").
 */
export function stepIngredients(step, ingredients, match = () => null) {
  const text = ` ${words(step).replace(/\s+/g, ' ')} `
  const hits = []
  ingredients.forEach((ing, n) => {
    const name = words(ing.name)
    if (!name) return
    const entry = match(ing.name)
    const terms = [name, name.split(/\s+/).pop(), entry?.name, ...(entry?.aliases ?? [])].flatMap(forms)
    if (terms.some((t) => text.includes(` ${t} `))) hits.push(n)
  })
  return hits
}

export const formatClock = (seconds) => {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

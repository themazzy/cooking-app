// Helpers for cooking mode: the steps one by one, the ingredients each step
// mentions, and timers for the times written in a step.

const NUMBER = /^(?:\d+\s*[.)]|step\s*\d+\s*[:.)]?|krok\s*\d+\s*[:.)]?|стъпка\s*\d+\s*[:.)]?)\s*/iu
const BULLET = /^[-•*–]\s*/
// "For the sauce:" — a short line that names the part of the recipe the next steps make
const isHeading = (line) => /[:：]$/.test(line) && line.length <= 50
// A line cut off in the middle of a sentence, such as wrapped text from a photo:
// the line before stops on a comma or a joining word and this one goes on in lowercase
const CUT_OFF = /(?:[,\-–]|(?<!\p{L})(?:and|or|the|a|an|of|with|to|in|into|on|for|until|i|s|se|na|do|v|ve|z|ze|и|с|в|на|до|за|от))$/iu
const isContinuation = (prev, line) => CUT_OFF.test(prev) && /^[\p{Ll}(]/u.test(line)

/** "1. Chop. 2. Fry." on one line → two lines, when the numbers count up from 1. */
const splitInlineNumbers = (line) => {
  const parts = line.split(/\s+(?=\d+[.)]\s+\p{Lu})/u)
  if (parts.length < 2) return [line]
  const nums = parts.map((p) => parseInt(p, 10))
  const counts = nums.every((n, i) => (i === 0 ? true : n === nums[i - 1] + 1))
  return counts && parts.slice(1).every((p) => NUMBER.test(p)) ? parts : [line]
}

/**
 * The steps text as a list of whole steps, without "1." numbering.
 * Numbered steps keep the lines that follow them; without numbers, blank lines
 * separate steps when steps run over several lines, otherwise each line is one.
 * A heading such as "For the sauce:" goes in front of the step after it.
 */
export function splitSteps(steps) {
  const lines = String(steps ?? '')
    .split('\n')
    .map((s) => s.trim())
    .flatMap((s) => (s ? splitInlineNumbers(s) : ['']))
  const numbered = lines.filter((l) => NUMBER.test(l)).length >= 2
  // Blank lines between steps, and at least one step longer than a line
  const paragraphs = !numbered && lines.includes('') && lines.some((l, i) => l && lines[i + 1])
  const out = []
  let heading = ''
  let open = false // the last step can still take more lines
  for (const raw of lines) {
    if (!raw) {
      if (paragraphs) open = false
      continue
    }
    const isNumbered = NUMBER.test(raw)
    const line = raw.replace(NUMBER, '').replace(BULLET, '').trim()
    if (!line) continue
    if (isHeading(line) && !isNumbered) {
      heading = heading ? `${heading} ${line}` : line
      open = false
      continue
    }
    const joins = out.length > 0 && !heading && !isNumbered && !BULLET.test(raw) && (numbered || paragraphs ? open : isContinuation(out[out.length - 1], line))
    if (joins) out[out.length - 1] += ` ${line}`
    else out.push(heading ? `${heading} ${line}` : line)
    heading = ''
    open = true
  }
  if (heading) out.push(heading)
  return out
}

// Numbers a time can be written with: "1 1/2", "1½", "1,5", "½", "half an", "an", Czech "půl", Bulgarian "половин"
const T_NUM = '(\\d+\\s+\\d\\/\\d|\\d+\\/\\d|\\d+[½¼¾]|\\d+(?:[.,]\\d+)?|[½¼¾]|half\\s+an?|an?|půl|pul|половин)'
// "ч." is hours, but "ч.л." is a teaspoon
const T_HOURS = 'hours?|hrs?|h|hodin[auy]?|hod\\.?|час(?:а|ове)?|ч(?!\\.?\\s*л)\\.?'
const T_MINS = 'minutes?|mins?|minut[ay]?|min\\.?|m|минут[аи]?|мин\\.?'
const T_SECS = 'seconds?|secs?|s|sekund[ay]?|sek\\.?|секунд[аи]?|сек\\.?'
const T_RANGE = '\\s*(?:-|–|to|až|do|до)\\s*'
const TIME = new RegExp(
  `(?<![\\p{L}\\d/])${T_NUM}(?:${T_RANGE}${T_NUM})?\\s*(${T_HOURS}|${T_MINS}|${T_SECS})(?![\\p{L}])` +
    // "1 hour 30 minutes", "1 hodinu a 20 minut", "1 час и 15 минути"
    `(?:\\s*,?\\s*(?:and|a|и)?\\s*(\\d+)\\s*(${T_MINS})(?![\\p{L}]))?`,
  'giu',
)
const isUnit = (pattern, s) => new RegExp(`^(?:${pattern})$`, 'iu').test(s)
const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75 }

function timeNumber(s) {
  const v = s.toLowerCase().replace(/\s+/g, ' ')
  if (/^(?:half|půl|pul|половин)/.test(v)) return 0.5
  if (v === 'a' || v === 'an') return 1
  const mixed = v.match(/^(\d+) (\d)\/(\d)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = v.match(/^(\d+)\/(\d)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const glyph = v.match(/^(\d*)([½¼¾])$/)
  if (glyph) return Number(glyph[1] || 0) + FRACTIONS[glyph[2]]
  return Number(v.replace(',', '.'))
}

const clockLabel = (seconds) => {
  if (seconds < 60) return `${seconds} s`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`
}

/**
 * "Bake for 25–30 minutes" → [{ label: '25–30 min', seconds: 1800 }]. A range counts at its upper end.
 * Reads English, Czech and Bulgarian units, fractions ("1 1/2 hours", "½ hr", "half an hour")
 * and hours with minutes after them ("1 hour 30 minutes") as one timer.
 */
export function findTimers(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(TIME)) {
    const [, lo, hi, unit, more, moreUnit] = m
    const per = isUnit(T_HOURS, unit) ? 3600 : isUnit(T_MINS, unit) ? 60 : 1
    // "a"/"an" only before a whole word: "an hour", not "a m"
    if (/^an?$/i.test(lo) && unit.length < 3) continue
    let seconds = Math.round(timeNumber(hi ?? lo) * per)
    if (more && per === 3600) seconds += Number(more) * 60
    if (!seconds || seconds > 24 * 3600) continue
    const plain = (s) => /^\d+(?:[.,]\d+)?$/.test(s)
    const short = per === 1 ? 's' : per === 60 ? 'min' : 'h'
    const label = plain(lo) && (!hi || plain(hi)) && !(more && per === 3600) && (per !== 3600 || Number.isInteger(timeNumber(hi ?? lo))) ? `${hi ? `${lo}–${hi}` : lo} ${short}` : clockLabel(seconds)
    out.push({ label, seconds })
  }
  return out
}

// Words that say how an ingredient is prepared, not what it is
const DESCRIPTORS = new Set(
  'fresh chopped diced sliced grated minced ground finely roughly thinly large small medium big ripe peeled boneless skinless cooked raw whole halved quartered crushed softened melted cold warm hot dried frozen canned toasted organic optional extra light dark'.split(' '),
)

const tokens = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)

// The ingredient itself, before ", minced" or "(about 200 g)"
const nameTokens = (name) => tokens(String(name ?? '').split(/[,(]/)[0])

const CYRILLIC = /\p{Script=Cyrillic}/u
const VOWELS = /^[aeiouyáéíóúůýěаъоуеиюяй]*$/u

/**
 * Whether a word in the step is a form of a word in the ingredient's name:
 * "onion" ~ "onions", "tomato" ~ "tomatoes", Czech "cibule" ~ "cibuli" / "cibulku",
 * Bulgarian "домат" ~ "доматите", "лук" ~ "лука". Not "rice" ~ "ricotta".
 */
export function sameWord(term, word) {
  if (term === word) return true
  const [short, long] = term.length <= word.length ? [term, word] : [word, term]
  let p = 0
  while (p < short.length && short[p] === long[p]) p++
  const extra = long.length - p
  if (short.length <= 3) {
    // Too short to guess endings, except a plural or a Bulgarian article
    return p === short.length && (long === `${short}s` || long === `${short}es` || (CYRILLIC.test(short) && extra <= 3))
  }
  // Endings that differ: English adds "s"/"es"/"ies", Czech and Bulgarian swap
  // a vowel at the end and add a few letters ("cibule" → "cibulkou")
  const cut = short.slice(p)
  if (cut.length > (short.length >= 6 ? 2 : 1) || !VOWELS.test(cut)) return false
  return extra <= (CYRILLIC.test(long) ? 5 : 3)
}

const phraseIn = (phrase, text) => {
  if (!phrase.length) return false
  for (let i = 0; i + phrase.length <= text.length; i++) {
    if (phrase.every((t, k) => sameWord(t, text[i + k]))) return true
  }
  return false
}

/** The word lists an ingredient can be called by in a step, best first. */
function ingredientTerms(ing, match) {
  const name = nameTokens(ing.name)
  if (!name.length) return []
  const bare = name.filter((w) => !DESCRIPTORS.has(w))
  const entry = match(ing.name)
  const out = [name, bare]
  // The last word names the thing: "red onion" → "onion", "soy sauce" stays whole below
  const head = bare[bare.length - 1]
  if (head && head.length >= 3) out.push([head])
  if (entry) for (const phrase of [entry.name, ...(entry.aliases ?? [])]) out.push(tokens(phrase))
  const seen = new Set()
  return out.filter((t) => t.length && !seen.has(t.join(' ')) && seen.add(t.join(' ')))
}

/**
 * Indexes of the ingredients a step mentions, by the ingredient's own name,
 * its catalog name and aliases, or the last word of its name ("red onion" → "onion").
 * Word endings may differ, so plurals and Czech or Bulgarian forms are found too.
 */
export function stepIngredients(step, ingredients, match = () => null) {
  const text = tokens(step)
  const hits = []
  ingredients.forEach((ing, n) => {
    if (ingredientTerms(ing, match).some((t) => phraseIn(t, text))) hits.push(n)
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

// Timers: { id, label, total, endsAt } while running, { …, left } while paused, done when time is up

export const newTimer = (label, seconds, now = Date.now()) => ({ id: `${now}-${Math.random()}`, label, total: seconds, endsAt: now + seconds * 1000, left: null, done: false })

/** Seconds left on a timer. */
export const timeLeft = (t, now = Date.now()) => (t.endsAt != null ? Math.max(0, (t.endsAt - now) / 1000) : (t.left ?? 0))

export const pauseTimer = (t, now = Date.now()) => (t.endsAt == null || t.done ? t : { ...t, left: timeLeft(t, now), endsAt: null })

export const resumeTimer = (t, now = Date.now()) => (t.endsAt != null || t.done ? t : { ...t, endsAt: now + (t.left ?? 0) * 1000, left: null })

/** Adds (or takes off) seconds. A finished timer given more time runs again. */
export function adjustTimer(t, seconds, now = Date.now()) {
  if (t.done) return seconds > 0 ? { ...t, done: false, endsAt: now + seconds * 1000, left: null, total: seconds } : t
  if (t.endsAt != null) return { ...t, endsAt: Math.max(now, t.endsAt + seconds * 1000), total: Math.max(0, t.total + seconds) }
  return { ...t, left: Math.max(0, (t.left ?? 0) + seconds), total: Math.max(0, t.total + seconds) }
}

export const restartTimer = (t, now = Date.now()) => ({ ...t, done: false, endsAt: now + t.total * 1000, left: null })

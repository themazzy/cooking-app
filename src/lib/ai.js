import { supabase } from './supabase.js'

// Recipes tidied by Google's Gemini (free API tier). The key is not in the
// app: it sits in the table household_ai, which only the members of a
// household that has a row can read (row level security), and rows are only
// added by hand in the Supabase dashboard. Other accounts see no AI at all.

const API = 'https://generativelanguage.googleapis.com/v1beta/models'
// Newest free Flash model with video input (stable since 2026-09)
const DEFAULT_MODEL = 'gemini-3.8-flash'
// A request may carry about 20 MB; base64 makes the video a third bigger
export const MAX_VIDEO_BYTES = 14e6

// Languages the app's own parser reads; the AI writes others in English
const OWN_LANGUAGES = 'English, Czech, Slovak, Bulgarian, German, Spanish, Italian, French, Polish, Russian, Japanese, Chinese or Korean'

let cached = null
let loadError = null
/** Why the last loadAi found no key, for the import report. */
export const aiLoadError = () => loadError

/** The household's Gemini key and model, or null when this account has none. */
export async function loadAi({ fresh = false } = {}) {
  if (cached && !fresh) return cached
  cached = (async () => {
    try {
      const { data, error } = await supabase.from('household_ai').select('gemini_key, model').abortSignal(AbortSignal.timeout(15000)).maybeSingle()
      loadError = error ? error.message : data ? null : 'no key saved for this household'
      if (error || !data?.gemini_key?.trim() || /PASTE/.test(data.gemini_key)) return null
      return { key: data.gemini_key.trim(), model: data.model || DEFAULT_MODEL }
    } catch (err) {
      loadError = String(err?.message ?? err)
      return null
    }
  })()
  const ai = await cached
  if (!ai) cached = null // asked again later, e.g. after signing in
  return ai
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    isRecipe: { type: 'BOOLEAN' },
    title: { type: 'STRING' },
    servings: { type: 'INTEGER', nullable: true },
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { group: { type: 'STRING', nullable: true }, line: { type: 'STRING' } },
        required: ['line'],
      },
    },
    steps: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['isRecipe', 'title', 'ingredients', 'steps'],
}

export function aiPrompt({ title, description, comments = [], transcript, hasVideo }) {
  const parts = [
    'You turn a cooking video and its text into a recipe for a recipe app.',
    `Write the recipe in the language the recipe itself is in (caption or speech) when that is ${OWN_LANGUAGES}; otherwise write it in English.`,
    'Ingredients: one per entry, as "amount unit name" with metric or the units the source uses, e.g. "400 g onions", "1 tbsp butter", "2 eggs", "salt". ' +
      'Use the amounts the source gives. When the source names no amount, write only the name; never invent amounts. ' +
      'Put the name of the part of the dish in "group" (e.g. "Sauce") only when the source splits the ingredients into parts.',
    'Steps: short, clear instructions in cooking order, one action or two per step, with times and temperatures the source gives. ' +
      'When the text has no steps, write them from what the video shows and says.',
    'Leave out greetings, advertising, hashtags, links and "follow for more". Set isRecipe to false when there is no recipe at all.',
  ]
  if (title) parts.push(`Current title: ${title}`)
  if (description) parts.push(`Caption:\n${description}`)
  const kept = comments.filter((c) => c?.text).slice(0, 8)
  if (kept.length) parts.push(`Comments (the author's first):\n${kept.map((c) => `${c.author ?? 'someone'}: ${c.text}`).join('\n---\n')}`)
  if (transcript) parts.push(`What is said in the video:\n${transcript}`)
  if (hasVideo) parts.push('The video is attached.')
  return parts.join('\n\n')
}

/** The AI's answer as recipe text the app's parser reads: title, servings, ingredients (with groups), numbered steps. */
export function aiRecipeText(answer) {
  if (!answer || answer.isRecipe === false) return null
  const ingredients = (answer.ingredients ?? []).filter((i) => i?.line?.trim())
  const steps = (answer.steps ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
  if (!ingredients.length && !steps.length) return null
  const lines = [String(answer.title ?? '').trim() || 'Recipe']
  if (answer.servings > 0) lines.push(`Serves ${answer.servings}`)
  lines.push('', 'Ingredients:')
  let group = null
  for (const i of ingredients) {
    const g = i.group?.trim() || null
    if (g !== group) {
      lines.push(g ? `${g.replace(/:$/, '')}:` : '')
      group = g
    }
    lines.push(`- ${i.line.trim()}`)
  }
  lines.push('', 'Steps:')
  steps.forEach((s, n) => lines.push(`${n + 1}. ${s.replace(/^\d+[.)]\s*/, '')}`))
  return lines.join('\n')
}

function toBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let out = ''
  for (let i = 0; i < view.length; i += 0x8000) out += String.fromCharCode.apply(null, view.subarray(i, i + 0x8000))
  return btoa(out)
}

const errorText = async (res) => {
  try {
    const j = await res.clone().json()
    return `${j?.error?.status ?? ''} ${j?.error?.message ?? ''}`
  } catch {
    return ''
  }
}

// How the key goes with the request. Classic keys (AIza…) use the header;
// Google's newer auth keys (AQ.…) may need ?key= or a bearer token. The way
// that worked is remembered, so a video is not uploaded twice next time.
const AUTH_WAYS = {
  header: (url, key) => [url, { 'x-goog-api-key': key }],
  query: (url, key) => [`${url}?key=${encodeURIComponent(key)}`, {}],
  bearer: (url, key) => [url, { Authorization: `Bearer ${key}` }],
}
let authWay = null

// Gemini 3 and newer (what gemini-flash-latest points to) set thinking with a
// level; 2.x models with a token budget. Tried in this order, and the first
// one the model takes is remembered. No temperature: Gemini 3 is meant to run
// at its default, and a low one can make it repeat itself until the token limit.
const THINKING = [{ thinkingLevel: 'minimal' }, { thinkingBudget: 0 }, null]
let thinkingWay = 0
let lowMedia = true

// A request that never answers would leave the import on "Gemini is watching…" for good
export const AI_TIMEOUT_MS = { text: 75000, video: 180000 }

async function post(ai, body, signal) {
  const url = `${API}/${encodeURIComponent(ai.model)}:generateContent`
  const json = JSON.stringify(body)
  const order = ai.key.startsWith('AIza') ? ['header'] : [...new Set([authWay ?? 'header', 'header', 'query', 'bearer'])]
  let res
  for (const way of order) {
    const [to, headers] = AUTH_WAYS[way](url, ai.key)
    res = await fetch(to, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: json, signal })
    if (res.ok) {
      authWay = way
      return res
    }
    // Only a refused key is worth another way; other errors are the same every way
    if (![400, 401, 403].includes(res.status) || !/API.?key|UNAUTHENTICATED|PERMISSION_DENIED|credential|auth/i.test(await errorText(res))) return res
  }
  return res
}

/** The generation settings for one try (see THINKING). */
export function aiConfig({ thinking = THINKING[0], lowMediaResolution = false } = {}) {
  return {
    responseMimeType: 'application/json',
    responseSchema: SCHEMA,
    // A recipe fits easily; a looping answer stops here instead of running for minutes
    maxOutputTokens: 8192,
    ...(thinking ? { thinkingConfig: thinking } : {}),
    ...(lowMediaResolution ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}),
  }
}

/**
 * Asks Gemini for the recipe in a reel: its caption, comments, what is said,
 * and the video itself when it is small enough. Returns recipe text (see
 * aiRecipeText) or null when there is no recipe in it.
 */
export async function aiRecipe(ai, source, video = null, { timeoutMs } = {}) {
  const sendVideo = video && video.byteLength > 0 && video.byteLength <= MAX_VIDEO_BYTES
  const parts = [{ text: aiPrompt({ ...source, hasVideo: !!sendVideo }) }]
  if (sendVideo) parts.push({ inlineData: { mimeType: 'video/mp4', data: toBase64(video) } })
  const limit = timeoutMs ?? (sendVideo ? AI_TIMEOUT_MS.video : AI_TIMEOUT_MS.text)
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), limit)
  let res
  try {
    // Settings a model does not know get a 400 naming them: the next way is tried
    for (;;) {
      const config = aiConfig({ thinking: THINKING[thinkingWay], lowMediaResolution: sendVideo && lowMedia })
      res = await post(ai, { contents: [{ role: 'user', parts }], generationConfig: config }, abort.signal)
      if (res.status !== 400) break
      const why = await errorText(res)
      if (sendVideo && lowMedia && /media_?resolution/i.test(why)) lowMedia = false
      else if (THINKING[thinkingWay] && /thinking/i.test(why)) thinkingWay++
      else break
    }
  } catch (err) {
    if (abort.signal.aborted) throw new Error(`Gemini did not answer within ${Math.round(limit / 1000)} s.`)
    throw new Error(`Could not reach Gemini: ${err?.message ?? err}`)
  } finally {
    clearTimeout(timer)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`
    if (res.status === 429) throw new Error('The free Gemini limit is used up for now. Try again later.')
    if (res.status === 404) throw new Error(`Gemini: the model "${ai.model}" is not available any more (${msg}).`)
    throw new Error(`Gemini: ${msg}`)
  }
  const candidate = json?.candidates?.[0]
  const text = candidate?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? ''
  if (!text && (json?.promptFeedback?.blockReason || candidate?.finishReason)) {
    throw new Error(`Gemini sent no answer (${json?.promptFeedback?.blockReason ?? candidate.finishReason}).`)
  }
  let answer
  try {
    answer = JSON.parse(text)
  } catch {
    throw new Error(candidate?.finishReason === 'MAX_TOKENS' ? 'Gemini\'s answer was cut off.' : 'Gemini sent an answer the app could not read.')
  }
  return aiRecipeText(answer)
}

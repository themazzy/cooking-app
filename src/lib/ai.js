import { supabase } from './supabase.js'

// Recipes tidied by Google's Gemini (free API tier). The key is not in the
// app: it sits in the table household_ai, which only the members of a
// household that has a row can read (row level security), and rows are only
// added by hand in the Supabase dashboard. Other accounts see no AI at all.

const API = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-flash-latest'
// A request may carry about 20 MB; base64 makes the video a third bigger
export const MAX_VIDEO_BYTES = 14e6

// Languages the app's own parser reads; the AI writes others in English
const OWN_LANGUAGES = 'English, Czech, Slovak, Bulgarian, German, Spanish, Italian, French, Polish, Russian, Japanese, Chinese or Korean'

let cached = null

/** The household's Gemini key and model, or null when this account has none. */
export async function loadAi({ fresh = false } = {}) {
  if (cached && !fresh) return cached
  cached = (async () => {
    try {
      const { data, error } = await supabase.from('household_ai').select('gemini_key, model').maybeSingle()
      if (error || !data?.gemini_key || !/^AIza/.test(data.gemini_key)) return null
      return { key: data.gemini_key, model: data.model || DEFAULT_MODEL }
    } catch {
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

/**
 * Asks Gemini for the recipe in a reel: its caption, comments, what is said,
 * and the video itself when it is small enough. Returns recipe text (see
 * aiRecipeText) or null when there is no recipe in it.
 */
export async function aiRecipe(ai, source, video = null) {
  const sendVideo = video && video.byteLength > 0 && video.byteLength <= MAX_VIDEO_BYTES
  const parts = [{ text: aiPrompt({ ...source, hasVideo: !!sendVideo }) }]
  if (sendVideo) parts.push({ inlineData: { mimeType: 'video/mp4', data: toBase64(video) } })
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
  }
  const res = await fetch(`${API}/${encodeURIComponent(ai.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.key },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`
    if (res.status === 429) throw new Error('The free Gemini limit is used up for now. Try again later.')
    throw new Error(`Gemini: ${msg}`)
  }
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  let answer
  try {
    answer = JSON.parse(text)
  } catch {
    throw new Error('Gemini sent an answer the app could not read.')
  }
  return aiRecipeText(answer)
}

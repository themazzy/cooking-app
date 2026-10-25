// Small helpers for digging data out of social media HTML. The pages embed
// their data as JSON, sometimes escaped once or twice inside script strings,
// so the helpers search both the raw HTML and a once-unescaped copy.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9#]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

/** Content of <meta property="og:..."> or <meta name="..."> tags. */
export function metaContent(html, key) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key.replace('.', '\\.')}["'][^>]*>`,
    'i',
  )
  const tag = html.match(re)?.[0]
  const content = tag?.match(/content=(["'])([\s\S]*?)\1/i)?.[2]
  return content ? decodeEntities(content) : null
}

/** Removes one level of JSON string escaping, enough to expose nested JSON. */
export function unescapeOnce(s) {
  return s.replace(/\\(["\\/])/g, '$1').replace(/\\u0026/g, '&').replace(/\\u003C/gi, '<').replace(/\\u003E/gi, '>')
}

/**
 * First JSON string value for `key` anywhere in the page, decoded.
 * Looks in the raw HTML, then in a once-unescaped copy (double-encoded JSON).
 */
export function findJsonString(html, key) {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)
  for (const src of [html, unescapeOnce(html)]) {
    const m = src.match(re)
    if (m) {
      try {
        return JSON.parse(`"${m[1]}"`)
      } catch {
        // malformed escape in this copy, try the next one
      }
    }
  }
  return null
}

/** Parse the JSON body of <script id="..."> */
export function scriptJson(html, id) {
  const m = html.match(new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)</script>`, 'i'))
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

/** Visible text of an HTML fragment, keeping line breaks. */
export function htmlToText(fragment) {
  return decodeEntities(
    fragment
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr|section|article)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Like findJsonString, but only looks after the first occurrence of `anchor`. */
export function findJsonStringAfter(html, anchor, key, window = 20000) {
  for (const src of [html, unescapeOnce(html)]) {
    const i = src.indexOf(anchor)
    if (i >= 0) {
      const v = findJsonString(src.slice(i, i + window), key)
      if (v != null) return v
    }
  }
  return null
}

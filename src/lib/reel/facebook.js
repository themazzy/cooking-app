import { getText } from '../http.js'
import { findJsonString, findJsonStringAfter, metaContent, unescapeOnce } from './html.js'

const VIDEO_KEYS = ['browser_native_hd_url', 'browser_native_sd_url', 'playable_url_quality_hd', 'playable_url']

/**
 * Comments that came along in the page data. Logged out, Facebook sends only
 * a few (if any); each is `"author":{..."name":"…"…},"body":{"text":"…"}`.
 */
export function parseFacebookComments(html, description) {
  const out = []
  const seen = new Set()
  for (const src of [html, unescapeOnce(html)]) {
    const re = /"body"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    for (const m of src.matchAll(re)) {
      let text
      try {
        text = JSON.parse(`"${m[1]}"`)
      } catch {
        continue
      }
      if (!text || text === description || seen.has(text)) continue
      seen.add(text)
      // The commenter's name sits shortly before the body
      const before = src.slice(Math.max(0, m.index - 3000), m.index)
      const names = [...before.matchAll(/"author"\s*:\s*\{[^{}]*?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g)]
      let author = null
      try {
        author = names.length ? JSON.parse(`"${names[names.length - 1][1]}"`) : null
      } catch {
        author = null
      }
      out.push({ author, text, pinned: false })
    }
    if (out.length) break
  }
  return out
}

export function parseFacebookPage(html) {
  let videoUrl = null
  for (const key of VIDEO_KEYS) {
    videoUrl = findJsonString(html, key)
    if (videoUrl) break
  }
  videoUrl ||= metaContent(html, 'og:video:secure_url') || metaContent(html, 'og:video:url') || metaContent(html, 'og:video')

  const description =
    findJsonStringAfter(html, '"message":{', 'text') ||
    metaContent(html, 'og:description') ||
    metaContent(html, 'description') ||
    null

  return {
    description,
    author: findJsonStringAfter(html, '"owner":{', 'name'),
    comments: parseFacebookComments(html, description),
    videoUrl,
    loginWall: !description && !videoUrl && /id="login_form"|\/login\/\?next=/.test(html),
  }
}

export async function fetchFacebook(url) {
  const page = await getText(url)
  const { loginWall, ...parsed } = parseFacebookPage(page.text)
  if (loginWall) throw new Error('Facebook asked for a login for this reel. Paste the description instead.')
  return { platform: 'facebook', url: page.url, ...parsed, downloadHeaders: { Referer: 'https://www.facebook.com/' } }
}

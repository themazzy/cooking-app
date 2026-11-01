import { DESKTOP_UA, getCookie, getText } from '../http.js'
import { runInPage } from '../pageReader.js'
import { findJsonStringAfter, metaContent, unescapeOnce } from './html.js'

// Facebook is tried three ways, best first, and the results are merged:
//  1. the reel page loaded in the hidden WebView (a real browser, so the
//     share-link redirect and bot checks pass, and a Facebook sign-in counts)
//  2. a native GET with the headers a desktop browser sends (without them
//     Facebook answers 400 "Error Facebook")
//  3. a native GET as Facebook's own link-preview crawler, which still gets
//     the og: tags (description, sometimes the video)

const FB = 'https://www.facebook.com'
const BROWSER_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,cs;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
}
const CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

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

/** og:description of a reel can be "1.2K views · 40 reactions | caption"; keeps the caption. */
export function captionFromFacebookOg(og) {
  if (!og) return null
  const m = og.match(/^[\d.,\s]*[KkMm]?\s*(?:views?|zhlédnutí|reactions?|reakc\S*|likes?)[^|]*\|\s*([\s\S]+)$/)
  return (m ? m[1] : og).trim() || null
}

/** The reel's number from a reel / video address, or null. */
export function facebookVideoId(url) {
  const m = String(url ?? '').match(/\/(?:reel|videos?|watch\/?\?v=)\/?(\d{6,})|[?&]v=(\d{6,})/)
  return m ? m[1] || m[2] : null
}

const decode = (raw) => {
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return null
  }
}

// Video addresses, best first. Since 2025 Facebook mostly sends
// videoDeliveryResponseResult.progressive_urls[{progressive_url, metadata:{quality}}]
// instead of the older browser_native_* / playable_url keys.
const VIDEO_RANK = { browser_native_hd_url: 0, playable_url_quality_hd: 0, 'progressive_url:hd': 1, browser_native_sd_url: 2, 'progressive_url:sd': 3, playable_url: 3 }

/** Every video address in the page, with where it sits and how good it is. */
function videoCandidates(src) {
  const out = []
  const re = /"(browser_native_hd_url|browser_native_sd_url|playable_url_quality_hd|playable_url|progressive_url)"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  for (const m of src.matchAll(re)) {
    const url = decode(m[2])
    if (!url || !/^https?:/.test(url)) continue
    let key = m[1]
    if (key === 'progressive_url') {
      // Its quality follows it, before the next address
      const after = src.slice(m.index + m[0].length, m.index + m[0].length + 400).split('"progressive_url"')[0]
      key += /"quality"\s*:\s*"HD"/i.test(after) ? ':hd' : ':sd'
    }
    out.push({ index: m.index, url, rank: VIDEO_RANK[key] ?? 4 })
  }
  return out
}

/** Every post text ("message":{…"text":"…"}) in the page. */
function messageCandidates(src) {
  const out = []
  for (const m of src.matchAll(/"message"\s*:\s*\{/g)) {
    // The text comes after the ranges lists, so look a little further
    const rest = src.slice(m.index, m.index + 20000)
    const t = rest.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    const text = t && decode(t[1])
    if (text && text.trim()) out.push({ index: m.index, text })
  }
  return out
}

/**
 * Picks the candidate that belongs to this reel. A reel page also carries the
 * next reels of the feed, each with its own caption and video, so the first
 * one in the page is often someone else's: the one nearest to the reel's
 * number wins.
 */
function nearest(list, src, id) {
  if (!list.length) return null
  if (!id) return list[0]
  const spots = []
  for (let i = src.indexOf(id); i >= 0 && spots.length < 400; i = src.indexOf(id, i + id.length)) spots.push(i)
  if (!spots.length) return list[0]
  const dist = (c) => Math.min(...spots.map((s) => Math.abs(s - c.index)))
  return list.reduce((best, c) => (dist(c) < dist(best) ? c : best))
}

/** The video address of this reel: the best quality close to it. */
function pickVideo(src, id) {
  const all = videoCandidates(src)
  const near = nearest(all, src, id)
  if (!near) return null
  // The other qualities of the same video sit within a few KB of each other
  const same = all.filter((c) => Math.abs(c.index - near.index) < 30000)
  return same.reduce((best, c) => (c.rank < best.rank ? c : best)).url
}

/** The name of the page or person who posted this reel. */
function ownerName(html, id) {
  for (const src of [html, unescapeOnce(html)]) {
    const list = []
    for (const m of src.matchAll(/"owner"\s*:\s*\{[^{}]*?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
      const name = decode(m[1])
      if (name) list.push({ index: m.index, name })
    }
    const near = nearest(list, src, id)
    if (near) return near.name
  }
  return findJsonStringAfter(html, '"owner":{', 'name')
}

export function parseFacebookPage(html, url = null) {
  const id = facebookVideoId(url) || facebookVideoId(metaContent(html, 'og:url')) || null
  let videoUrl = null
  let message = null
  for (const src of [html, unescapeOnce(html)]) {
    videoUrl ||= pickVideo(src, id)
    message ||= nearest(messageCandidates(src), src, id)?.text ?? null
  }
  videoUrl ||= metaContent(html, 'og:video:secure_url') || metaContent(html, 'og:video:url') || metaContent(html, 'og:video')

  const description =
    message ||
    captionFromFacebookOg(metaContent(html, 'og:description')) ||
    metaContent(html, 'description') ||
    null

  return {
    description,
    author: ownerName(html, id),
    comments: parseFacebookComments(html, description),
    videoUrl,
    videoId: id,
    loginWall: !description && !videoUrl && /id="login_form"|\/login\/\?next=/.test(html),
  }
}

/**
 * Runs inside the Facebook page in the hidden WebView (see pageReader.js).
 * Self-contained: it is sent to the page as source text. Waits for the reel
 * data, dismisses the cookie and login dialogs, and hands back the meta tags,
 * the scripts that hold the reel data and the comments the page shows.
 */
export async function facebookInPage(a) {
  const out = {}
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const clickByText = (words) => {
    for (const b of document.querySelectorAll('[role=button], button')) {
      const t = ((b.innerText || b.getAttribute('aria-label') || '') + '').trim().toLowerCase()
      if (t && words.indexOf(t) >= 0 && !b.__clicked) {
        b.__clicked = true
        try {
          b.click()
        } catch (e) {
          /* ignore */
        }
      }
    }
  }
  try {
    const keys = ['browser_native_hd_url', 'browser_native_sd_url', 'playable_url', 'progressive_url', '"message":{']
    const ready = () => {
      const html = document.documentElement.innerHTML
      return keys.some((k) => html.indexOf(k) >= 0)
    }
    for (let i = 0; i < (a.tries == null ? 24 : a.tries); i++) {
      // EU cookie banner, then the "see more on Facebook" login dialog
      clickByText([
        'decline optional cookies', 'only allow essential cookies', 'allow all cookies',
        'odmítnout volitelné soubory cookie', 'povolit všechny soubory cookie', 'povolit pouze nezbytné soubory cookie',
        'отхвърляне на незадължителните бисквитки', 'разрешаване на всички бисквитки',
      ])
      const close = document.querySelector('[role=dialog] [aria-label=Close], [role=dialog] [aria-label=Zavřít], [role=dialog] [aria-label=Затваряне]')
      if (close && !close.__clicked) {
        close.__clicked = true
        try {
          close.click()
        } catch (e) {
          /* ignore */
        }
      }
      if (ready() && i >= 2) break
      await sleep(500)
    }
    // Long captions and comments are cut with "See more"
    clickByText(['see more', 'zobrazit víc', 'zobrazit více', 'вижте още'])
    await sleep(400)
    out.href = location.href
    out.title = document.title
    const meta = []
    for (const m of document.querySelectorAll('meta[property^="og:"], meta[name=description]')) meta.push(m.outerHTML)
    out.meta = meta.join('')
    // Only the scripts with reel data, so a 5 MB page does not cross the bridge
    const parts = []
    let size = 0
    for (const s of document.querySelectorAll('script')) {
      const t = s.textContent || ''
      if (!/browser_native|playable_url|progressive_url|"message":\{|"body":\{"text"|"owner":\{/.test(t)) continue
      if (size + t.length > 4000000) break
      parts.push(t)
      size += t.length
    }
    out.scripts = parts.join('\n')
    // Comments the page renders: each sits in an article labelled "Comment by NAME"
    const dom = []
    for (const art of document.querySelectorAll('[role=article][aria-label]')) {
      const label = art.getAttribute('aria-label') || ''
      const m = label.match(/^(?:Comment by|Komentář od|Коментар от|Reply by|Odpověď od)\s+(.+?)(?:\s+\d.*)?$/i)
      if (!m) continue
      const texts = []
      for (const el of art.querySelectorAll('div[dir=auto]')) {
        const t = (el.innerText || '').trim()
        if (t && !el.querySelector('div[dir=auto]')) texts.push(t)
      }
      const text = texts.join('\n').trim()
      if (text) dom.push({ author: m[1], text: text })
    }
    out.dom = dom.slice(0, 60)
    out.loginWall = !ready() && /\/login|checkpoint/.test(location.pathname + location.search)
  } catch (e) {
    out.error = String((e && e.message) || e)
  }
  window.__cookingResult = out
}

/** What facebookInPage found, in the same shape as parseFacebookPage. */
export function parseInPageResult(r) {
  if (!r) return null
  const parsed = parseFacebookPage(`${r.meta ?? ''}\n${r.scripts ?? ''}`, r.href)
  const comments = [...parsed.comments]
  for (const c of r.dom ?? []) {
    if (c.text !== parsed.description && !comments.some((x) => x.text === c.text)) comments.push({ author: c.author, text: c.text, pinned: false })
  }
  return { ...parsed, comments, url: r.href || null, loginWall: !!r.loginWall && !parsed.description && !parsed.videoUrl }
}

export const FACEBOOK_LOGIN_URL = `${FB}/login/`
export const isFacebookSignedIn = async () => !!(await getCookie(FB, 'c_user'))

async function viaBrowser(url) {
  // Desktop: the mobile site keeps offering to open the Facebook app instead
  const r = await runInPage(url, facebookInPage, {}, { userAgent: DESKTOP_UA, timeoutMs: 40000, reinject: true })
  return parseInPageResult(r)
}

async function viaPage(url) {
  const page = await getText(url, { ua: DESKTOP_UA, headers: BROWSER_HEADERS, allowError: true })
  return { ...parseFacebookPage(page.text, page.url), url: page.status < 400 ? page.url : null, status: page.status }
}

async function viaCrawler(url) {
  const page = await getText(url, { ua: CRAWLER_UA, headers: { Accept: 'text/html' }, allowError: true })
  return { ...parseFacebookPage(page.text, page.url), url: page.status < 400 ? page.url : null, status: page.status }
}

export async function fetchFacebook(url) {
  const signedIn = await isFacebookSignedIn()
  const result = { description: null, author: null, videoUrl: null, comments: [] }
  const errors = []
  let finalUrl = null
  let loginWall = false
  let pageOk = false
  for (const attempt of [viaBrowser, viaPage, viaCrawler]) {
    try {
      // The crawler only helps when the browser-like GET was refused; it loops on Facebook's redirects otherwise
      if (attempt === viaCrawler && pageOk) continue
      const r = await attempt(attempt === viaCrawler && finalUrl ? finalUrl : url)
      if (attempt === viaPage && r && r.status < 400) pageOk = true
      if (r) {
        if (r.status >= 400) errors.push(`${attempt.name}: Facebook answered ${r.status}`)
        // A share link (/share/r/…) resolves to the real reel address
        if (r.url && !/\/share\/|\/login|checkpoint/.test(r.url)) finalUrl ||= r.url
        result.description ||= r.description || null
        result.author ||= r.author || null
        result.videoUrl ||= r.videoUrl || null
        for (const c of r.comments ?? []) if (!result.comments.some((x) => x.text === c.text)) result.comments.push(c)
        loginWall ||= !!r.loginWall
      }
    } catch (err) {
      errors.push(`${attempt.name}: ${err?.message ?? err}`)
    }
    if (result.description && result.videoUrl && (result.comments.length || !signedIn)) break
  }
  if (!result.description && !result.videoUrl) {
    throw new Error(
      loginWall && !signedIn
        ? 'Facebook only shows this reel to logged-in users. Sign in to Facebook under Settings and try again, or paste the description.'
        : 'Facebook did not show this reel. Paste the description instead.',
    )
  }
  // The author's comments first: they are the ones that hold recipes
  const rank = (c) => (result.author && c.author === result.author ? 1 : 0)
  result.comments.sort((x, y) => rank(y) - rank(x))
  return { platform: 'facebook', url: finalUrl || url, videoId: facebookVideoId(finalUrl), ...result, signedIn, errors, downloadHeaders: { Referer: `${FB}/` } }
}

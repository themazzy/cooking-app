import { DESKTOP_UA, getCookie, getText, postForm } from '../http.js'
import { runInPage } from '../pageReader.js'
import { findJsonString, findJsonStringAfter, htmlToText, metaContent, scriptJson } from './html.js'

// Instagram is tried four ways, best first, and the results are merged:
//  1. the logged-out GraphQL query Instagram's own website uses (same as yt-dlp, Oct 2026)
//  2. the data embedded in the post page (data-sjs scripts)
//  3. the public embed page
//  4. the og:description meta tag
// Instagram changes these often. When imports break, compare with the
// current yt-dlp Instagram extractor (yt_dlp/extractor/instagram.py).

const IG = 'https://www.instagram.com'
const API_HEADERS = {
  'X-IG-App-ID': '936619743392459',
  'X-ASBD-ID': '359341',
  'X-IG-WWW-Claim': '0',
  Origin: IG,
  Accept: '*/*',
}
const POST_QUERY = { name: 'PolarisLoggedOutDesktopWWWPostRootContentQuery', docId: '27130156389949648' }
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function instagramShortcode(url) {
  return url.match(/instagram\.com\/(?:[^/]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null
}

/** Shortcode → numeric media id (base-64 digits). */
export function shortcodeToMediaId(code) {
  if (code.length > 28) code = code.slice(0, -28) // private posts carry 28 extra characters
  let n = 0n
  for (const c of code) n = n * 64n + BigInt(ALPHABET.indexOf(c))
  return n.toString()
}

/** The LSD token logged-out GraphQL requests need, from the home page. */
export function lsdToken(html) {
  return scriptJson(html, '__eqmc')?.l || html.match(/\["LSD",\[\],\{"token":"([^"]+)"/)?.[1] || null
}

/** Smallest video rendition: we only need the audio. */
function pickVideo(versions) {
  const usable = (versions ?? []).filter((v) => v?.url)
  usable.sort((a, b) => (a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0))
  return usable[0]?.url ?? null
}

/** Caption, author and video from a media object (`if_not_gated_logged_out`). */
export function fromMedia(media) {
  const item = Array.isArray(media) ? media[0] : media
  if (!item || typeof item !== 'object') return null
  const withVideo = item.video_versions?.length ? item : item.carousel_media?.find((m) => m.video_versions?.length)
  return {
    description: item.caption?.text ?? null,
    author: item.user?.username ?? null,
    videoUrl: pickVideo(withVideo?.video_versions),
    comments: normalizeComments([
      ...(item.comments_connection?.edges ?? []).map((e) => e?.node),
      ...(item.comments ?? []),
      ...(item.preview_comments ?? []),
    ]),
  }
}

/** [{ author, text, pinned }] from Instagram comment objects, without duplicates. */
export function normalizeComments(list) {
  const seen = new Set()
  const out = []
  for (const c of list ?? []) {
    if (!c?.text || seen.has(c.text)) continue
    seen.add(c.text)
    out.push({ author: c.user?.username ?? c.owner?.username ?? c.author ?? null, text: c.text, pinned: !!(c.is_pinned ?? c.pinned) })
  }
  return out
}

export function parseGraphqlResponse(text) {
  try {
    const json = JSON.parse(text.replace(/^for \(;;\);/, ''))
    return fromMedia(json?.data?.xig_polaris_media?.if_not_gated_logged_out)
  } catch {
    return null
  }
}

function deepFind(obj, key, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 40) return null
  if (key in obj) return obj[key]
  for (const v of Object.values(obj)) {
    const found = deepFind(v, key, depth + 1)
    if (found) return found
  }
  return null
}

/** Media data the post page ships in <script data-sjs> blocks. */
export function parsePostPage(html) {
  for (const m of html.matchAll(/<script\b[^>]*\bdata-sjs[^>]*>(\{[\s\S]+?\})<\/script>/g)) {
    if (!m[1].includes('xig_polaris_media')) continue
    try {
      const media = deepFind(JSON.parse(m[1]), 'xig_polaris_media')
      const parsed = fromMedia(media?.if_not_gated_logged_out)
      if (parsed) return parsed
    } catch {
      // not JSON after all
    }
  }
  return null
}

/** parsePostPage, with the older page fields filled in per field where it has gaps. */
export function parsePostPageWithFallbacks(html) {
  const parsed = parsePostPage(html) ?? { description: null, author: null, videoUrl: null }
  return {
    ...parsed,
    description: parsed.description || captionFromOgDescription(metaContent(html, 'og:description')),
    videoUrl: parsed.videoUrl || findJsonString(html, 'video_url') || metaContent(html, 'og:video'),
  }
}

/** Caption, author and video address from the public embed page. */
export function parseInstagramEmbed(html) {
  let description = findJsonStringAfter(html, '"edge_media_to_caption"', 'text')
  if (!description) {
    // Rendered caption block: <div class="Caption"><a class="CaptionUsername">user</a>text…
    const block = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/i)?.[1]
    if (block) description = htmlToText(block.replace(/<a[^>]*class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/i, '')) || null
  }
  return {
    description,
    author: findJsonStringAfter(html, '"owner"', 'username') ?? html.match(/class="UsernameText"[^>]*>([^<]+)</)?.[1] ?? null,
    videoUrl: findJsonString(html, 'video_url'),
  }
}

/** og:description looks like `12K likes, 80 comments - user on May 1, 2026: "caption"` */
export function captionFromOgDescription(og) {
  if (!og) return null
  const m = og.match(/:\s*["“]([\s\S]*)["”]\.?\s*$/)
  return (m ? m[1] : og).trim() || null
}

async function viaGraphql(code, url, gate) {
  const home = await getText(`${IG}/`, { ua: DESKTOP_UA, allowError: true })
  const lsd = lsdToken(home.text)
  const mediaId = shortcodeToMediaId(code)
  // Sets the csrftoken cookie for logged-out access, and says whether the
  // post is gated ("not available to everyone" = logged-in users only)
  const ruling = await getText(`${IG}/api/v1/web/get_ruling_for_content/?content_type=MEDIA&target_id=${mediaId}`, {
    ua: DESKTOP_UA,
    headers: API_HEADERS,
    allowError: true,
  })
  gate.title = parseRuling(ruling.text)
  if (!lsd) return null
  const csrf = await getCookie(IG, 'csrftoken')
  const { text } = await postForm(
    `${IG}/api/graphql`,
    {
      lsd,
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: POST_QUERY.name,
      server_timestamps: 'true',
      variables: JSON.stringify({ media_id: mediaId }),
      doc_id: POST_QUERY.docId,
    },
    {
      headers: {
        ...API_HEADERS,
        'X-FB-Friendly-Name': POST_QUERY.name,
        'X-FB-LSD': lsd,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: url,
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
    },
  )
  return parseGraphqlResponse(text)
}

/** Logged-in media info (needs the sessionid cookie from signing in). */
async function viaSignedIn(code) {
  const csrf = await getCookie(IG, 'csrftoken')
  const { text } = await getText(`${IG}/api/v1/media/${shortcodeToMediaId(code)}/info/`, {
    ua: DESKTOP_UA,
    headers: { ...API_HEADERS, Referer: `${IG}/`, ...(csrf ? { 'X-CSRFToken': csrf } : {}) },
    allowError: true,
  })
  try {
    return fromMedia(JSON.parse(text)?.items?.[0])
  } catch {
    return null
  }
}

export const INSTAGRAM_LOGIN_URL = `${IG}/accounts/login/`
export const isInstagramSignedIn = async () => !!(await getCookie(IG, 'sessionid'))

/** Title of a gating ruling, e.g. "Obsah není dostupný pro všechny", or null when the post is open. */
export function parseRuling(text) {
  try {
    const r = JSON.parse(text)
    return r?.gating_type_thrift != null && r?.title ? r.title : null
  } catch {
    return null
  }
}

/**
 * Runs inside the Instagram page in the hidden WebView (see pageReader.js).
 * Self-contained: it is sent to the page as source text.
 */
export async function instagramInPage(a) {
  const out = { lsd: false }
  const grab = async (res) => ({ status: res.status, body: (await res.text()).slice(0, 3000000) })
  try {
    const html = document.documentElement.innerHTML
    let lsd = null
    const m = html.match(/"LSD",\[\],\{"token":"([^"]+)"/)
    if (m) lsd = m[1]
    if (!lsd) {
      try {
        lsd = JSON.parse(document.getElementById('__eqmc').textContent).l
      } catch (e) {
        lsd = null
      }
    }
    out.lsd = !!lsd
    const headers = () => {
      const h = { 'X-IG-App-ID': a.appId, 'X-ASBD-ID': a.asbdId, 'X-IG-WWW-Claim': '0', 'X-Requested-With': 'XMLHttpRequest' }
      const c = document.cookie.match(/csrftoken=([^;]+)/)
      if (c) h['X-CSRFToken'] = c[1]
      return h
    }
    out.ruling = await grab(
      await fetch('/api/v1/web/get_ruling_for_content/?content_type=MEDIA&target_id=' + a.mediaId, { headers: headers(), credentials: 'include' }),
    )
    out.info = await grab(await fetch('/api/v1/media/' + a.mediaId + '/info/', { headers: headers(), credentials: 'include' }))
    // Comments, page by page until the author's (usually pinned) comment
    // turns up. Collected from anywhere in the response, since pinned and
    // threaded comments sit under different keys.
    let owner = null
    try {
      owner = JSON.parse(out.info.body).items[0].user.username
    } catch (e) {
      owner = null
    }
    const list = []
    const seen = {}
    const collect = (o, depth) => {
      if (!o || typeof o !== 'object' || depth > 12) return
      if (Array.isArray(o)) return o.forEach((x) => collect(x, depth + 1))
      if (typeof o.text === 'string' && o.user && o.user.username && (o.pk || o.id)) {
        const key = String(o.pk || o.id)
        if (!seen[key]) {
          seen[key] = true
          list.push({ user: { username: o.user.username }, text: o.text, is_pinned: !!(o.is_pinned || o.is_pinned_comment || o.pinned) })
        }
      }
      for (const k in o) if (k !== 'user' && k !== 'caption') collect(o[k], depth + 1)
    }
    const authorFound = () => list.some((c) => (c.is_pinned || (owner && c.user.username === owner)) && c.text.length > 60)
    out.commentPages = []
    let cursor = ''
    let status = null
    for (let page = 0; page < (a.commentPages == null ? 8 : a.commentPages); page++) {
      const res = await fetch(
        '/api/v1/media/' + a.mediaId + '/comments/?can_support_threading=true&permalink_enabled=false' + cursor,
        { headers: headers(), credentials: 'include' },
      )
      status = res.status
      const text = await res.text()
      let json = null
      try {
        json = JSON.parse(text)
      } catch (e) {
        json = null
      }
      const before = list.length
      collect(json, 0)
      out.commentPages.push({ status: res.status, keys: json ? Object.keys(json).join(',') : text.slice(0, 200), added: list.length - before })
      if (!json || authorFound()) break
      const next = json.next_min_id || json.next_max_id
      if (!next) break
      cursor = (json.next_min_id ? '&min_id=' : '&max_id=') + encodeURIComponent(typeof next === 'string' ? next : JSON.stringify(next))
    }
    out.owner = owner
    out.comments = { status: status, body: JSON.stringify({ comments: list }) }
    if (lsd) {
      const body = new URLSearchParams({
        lsd: lsd,
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: a.queryName,
        server_timestamps: 'true',
        variables: JSON.stringify({ media_id: a.mediaId }),
        doc_id: a.docId,
      })
      const h = Object.assign(headers(), { 'X-FB-Friendly-Name': a.queryName, 'X-FB-LSD': lsd })
      out.graphql = await grab(await fetch('/api/graphql', { method: 'POST', body: body, headers: h, credentials: 'include' }))
    }
    const h1 = document.querySelector('h1')
    out.h1 = h1 && h1.innerText.length > 40 ? h1.innerText : null
    // Comments the page itself renders (logged out, the API refuses them).
    // User text is in span[dir=auto]; the author link is the nearest
    // profile link above it. Class names change too often to rely on.
    const readDom = () => {
      for (const b of document.querySelectorAll('[role=button], button, span')) {
        const t = (b.innerText || '').trim().toLowerCase()
        if ((t === 'more' || t === 'více' || t === '… more' || t === '… více') && !b.__clicked) {
          b.__clicked = true
          try {
            b.click()
          } catch (e) {
            /* ignore */
          }
        }
      }
      const found = []
      for (const el of document.querySelectorAll('span[dir=auto], h1[dir=auto]')) {
        const text = (el.innerText || el.textContent || '').trim()
        if (text.length < 25 || el.querySelector('span[dir=auto]')) continue
        let author = null
        let node = el
        for (let i = 0; i < 8 && node && !author; i++) {
          node = node.parentElement
          const link = node && node.querySelector('a[href^="/"][role=link]')
          const m = link && link.getAttribute('href').match(/^\/([A-Za-z0-9._]+)\/$/)
          if (m) author = m[1]
        }
        // Without a profile link it is page chrome (login wall, cookie banner)
        if (author) found.push({ author: author, text: text })
      }
      return found
    }
    let dom = []
    const tries = a.domTries == null ? 16 : a.domTries
    for (let i = 0; i < tries; i++) {
      dom = readDom()
      if (dom.length > 1 && i >= 4) break
      await new Promise((r) => setTimeout(r, 500))
    }
    out.dom = dom.slice(0, 40)
    out.pageText = (document.body && document.body.innerText.length) || 0
  } catch (e) {
    out.error = String((e && e.message) || e)
  }
  window.__cookingResult = out
}

/** Instagram data fetched from inside a real browser page (the hidden WebView). */
export function parseInPageResult(r) {
  if (!r) return null
  let media = null
  try {
    media = fromMedia(JSON.parse(r.info?.body ?? 'null')?.items?.[0])
  } catch {
    media = null
  }
  const fromGraphql = r.graphql ? parseGraphqlResponse(r.graphql.body) : null
  let listed = []
  try {
    listed = JSON.parse(r.comments?.body ?? 'null')?.comments ?? []
  } catch {
    listed = []
  }
  return {
    comments: normalizeComments([
      ...(media?.comments ?? []),
      ...(fromGraphql?.comments ?? []),
      ...listed,
      // The caption shows up in the DOM too; leave it out of the comments
      ...(r.dom ?? []).filter((c) => c.text !== (media?.description || fromGraphql?.description)),
    ]),
    description: media?.description || fromGraphql?.description || r.h1 || null,
    author: media?.author || fromGraphql?.author || null,
    videoUrl: media?.videoUrl || fromGraphql?.videoUrl || null,
    gate: r.ruling ? parseRuling(r.ruling.body) : null,
  }
}

async function viaBrowser(code, url, gate) {
  const r = await runInPage(`${IG}/p/${code}/`, instagramInPage, {
    mediaId: shortcodeToMediaId(code),
    appId: API_HEADERS['X-IG-App-ID'],
    asbdId: API_HEADERS['X-ASBD-ID'],
    queryName: POST_QUERY.name,
    docId: POST_QUERY.docId,
  }, { userAgent: DESKTOP_UA, timeoutMs: 45000 }) // the mobile site tries to open the Instagram app instead
  const parsed = parseInPageResult(r)
  if (parsed?.gate) gate.title = parsed.gate
  return parsed
}

async function viaPostPage(code) {
  const page = await getText(`${IG}/p/${code}/`, { ua: DESKTOP_UA, allowError: true })
  return parsePostPageWithFallbacks(page.text)
}

async function viaEmbed(code) {
  const embed = await getText(`${IG}/p/${code}/embed/captioned/`, { ua: DESKTOP_UA, allowError: true })
  return parseInstagramEmbed(embed.text)
}

export async function fetchInstagram(url) {
  if (/instagram\.com\/share\//.test(url)) {
    // Newer share links (/share/reel/<id>) redirect to the real post URL
    url = (await getText(url, { ua: DESKTOP_UA, allowError: true })).url
  }
  const code = instagramShortcode(url)
  if (!code) throw new Error('This does not look like an Instagram reel or post link.')

  const signedIn = await isInstagramSignedIn()
  const gate = { title: null }
  const result = { description: null, author: null, videoUrl: null, comments: [] }
  const errors = []
  const attempts = signedIn
    ? [viaBrowser, viaSignedIn, viaGraphql, viaPostPage, viaEmbed]
    : [viaBrowser, viaGraphql, viaPostPage, viaEmbed]
  for (const attempt of attempts) {
    try {
      const r = await attempt(code, url, gate)
      if (r) {
        result.description ||= r.description || null
        result.author ||= r.author || null
        result.videoUrl ||= r.videoUrl || null
        result.comments = normalizeComments([...result.comments, ...(r.comments ?? [])])
      }
    } catch (err) {
      errors.push(`${attempt.name}: ${err?.message ?? err}`)
    }
    if (result.description && result.videoUrl && result.comments.length) break
  }
  if (!result.description && !result.videoUrl && gate.title) {
    throw new Error(
      signedIn
        ? `Instagram says "${gate.title}" and won't show this reel even when signed in.`
        : `Instagram says "${gate.title}": it only shows this reel to logged-in users. Sign in to Instagram under Settings and try again.`,
    )
  }
  // Author's and pinned comments first: they are the ones that hold recipes
  const rank = (c) => (c.pinned ? 2 : 0) + (result.author && c.author === result.author ? 1 : 0)
  result.comments = [...result.comments].sort((x, y) => rank(y) - rank(x))
  return { platform: 'instagram', url, ...result, signedIn, errors, downloadHeaders: { Referer: `${IG}/` } }
}

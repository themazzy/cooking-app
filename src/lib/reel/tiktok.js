import { getJson, getText } from '../http.js'
import { findJsonString, metaContent, scriptJson } from './html.js'

export const TIKTOK_HEADERS = { Referer: 'https://www.tiktok.com/' }

/** Pulls the caption and video address out of a TikTok video page. */
export function parseTikTokPage(html) {
  const universal = scriptJson(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__')
  let item = universal?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
  if (!item) {
    // Older page layout
    const sigi = scriptJson(html, 'SIGI_STATE')
    item = sigi?.ItemModule && Object.values(sigi.ItemModule)[0]
  }
  return {
    description: item?.desc || metaContent(html, 'og:description') || null,
    author: item?.author?.uniqueId ?? item?.author ?? null,
    videoUrl: item?.video?.playAddr || item?.video?.downloadAddr || findJsonString(html, 'playAddr') || null,
  }
}

/** [{ author, text, pinned }] from a TikTok comment list response. */
export function parseTikTokComments(json) {
  return (json?.comments ?? [])
    .filter((c) => c?.text)
    .map((c) => ({
      author: c.user?.unique_id ?? c.user?.uniqueId ?? null,
      text: c.text,
      pinned: !!(c.stick_position > 0 || c.author_pin || c.is_pinned),
    }))
}

export const tiktokVideoId = (url) => url.match(/\/(?:video|photo)\/(\d+)/)?.[1] ?? null

/** Comment pages until the author's comment shows up (recipes often hide there). */
async function fetchTikTokComments(videoId, author, pages = 5) {
  const out = []
  let cursor = 0
  for (let page = 0; page < pages; page++) {
    const json = await getJson(
      `https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${videoId}&count=50&cursor=${cursor}`,
      { headers: TIKTOK_HEADERS },
    )
    out.push(...parseTikTokComments(json))
    if (out.some((c) => c.pinned || (author && c.author === author))) break
    if (!json?.has_more) break
    cursor = json.cursor
  }
  return out
}

export async function fetchTikTok(url) {
  // Short links (vm.tiktok.com) redirect to the full video URL
  const page = await getText(url)
  const parsed = parseTikTokPage(page.text)

  if (!parsed.description) {
    // The official oEmbed endpoint is public and returns the caption as `title`
    try {
      const oembed = await getJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(page.url)}`)
      parsed.description = oembed.title || null
      parsed.author ??= oembed.author_unique_id ?? null
    } catch {
      // keep whatever the page gave us
    }
  }
  const errors = []
  let comments = []
  const videoId = tiktokVideoId(page.url)
  if (videoId) {
    try {
      comments = await fetchTikTokComments(videoId, parsed.author)
    } catch (err) {
      errors.push(`comments: ${err?.message ?? err}`)
    }
  }
  return { platform: 'tiktok', url: page.url, ...parsed, comments, errors, downloadHeaders: TIKTOK_HEADERS }
}

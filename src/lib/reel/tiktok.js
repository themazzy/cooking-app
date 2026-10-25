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
  return { platform: 'tiktok', url: page.url, ...parsed, downloadHeaders: TIKTOK_HEADERS }
}

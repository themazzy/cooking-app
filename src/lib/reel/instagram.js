import { DESKTOP_UA, getText } from '../http.js'
import { findJsonString, findJsonStringAfter, htmlToText, metaContent } from './html.js'

export function instagramShortcode(url) {
  return url.match(/instagram\.com\/(?:[^/]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null
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

export async function fetchInstagram(url) {
  const code = instagramShortcode(url)
  if (!code) throw new Error('This does not look like an Instagram reel or post link.')

  const embed = await getText(`https://www.instagram.com/p/${code}/embed/captioned/`, { ua: DESKTOP_UA })
  const parsed = parseInstagramEmbed(embed.text)

  if (!parsed.description || !parsed.videoUrl) {
    try {
      const page = await getText(`https://www.instagram.com/reel/${code}/`)
      parsed.description ||= captionFromOgDescription(metaContent(page.text, 'og:description'))
      parsed.videoUrl ||= findJsonString(page.text, 'video_url') || metaContent(page.text, 'og:video')
    } catch {
      // the embed page is the main source; the full page often wants a login
    }
  }
  return { platform: 'instagram', url, ...parsed, downloadHeaders: { Referer: 'https://www.instagram.com/' } }
}

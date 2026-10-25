import { getText } from '../http.js'
import { findJsonString, findJsonStringAfter, metaContent } from './html.js'

const VIDEO_KEYS = ['browser_native_hd_url', 'browser_native_sd_url', 'playable_url_quality_hd', 'playable_url']

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

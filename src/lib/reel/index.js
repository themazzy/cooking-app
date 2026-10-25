import { fetchFacebook } from './facebook.js'
import { fetchInstagram } from './instagram.js'
import { fetchTikTok } from './tiktok.js'

export function detectPlatform(url) {
  let host
  try {
    host = new URL(url).hostname.replace(/^www\.|^m\./, '')
  } catch {
    return null
  }
  if (host.endsWith('tiktok.com')) return 'tiktok'
  if (host.endsWith('instagram.com')) return 'instagram'
  if (host.endsWith('facebook.com') || host === 'fb.watch') return 'facebook'
  return null
}

/** First http(s) URL in a piece of shared text ("Check this out https://…"). */
export function extractUrl(text) {
  return text?.match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? null
}

const FETCHERS = { tiktok: fetchTikTok, instagram: fetchInstagram, facebook: fetchFacebook }

/**
 * Loads a reel's description and video address.
 * Returns { platform, url, description, author, videoUrl, downloadHeaders }.
 */
export async function loadReel(url) {
  const platform = detectPlatform(url)
  if (!platform) throw new Error('Only Instagram, TikTok and Facebook links are supported.')
  return FETCHERS[platform](url)
}

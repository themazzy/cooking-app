import { DESKTOP_UA, getJson, getText, postJson } from '../http.js'

// EU visitors get a cookie consent page first; this cookie skips it (as yt-dlp does)
const YT_HEADERS = { Cookie: 'SOCS=CAI; CONSENT=YES+1', 'Accept-Language': 'en,cs;q=0.8' }
const YT = 'https://www.youtube.com'

export function youtubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    return u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1] ?? u.searchParams.get('v')
  } catch {
    return null
  }
}

/** `var ytInitialData = {...};` style assignments in the page. */
export function pageJson(html, name) {
  const start = html.search(new RegExp(`(?:var |window\\[")${name}(?:"\\])?\\s*=\\s*\\{`))
  if (start < 0) return null
  const open = html.indexOf('{', start)
  // Walk to the matching brace, skipping strings
  let depth = 0
  let inString = false
  for (let i = open; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(html.slice(open, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

function deepFind(node, test, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 40) return null
  if (test(node)) return node
  for (const v of Object.values(node)) {
    const found = deepFind(v, test, depth + 1)
    if (found) return found
  }
  return null
}

/** Continuation token that loads the first page of comments. */
export function commentsToken(initialData) {
  const section =
    deepFind(initialData, (n) => n.sectionIdentifier === 'comment-item-section') ??
    deepFind(initialData, (n) => typeof n.panelIdentifier === 'string' && n.panelIdentifier.includes('comment'))
  return deepFind(section, (n) => typeof n.continuationCommand?.token === 'string')?.continuationCommand.token ?? null
}

const runsText = (t) => t?.simpleText ?? (t?.runs ?? []).map((r) => r.text).join('') ?? ''

/** [{ author, text, pinned }] from a youtubei/v1/next comments answer (new and old layouts). */
export function parseYouTubeComments(json) {
  const out = []
  // New layout: comment data lives in entity payloads, pinned flags in the view models
  const pinnedIds = new Set()
  const walk = (n, depth = 0) => {
    if (!n || typeof n !== 'object' || depth > 40) return
    if (n.commentViewModel?.pinnedText && n.commentViewModel.commentId) pinnedIds.add(n.commentViewModel.commentId)
    if (n.pinnedText && n.commentId) pinnedIds.add(n.commentId)
    const old = n.commentRenderer
    if (old) {
      out.push({
        author: runsText(old.authorText) || null,
        text: runsText(old.contentText),
        pinned: !!old.pinnedCommentBadge,
        creator: !!old.authorIsChannelOwner,
      })
    }
    for (const v of Object.values(n)) walk(v, depth + 1)
  }
  walk(json)
  for (const m of json?.frameworkUpdates?.entityBatchUpdate?.mutations ?? []) {
    const p = m?.payload?.commentEntityPayload
    if (!p?.properties?.content?.content) continue
    out.push({
      author: p.author?.displayName ?? null,
      text: p.properties.content.content,
      pinned: pinnedIds.has(p.properties.commentId),
      creator: !!p.author?.isCreator,
    })
  }
  return out.filter((c) => c.text)
}

/** Caption track text from a json3 timedtext answer. */
export function captionsText(json) {
  return (json?.events ?? [])
    .map((e) => (e.segs ?? []).map((s) => s.utf8).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// The Android VR client still gets plain media URLs without extra tokens
const VR_CLIENT = { clientName: 'ANDROID_VR', clientVersion: '1.62.27', deviceMake: 'Oculus', deviceModel: 'Quest 3', androidSdkVersion: 32, osName: 'Android', osVersion: '12L', hl: 'en' }
const VR_UA = 'com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip'

async function audioUrl(videoId) {
  const player = await postJson(
    `${YT}/youtubei/v1/player?prettyPrint=false`,
    { context: { client: VR_CLIENT }, videoId, contentCheckOk: true, racyCheckOk: true },
    { ua: VR_UA, headers: { 'X-YouTube-Client-Name': '28', 'X-YouTube-Client-Version': VR_CLIENT.clientVersion } },
  )
  const formats = [...(player?.streamingData?.adaptiveFormats ?? []), ...(player?.streamingData?.formats ?? [])].filter((f) => f.url)
  // Smallest AAC audio decodes everywhere; else the smallest muxed mp4
  const audio = formats.filter((f) => f.mimeType?.startsWith('audio/mp4')).sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))[0]
  const muxed = formats.filter((f) => f.mimeType?.startsWith('video/mp4') && f.audioQuality).sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))[0]
  return (audio ?? muxed)?.url ?? null
}

export async function fetchYouTube(url) {
  const id = youtubeId(url)
  if (!id) throw new Error('This does not look like a YouTube video or Short link.')
  const page = await getText(`${YT}/watch?v=${id}`, { ua: DESKTOP_UA, headers: YT_HEADERS })
  const player = pageJson(page.text, 'ytInitialPlayerResponse')
  const initialData = pageJson(page.text, 'ytInitialData')
  const details = player?.videoDetails ?? {}
  const errors = []
  const result = {
    platform: 'youtube',
    url,
    description: [details.title, details.shortDescription].filter(Boolean).join('\n\n') || null,
    author: details.author ?? null,
    videoUrl: null,
    transcript: null,
    comments: [],
    errors,
    downloadHeaders: { 'User-Agent': VR_UA },
  }

  // Captions (uploaded or automatic) save downloading and transcribing the video
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
  const track = tracks.find((t) => t.kind !== 'asr') ?? tracks[0]
  if (track?.baseUrl) {
    try {
      result.transcript = captionsText(await getJson(`${track.baseUrl}&fmt=json3`, { ua: DESKTOP_UA, headers: YT_HEADERS })) || null
    } catch (err) {
      errors.push(`captions: ${err?.message ?? err}`)
    }
  }

  const token = commentsToken(initialData)
  const clientVersion = page.text.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? '2.20251020.01.00'
  if (token) {
    try {
      let continuation = token
      for (let n = 0; n < 3 && continuation; n++) {
        const json = await postJson(
          `${YT}/youtubei/v1/next?prettyPrint=false`,
          { context: { client: { clientName: 'WEB', clientVersion, hl: 'en' } }, continuation },
          { headers: YT_HEADERS },
        )
        const found = parseYouTubeComments(json)
        result.comments.push(...found.map((c) => ({ ...c, author: c.creator ? result.author : c.author })))
        if (result.comments.some((c) => c.pinned || c.creator)) break
        continuation = deepFind(json, (x) => typeof x.continuationCommand?.token === 'string')?.continuationCommand.token ?? null
      }
    } catch (err) {
      errors.push(`comments: ${err?.message ?? err}`)
    }
  }

  if (!result.transcript) {
    try {
      result.videoUrl = await audioUrl(id)
    } catch (err) {
      errors.push(`video: ${err?.message ?? err}`)
    }
  }
  if (!result.description && !result.transcript && !result.videoUrl) throw new Error('YouTube did not return this video.')
  return result
}

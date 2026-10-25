import { describe, expect, it } from 'vitest'
import { findJsonString, metaContent } from './html.js'
import { detectPlatform, extractUrl } from './index.js'
import {
  captionFromOgDescription,
  instagramShortcode,
  lsdToken,
  parseGraphqlResponse,
  parseInstagramEmbed,
  parsePostPage,
  parsePostPageWithFallbacks,
  shortcodeToMediaId,
} from './instagram.js'
import { parseFacebookPage } from './facebook.js'
import { parseTikTokPage } from './tiktok.js'

// Fixtures are trimmed, hand-written copies of the page structures these
// parsers rely on. When a platform changes its pages, update them from a
// real page saved on the phone.

describe('detectPlatform / extractUrl', () => {
  it.each([
    ['https://www.tiktok.com/@chef/video/7412345678901234567', 'tiktok'],
    ['https://vm.tiktok.com/ZMabc123/', 'tiktok'],
    ['https://www.instagram.com/reel/C9xYz_AbCdE/?igsh=abc', 'instagram'],
    ['https://www.facebook.com/reel/1234567890', 'facebook'],
    ['https://fb.watch/abcDEF/', 'facebook'],
    ['https://m.facebook.com/share/r/xyz/', 'facebook'],
    ['https://www.recepty.cz/recept/x', null],
  ])('%s', (url, platform) => expect(detectPlatform(url)).toBe(platform))

  it('pulls the link out of shared text', () => {
    expect(extractUrl('Look at this! https://vm.tiktok.com/ZMabc123/ 😍')).toBe('https://vm.tiktok.com/ZMabc123/')
  })
})

describe('TikTok', () => {
  it('reads caption and video from the rehydration JSON', () => {
    const data = {
      __DEFAULT_SCOPE__: {
        'webapp.video-detail': {
          itemInfo: {
            itemStruct: {
              desc: 'Creamy pasta 🍝 200g pasta, 100ml cream #pasta',
              author: { uniqueId: 'chef' },
              video: { playAddr: 'https://v16.tiktokcdn.com/video.mp4?a=1&b=2' },
            },
          },
        },
      },
    }
    const html = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(data)}</script></html>`
    expect(parseTikTokPage(html)).toEqual({
      description: 'Creamy pasta 🍝 200g pasta, 100ml cream #pasta',
      author: 'chef',
      videoUrl: 'https://v16.tiktokcdn.com/video.mp4?a=1&b=2',
    })
  })

  it('falls back to og:description', () => {
    const html = '<meta property="og:description" content="Pasta &amp; sauce">'
    expect(parseTikTokPage(html).description).toBe('Pasta & sauce')
  })
})

describe('Instagram', () => {
  it.each([
    ['https://www.instagram.com/reel/C9xYz_AbCdE/?igsh=abc', 'C9xYz_AbCdE'],
    ['https://www.instagram.com/reels/C9xYz_AbCdE/', 'C9xYz_AbCdE'],
    ['https://www.instagram.com/p/C9xYz_AbCdE/', 'C9xYz_AbCdE'],
    ['https://www.instagram.com/chef/reel/C9xYz_AbCdE/', 'C9xYz_AbCdE'],
  ])('shortcode of %s', (url, code) => expect(instagramShortcode(url)).toBe(code))

  it('turns shortcodes into media ids like yt-dlp', () => {
    expect(shortcodeToMediaId('C9xYz_AbCdE')).toBe('3418622717613320004')
    expect(shortcodeToMediaId('DAbc-12_xyz')).toBe('3466491801932602547')
  })

  it('finds the LSD token', () => {
    expect(lsdToken('<script id="__eqmc" type="application/json">{"l":"AVq123"}</script>')).toBe('AVq123')
    expect(lsdToken('x ["LSD",[],{"token":"AVq456"},123] y')).toBe('AVq456')
  })

  const media = {
    caption: { text: '200 g mouky\n2 vejce' },
    user: { username: 'chef' },
    video_versions: [
      { width: 720, height: 1280, url: 'https://cdn/720.mp4' },
      { width: 480, height: 852, url: 'https://cdn/480.mp4' },
    ],
  }

  it('reads the GraphQL response and picks the smallest video', () => {
    const text = JSON.stringify({ data: { xig_polaris_media: { if_not_gated_logged_out: media } } })
    expect(parseGraphqlResponse(text)).toEqual({ description: '200 g mouky\n2 vejce', author: 'chef', videoUrl: 'https://cdn/480.mp4' })
    expect(parseGraphqlResponse('for (;;);{"data":{}}')).toBeNull()
  })

  it('reads media from the post page data-sjs scripts', () => {
    const sjs = { require: [['x', 'y', null, [{ __bbox: { result: { data: { xig_polaris_media: { if_not_gated_logged_out: media } } } } }]]] }
    const html = `<script type="application/json" data-sjs>{"other":1}</script><script type="application/json" data-sjs>${JSON.stringify(sjs)}</script>`
    expect(parsePostPage(html)).toMatchObject({ author: 'chef', videoUrl: 'https://cdn/480.mp4' })
  })

  it('fills post page gaps per field from og:description and video_url', () => {
    const noCaption = { ...media, caption: null }
    const sjs = { x: { xig_polaris_media: { if_not_gated_logged_out: noCaption } } }
    const html =
      '<meta property="og:description" content="5 likes - chef on May 1, 2026: &quot;2 vejce&quot;">' +
      `<script type="application/json" data-sjs>${JSON.stringify(sjs)}</script>`
    expect(parsePostPageWithFallbacks(html)).toMatchObject({ description: '2 vejce', videoUrl: 'https://cdn/480.mp4' })
    expect(parsePostPageWithFallbacks('<script>{"video_url":"https:\\/\\/cdn\\/old.mp4"}</script>').videoUrl).toBe('https://cdn/old.mp4')
  })

  it('reads double-encoded contextJSON from the embed page', () => {
    const media = {
      owner: { username: 'chef' },
      video_url: 'https://scontent.cdninstagram.com/v/reel.mp4?x=1&y=2',
      edge_media_to_caption: { edges: [{ node: { text: 'Suroviny:\n200 g mouky\n"nejlepší"' } }] },
    }
    const context = JSON.stringify({ context: { gql_data: { shortcode_media: media } } })
    const html = `<script>handle({"contextJSON":${JSON.stringify(context)}})</script>`
    expect(parseInstagramEmbed(html)).toEqual({
      description: 'Suroviny:\n200 g mouky\n"nejlepší"',
      author: 'chef',
      videoUrl: 'https://scontent.cdninstagram.com/v/reel.mp4?x=1&y=2',
    })
  })

  it('falls back to the rendered caption block', () => {
    const html = `<div class="Caption"><a class="CaptionUsername" href="#">chef</a><br><br>200 g mouky<br>2 vejce&nbsp;<div class="CaptionComments">View all</div></div>`
    expect(parseInstagramEmbed(html).description).toBe('200 g mouky\n2 vejce')
  })

  it('cleans the og:description prefix', () => {
    expect(captionFromOgDescription('1,234 likes, 56 comments - chef on May 1, 2026: "200 g mouky\n2 vejce".')).toBe(
      '200 g mouky\n2 vejce',
    )
  })
})

describe('Facebook', () => {
  it('reads an escaped playable_url and og:description', () => {
    const html =
      '<meta property="og:description" content="Recept: 2 vejce" />' +
      '<script>{"playable_url":"https:\\/\\/video.xx.fbcdn.net\\/v\\/reel.mp4?a=1\\u0026b=2"}</script>'
    expect(parseFacebookPage(html)).toMatchObject({
      description: 'Recept: 2 vejce',
      videoUrl: 'https://video.xx.fbcdn.net/v/reel.mp4?a=1&b=2',
      loginWall: false,
    })
  })

  it('detects the login wall', () => {
    expect(parseFacebookPage('<form id="login_form"></form>').loginWall).toBe(true)
  })
})

describe('html helpers', () => {
  it('finds meta tags with content before property', () => {
    expect(metaContent('<meta content="Hi" property="og:title">', 'og:title')).toBe('Hi')
  })
  it('decodes JSON escapes', () => {
    expect(findJsonString('{"a":"line\\nnext \\u00e9"}', 'a')).toBe('line\nnext é')
  })
})

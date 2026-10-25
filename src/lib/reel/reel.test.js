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
    expect(parseGraphqlResponse(text)).toEqual({ description: '200 g mouky\n2 vejce', author: 'chef', videoUrl: 'https://cdn/480.mp4', comments: [] })
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

describe('Instagram gating', async () => {
  const { parseRuling } = await import('./instagram.js')
  it('reads a logged-in-only ruling', () => {
    const text =
      '{"title":"Obsah není dostupný pro všechny","category_id":null,"description":"Některé okruhy uživatelů to nevidí.","gating_type_thrift":3,"status":"ok"}'
    expect(parseRuling(text)).toBe('Obsah není dostupný pro všechny')
  })
  it('treats an open post as not gated', () => {
    expect(parseRuling('{"status":"ok"}')).toBeNull()
    expect(parseRuling('<html>')).toBeNull()
  })
})

describe('Instagram in-page fetch', async () => {
  const { instagramInPage, parseInPageResult } = await import('./instagram.js')
  const { vi, afterEach } = await import('vitest')
  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.__cookingResult
  })

  it('pages through comments until the pinned author comment', async () => {
    document.documentElement.innerHTML = '<body></body>'
    const urls = []
    vi.stubGlobal('fetch', async (u) => {
      urls.push(u)
      let body = '{}'
      if (u.includes('/info/')) body = JSON.stringify({ items: [{ user: { username: 'chef' } }] })
      else if (u.includes('/comments/') && !u.includes('min_id'))
        body = JSON.stringify({ comments: [{ pk: 1, user: { username: 'fan' }, text: 'yum' }], next_min_id: '{"cursor":"x"}' })
      else if (u.includes('/comments/'))
        body = JSON.stringify({
          comments: [{ pk: 2, user: { username: 'chef' }, is_pinned: true, text: 'Ingredients for 2 servings:\n• Ground beef: 400g\n• Fresh tomatoes: 250g' }],
          next_min_id: 'more',
        })
      return { status: 200, text: async () => body }
    })
    await (0, eval)(`(${instagramInPage.toString()})(${JSON.stringify({ mediaId: '1', domTries: 0 })})`)
    const r = window.__cookingResult
    expect(urls.filter((u) => u.includes('/comments/'))).toHaveLength(2)
    expect(urls.some((u) => u.includes('min_id=%7B%22cursor'))).toBe(true)
    const parsed = parseInPageResult(r)
    expect(parsed.comments.map((c) => c.author)).toEqual(['fan', 'chef'])
    expect(parsed.comments[1].pinned).toBe(true)
  })

  it('reads comments rendered in the page', async () => {
    document.documentElement.innerHTML =
      '<body><ul><li><div><a href="/derevensky.food/" role="link">derevensky.food</a><span dir="auto">Ingredients for 2 servings:\n• Ground beef: 400g\n• Fresh tomatoes: 250g</span></div></li>' +
      '<li><div><a href="/fan/" role="link">fan</a><span dir="auto">ok</span></div></li></ul></body>'
    vi.stubGlobal('fetch', async () => ({ status: 200, text: async () => '{"message":"login_required"}' }))
    await (0, eval)(`(${instagramInPage.toString()})(${JSON.stringify({ mediaId: '1', domTries: 1 })})`)
    const r = parseInPageResult(window.__cookingResult)
    expect(r.comments).toHaveLength(1)
    expect(r.comments[0].author).toBe('derevensky.food')
    expect(r.comments[0].text).toContain('Ground beef: 400g')
  })

  it('runs as standalone source text and stores the responses', async () => {
    document.documentElement.innerHTML = '<head><script>x=["LSD",[],{"token":"AVlsd"},1]</script></head><body><h1>short</h1></body>'
    const calls = []
    vi.stubGlobal('fetch', async (u, opts) => {
      calls.push([u, opts?.method ?? 'GET', opts?.headers?.['X-FB-LSD']])
      const body = u.includes('graphql')
        ? JSON.stringify({ data: { xig_polaris_media: { if_not_gated_logged_out: { caption: { text: '200 g mouky' }, video_versions: [{ url: 'https://cdn/v.mp4' }] } } } })
        : u.includes('ruling')
          ? '{"title":"","status":"ok"}'
          : u.includes('/comments/')
            ? JSON.stringify({ comments: [{ pk: '9', user: { username: 'chef' }, text: 'Ingredients: 200 g mouky, 2 vejce' }] })
            : '{"message":"login_required"}'
      return { status: 200, text: async () => body }
    })
    // Same path as the app: the function is turned into source text and evaluated
    const script = `(${instagramInPage.toString()})(${JSON.stringify({ mediaId: '1', appId: 'a', asbdId: 'b', queryName: 'Q', docId: 'D', domTries: 1 })})`
    await (0, eval)(script)
    const r = window.__cookingResult
    expect(r.lsd).toBe(true)
    expect(calls.map((c) => c[1])).toEqual(['GET', 'GET', 'GET', 'POST'])
    expect(calls[3][2]).toBe('AVlsd')
    expect(parseInPageResult(r)).toEqual({
      description: '200 g mouky',
      author: null,
      videoUrl: 'https://cdn/v.mp4',
      gate: null,
      comments: [{ author: 'chef', text: 'Ingredients: 200 g mouky, 2 vejce', pinned: false }],
    })
  })

  it('prefers signed-in media info', () => {
    const info = { items: [{ caption: { text: 'Signed in caption' }, user: { username: 'chef' }, video_versions: [{ url: 'https://cdn/i.mp4' }] }] }
    expect(parseInPageResult({ info: { status: 200, body: JSON.stringify(info) } })).toMatchObject({
      description: 'Signed in caption',
      author: 'chef',
      videoUrl: 'https://cdn/i.mp4',
    })
  })
})

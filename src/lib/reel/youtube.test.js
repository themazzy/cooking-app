import { describe, expect, it } from 'vitest'
import { captionsText, commentsToken, pageJson, parseYouTubeComments, youtubeId } from './youtube.js'
import { detectPlatform } from './index.js'

describe('YouTube', () => {
  it('finds the video id in every link shape', () => {
    expect(youtubeId('https://www.youtube.com/shorts/abcdefghijk?feature=share')).toBe('abcdefghijk')
    expect(youtubeId('https://youtu.be/abcdefghijk?si=x')).toBe('abcdefghijk')
    expect(youtubeId('https://m.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk')
    expect(detectPlatform('https://youtube.com/shorts/abcdefghijk')).toBe('youtube')
    expect(detectPlatform('https://www.toprecepty.cz/recept/123-svickova/')).toBe('web')
  })

  it('reads page JSON even with braces inside strings', () => {
    const html = '<script>var ytInitialPlayerResponse = {"videoDetails":{"title":"Pasta {quick}","shortDescription":"200 g pasta"}};var x=1</script>'
    expect(pageJson(html, 'ytInitialPlayerResponse').videoDetails.title).toBe('Pasta {quick}')
  })

  it('finds the comments continuation', () => {
    const data = {
      contents: [{ itemSectionRenderer: { sectionIdentifier: 'comment-item-section', contents: [{ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'TOK' } } } }] } }],
    }
    expect(commentsToken(data)).toBe('TOK')
  })

  it('reads comments from entity payloads with the pinned flag', () => {
    const json = {
      onResponseReceivedEndpoints: [{ items: [{ commentThreadRenderer: { commentViewModel: { commentViewModel: { commentId: 'c1', pinnedText: 'Pinned by @chef' } } } }] }],
      frameworkUpdates: {
        entityBatchUpdate: {
          mutations: [
            { payload: { commentEntityPayload: { properties: { commentId: 'c1', content: { content: 'Ingredients: 200 g pasta' } }, author: { displayName: '@chef', isCreator: true } } } },
            { payload: { commentEntityPayload: { properties: { commentId: 'c2', content: { content: 'yum' } }, author: { displayName: '@fan' } } } },
          ],
        },
      },
    }
    expect(parseYouTubeComments(json)).toEqual([
      { author: '@chef', text: 'Ingredients: 200 g pasta', pinned: true, creator: true },
      { author: '@fan', text: 'yum', pinned: false, creator: false },
    ])
  })

  it('joins caption segments', () => {
    expect(captionsText({ events: [{ segs: [{ utf8: 'Add 200 g' }, { utf8: ' pasta' }] }, { tStartMs: 1 }, { segs: [{ utf8: 'and salt' }] }] })).toBe('Add 200 g pasta and salt')
  })
})

import {
  isAllowedPostUrl,
  decodeEntities,
  parseOgTags,
  extractAuthor,
  fetchPost,
} from '@/lib/og-fetch'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch
afterEach(() => mockFetch.mockReset())

const OG_HTML = `<!doctype html><html><head>
  <meta property="og:title" content="Jane Doe on Instagram: &quot;Leg day PRs&quot;" />
  <meta property="og:description" content="1,240 likes, 33 comments" />
  <meta property="og:image" content="https://scontent.example/leg.jpg" />
</head><body></body></html>`

describe('isAllowedPostUrl (SSRF guard)', () => {
  it('allows known social hosts', () => {
    expect(isAllowedPostUrl('https://www.instagram.com/p/ABC/')).toBe(true)
    expect(isAllowedPostUrl('https://instagram.com/p/ABC/')).toBe(true)
    expect(isAllowedPostUrl('https://fb.watch/xyz/')).toBe(true)
    expect(isAllowedPostUrl('https://www.linkedin.com/posts/x')).toBe(true)
  })
  it('rejects non-allowlisted and internal hosts', () => {
    expect(isAllowedPostUrl('https://evil.com/p/ABC')).toBe(false)
    expect(isAllowedPostUrl('http://localhost/admin')).toBe(false)
    expect(isAllowedPostUrl('http://169.254.169.254/latest/meta-data')).toBe(false)
  })
  it('rejects unparseable and non-http(s) input', () => {
    expect(isAllowedPostUrl('not a url')).toBe(false)
    expect(isAllowedPostUrl('file:///etc/passwd')).toBe(false)
  })
})

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry')
    expect(decodeEntities('&quot;hi&quot; &#39;yo&#39;')).toBe('"hi" \'yo\'')
    expect(decodeEntities('caf&#233;')).toBe('café')
  })
})

describe('parseOgTags', () => {
  it('extracts og:title / og:description / og:image and decodes entities', () => {
    const og = parseOgTags(OG_HTML)
    expect(og.title).toBe('Jane Doe on Instagram: "Leg day PRs"')
    expect(og.description).toBe('1,240 likes, 33 comments')
    expect(og.image).toBe('https://scontent.example/leg.jpg')
  })
  it('returns undefined fields when tags are absent', () => {
    expect(parseOgTags('<html><head></head></html>')).toEqual({
      title: undefined,
      description: undefined,
      image: undefined,
    })
  })
})

describe('extractAuthor', () => {
  it('pulls the author from the "<author> on <Platform>:" pattern', () => {
    expect(extractAuthor('Jane Doe on Instagram: "Leg day"')).toBe('Jane Doe')
    expect(extractAuthor('@ironpeak on Facebook: post')).toBe('ironpeak')
  })
  it('returns undefined when the pattern is absent', () => {
    expect(extractAuthor('Some random title')).toBeUndefined()
  })
})

describe('fetchPost', () => {
  it('returns invalid for a disallowed host without fetching', async () => {
    const res = await fetchPost('https://evil.com/p/ABC')
    expect(res).toEqual({ status: 'invalid' })
    expect(mockFetch).not.toHaveBeenCalled()
  })
  it('returns ok with caption/author/image on a good response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => OG_HTML })
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({
      status: 'ok',
      caption: 'Jane Doe on Instagram: "Leg day PRs"',
      imageUrl: 'https://scontent.example/leg.jpg',
      author: 'Jane Doe',
    })
  })
  it('sends the unfurl-bot UA and an abort signal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => OG_HTML })
    await fetchPost('https://www.instagram.com/p/ABC/')
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['user-agent']).toBe(
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
    )
    expect(opts.signal).toBeInstanceOf(AbortSignal)
  })
  it('returns blocked when og:title is missing (login wall)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '<html><head></head></html>' })
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({ status: 'blocked' })
  })
  it('returns blocked on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => '' })
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({ status: 'blocked' })
  })
  it('returns blocked when fetch throws (timeout/DNS)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'))
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({ status: 'blocked' })
  })
})

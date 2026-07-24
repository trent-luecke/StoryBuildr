/**
 * @jest-environment node
 */
import { POST } from '../route'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch
afterEach(() => mockFetch.mockReset())

function postReq(body: unknown) {
  return new Request('http://localhost/api/fetch-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const OG_HTML =
  '<meta property="og:title" content="Jane on Instagram: hi" />' +
  '<meta property="og:image" content="https://x/y.jpg" />'

test('returns ok for a good post URL', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => OG_HTML })
  const res = await POST(postReq({ url: 'https://www.instagram.com/p/ABC/' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.status).toBe('ok')
  expect(json.author).toBe('Jane')
})

test('returns invalid for a disallowed host (200 body, no fetch)', async () => {
  const res = await POST(postReq({ url: 'https://evil.com/p/ABC' }))
  expect(res.status).toBe(200)
  expect((await res.json()).status).toBe('invalid')
  expect(mockFetch).not.toHaveBeenCalled()
})

test('returns invalid when url is missing or not a string', async () => {
  const res = await POST(postReq({ url: 123 }))
  expect(res.status).toBe(200)
  expect((await res.json()).status).toBe('invalid')
})

test('returns invalid (200) for a JSON null body', async () => {
  const res = await POST(postReq(null))
  expect(res.status).toBe(200)
  expect((await res.json()).status).toBe('invalid')
})

test('returns invalid (200) for a non-object JSON body', async () => {
  const res = await POST(postReq(42))
  expect(res.status).toBe(200)
  expect((await res.json()).status).toBe('invalid')
})

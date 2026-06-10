import { checkUrl } from '@/lib/preflight'

const mockFetch = jest.fn()
global.fetch = mockFetch

afterEach(() => mockFetch.mockReset())

test('returns pass for a 200 response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })
  const result = await checkUrl('https://example.com')
  expect(result.status).toBe('pass')
})

test('returns unreachable when fetch throws (timeout/DNS)', async () => {
  mockFetch.mockRejectedValueOnce(new Error('fetch failed'))
  const result = await checkUrl('https://notareal.domain')
  expect(result.status).toBe('unreachable')
})

test('returns blocked for 403 response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })
  const result = await checkUrl('https://instagram.com/somegym')
  expect(result.status).toBe('blocked')
})

test('returns unreachable for 404 response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
  const result = await checkUrl('https://example.com/missing')
  expect(result.status).toBe('unreachable')
})

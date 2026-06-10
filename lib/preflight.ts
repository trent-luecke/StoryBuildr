import { PreflightStatus } from '@/lib/types'

export async function checkUrl(url: string): Promise<PreflightStatus> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StoryBuildr/1.0)' },
    })
    clearTimeout(timeout)

    if (response.ok) return { status: 'pass' }
    if (response.status === 403 || response.status === 429) return { status: 'blocked' }
    return { status: 'unreachable' }
  } catch {
    clearTimeout(timeout)
    return { status: 'unreachable' }
  }
}

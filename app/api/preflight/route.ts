import { NextRequest, NextResponse } from 'next/server'
import { checkUrl } from '@/lib/preflight'
import { Channel, PreflightStatus } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body: { urls: Partial<Record<Channel, string>> } = await request.json()

  const results = await Promise.all(
    Object.entries(body.urls).map(async ([channel, url]): Promise<[string, PreflightStatus]> => {
      if (!url) return [channel, { status: 'skipped' }]
      const result = await checkUrl(url)
      return [channel, result]
    })
  )

  return NextResponse.json(Object.fromEntries(results))
}

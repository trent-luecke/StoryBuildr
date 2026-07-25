// app/api/fetch-post/route.ts
import { NextResponse } from 'next/server'
import { fetchPost } from '@/lib/og-fetch'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid' }, { status: 200 })
  }
  if (typeof body !== 'object' || body === null || typeof (body as { url?: unknown }).url !== 'string') {
    return NextResponse.json({ status: 'invalid' }, { status: 200 })
  }
  const result = await fetchPost((body as { url: string }).url)
  return NextResponse.json(result, { status: 200 })
}

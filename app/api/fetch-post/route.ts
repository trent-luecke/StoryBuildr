// app/api/fetch-post/route.ts
import { NextResponse } from 'next/server'
import { fetchPost } from '@/lib/og-fetch'

export async function POST(request: Request) {
  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid' }, { status: 200 })
  }
  if (typeof body.url !== 'string') {
    return NextResponse.json({ status: 'invalid' }, { status: 200 })
  }
  const result = await fetchPost(body.url)
  return NextResponse.json(result, { status: 200 })
}

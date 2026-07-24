// lib/og-fetch.ts

export type FetchPostResponse =
  | { status: 'ok'; caption: string; imageUrl?: string; author?: string }
  | { status: 'blocked' }
  | { status: 'invalid' }

// The exact unfurl-bot UA is load-bearing: a normal browser UA gets a login wall.
const UNFURL_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

// Allowlist doubles as the SSRF guard: the route fetches a user-supplied URL
// server-side, so it must ONLY ever fetch these hosts.
const ALLOWED_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'fb.watch',
  'linkedin.com',
  'www.linkedin.com',
])

export function isAllowedPostUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  return ALLOWED_HOSTS.has(url.hostname.toLowerCase())
}

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => NAMED_ENTITIES[m] ?? m)
}

function metaContent(html: string, property: string): string | undefined {
  // Handle both attribute orderings and both property= / name= forms.
  const attrFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    'i'
  )
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    'i'
  )
  const m = html.match(attrFirst) ?? html.match(contentFirst)
  return m ? decodeEntities(m[1]) : undefined
}

export function parseOgTags(html: string): {
  title?: string
  description?: string
  image?: string
} {
  return {
    title: metaContent(html, 'og:title'),
    description: metaContent(html, 'og:description'),
    image: metaContent(html, 'og:image'),
  }
}

// og:title on IG/FB/LinkedIn posts is often "<author> on <Platform>: <caption>".
export function extractAuthor(ogTitle: string): string | undefined {
  const m = ogTitle.match(/^(.+?)\s+on\s+(?:Instagram|Facebook|LinkedIn)\b/i)
  return m ? m[1].trim().replace(/^@/, '') : undefined
}

export async function fetchPost(rawUrl: string): Promise<FetchPostResponse> {
  if (!isAllowedPostUrl(rawUrl)) return { status: 'invalid' }
  try {
    const res = await fetch(rawUrl, {
      headers: { 'user-agent': UNFURL_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { status: 'blocked' }
    const html = await res.text()
    const og = parseOgTags(html)
    if (!og.title) return { status: 'blocked' } // login wall / no preview data
    return {
      status: 'ok',
      caption: og.title || og.description || '',
      imageUrl: og.image,
      author: extractAuthor(og.title),
    }
  } catch {
    return { status: 'blocked' } // network/timeout — same user-facing treatment
  }
}

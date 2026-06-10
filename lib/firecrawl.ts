// lib/firecrawl.ts
import { FirecrawlClient } from 'firecrawl'
import { Channel } from '@/lib/types'

// FirecrawlClient is the v2 client: .scrape(url, options) returns Promise<Document>
// Document has .markdown?: string at the top level.
// On failure the client throws — no .success boolean.
//
// Note: client is instantiated lazily (inside functions) rather than at module load
// time because FirecrawlClient validates the API key in its constructor and throws
// immediately if it is absent — which breaks Next.js static page-data collection
// at build time when env vars are not set.
function getClient(): FirecrawlClient {
  return new FirecrawlClient({ apiKey: process.env.FIRECRAWL_API_KEY! })
}

export interface ScrapeResult {
  channel: Channel
  content: string
  selfReported: boolean
}

export async function scrapeChannel(channel: Channel, url: string): Promise<ScrapeResult> {
  try {
    const firecrawl = getClient()
    const result = await firecrawl.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 15000,
    })

    if (!result.markdown || result.markdown.trim().length < 100) {
      return { channel, content: 'scrape_unavailable', selfReported: false }
    }

    // Truncate to 3000 chars to keep prompt size manageable
    return { channel, content: result.markdown.slice(0, 3000), selfReported: false }
  } catch {
    return { channel, content: 'scrape_unavailable', selfReported: false }
  }
}

export async function scrapeChannels(
  urls: Partial<Record<Channel, string>>
): Promise<ScrapeResult[]> {
  return Promise.all(
    Object.entries(urls).map(([channel, url]) =>
      scrapeChannel(channel as Channel, url!)
    )
  )
}

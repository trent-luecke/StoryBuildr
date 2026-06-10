// app/api/audit/route.ts
import { NextRequest } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'
import { scrapeChannels } from '@/lib/firecrawl'
import { GYM_MARKETING_SYSTEM_PROMPT } from '@/lib/prompts/gym-marketing'
import { Channel, ChannelDetailsData, PreflightStatus, FallbackChannelData } from '@/lib/types'

const auditResultSchema = z.object({
  channel: z.string(),
  score: z.number().nullable(),
  narrative: z.string(),
  doingWell: z.array(z.string()),
  opportunities: z.array(z.string()),
  selfReported: z.boolean(),
})

const auditResponseSchema = z.object({
  channels: z.array(auditResultSchema),
})

export async function POST(request: NextRequest) {
  const body: {
    channelDetails: ChannelDetailsData
    preflightResults: Partial<Record<Channel, PreflightStatus>>
    businessInfo: { gymName: string; icp: string; channels: Channel[] }
  } = await request.json()

  // Collect URLs for scraping (only channels with preflight status 'pass')
  const scrapableUrls: Partial<Record<Channel, string>> = {}
  for (const channel of body.businessInfo.channels) {
    const preflight = body.preflightResults[channel]
    if (!preflight || preflight.status === 'skipped') continue
    if (preflight.status === 'pass') {
      const details = (body.channelDetails as Record<string, { url?: string }>)[channel]
      if (details?.url) scrapableUrls[channel] = details.url
    }
  }

  const scraped = await scrapeChannels(scrapableUrls)

  // Build channel summaries for the prompt
  const channelSummaries = body.businessInfo.channels
    .map((channel) => {
      const preflight = body.preflightResults[channel]
      if (preflight?.status === 'skipped') {
        return `## ${channel} (SKIPPED — exclude from audit)`
      }
      if (preflight?.status === 'fallback') {
        const fb = preflight.data as FallbackChannelData
        return `## ${channel} (Self-reported — no score, use "Self-reported" badge)
Post frequency: ${fb.postFrequency}
Content types: ${fb.contentTypes.join(', ')}
Recent posts described: ${fb.recentPosts}`
      }
      if (channel === 'email') {
        const em = body.channelDetails.email
        return `## email (Self-reported)
Platform: ${em?.platform ?? 'unknown'}
Subscribers: ${em?.subscriberCount ?? 'unknown'}
Send frequency: ${em?.sendFrequency ?? 'unknown'}`
      }
      const scrapeResult = scraped.find((s) => s.channel === channel)
      if (!scrapeResult || scrapeResult.content === 'scrape_unavailable') {
        return `## ${channel} (Scrape unavailable — note this in narrative, do not score)`
      }
      return `## ${channel}\n${scrapeResult.content}`
    })
    .join('\n\n')

  const prompt = `
Gym: ${body.businessInfo.gymName}
Their ideal member: ${body.businessInfo.icp}
Active channels: ${body.businessInfo.channels.join(', ')}

Analyze each channel below and return a structured audit result for each.
For self-reported channels: set score to null and selfReported to true.
For skipped channels: omit them entirely.
For unavailable scrapes: set score to null, explain in narrative, selfReported to false.

${channelSummaries}
`.trim()

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6'),
    system: GYM_MARKETING_SYSTEM_PROMPT,
    prompt,
    schema: auditResponseSchema,
  })

  return result.toTextStreamResponse()
}

// app/api/audit/route.ts
import { NextRequest } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'
import { scrapeChannels } from '@/lib/firecrawl'
import { GYM_MARKETING_SYSTEM_PROMPT } from '@/lib/prompts/gym-marketing'
import { Channel, ChannelDetailsData, PreflightStatus, SocialInput } from '@/lib/types'
import { buildAuditEmailBlock } from '@/lib/email-context'

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
    socialInputs?: Partial<Record<Channel, SocialInput>>
    businessInfo: { gymName: string; icp: string; channels: Channel[]; services?: string[]; otherServices?: string }
  } = await request.json()

  const SOCIAL = new Set<Channel>(['instagram', 'facebook', 'linkedin'])

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
      if (SOCIAL.has(channel)) {
        const si = body.socialInputs?.[channel]
        if (!si) {
          return `## ${channel} (Self-reported — no details provided; do not score)`
        }
        if (si.method === 'links') {
          const lines = si.posts
            .map((p, i) => `Post ${i + 1}${p.author ? ` by @${p.author}` : ''}: ${p.caption}${p.imageUrl ? ' [has image]' : ''}`)
            .join('\n')
          return `## ${channel} (Self-reported example posts — no score, use "Self-reported" badge)
${lines || 'No posts provided'}`
        }
        return `## ${channel} (Self-reported — no score, use "Self-reported" badge)
Post frequency: ${si.postFrequency}
Content types: ${si.contentTypes.join(', ')}
Recent posts described: ${si.recentPosts}`
      }

      const preflight = body.preflightResults[channel]
      if (preflight?.status === 'skipped') {
        return `## ${channel} (SKIPPED — exclude from audit)`
      }
      if (channel === 'email') {
        const em = body.channelDetails.email
        return em ? buildAuditEmailBlock(em) : '## email (Self-reported)\nNo details provided'
      }
      const scrapeResult = scraped.find((s) => s.channel === channel)
      if (!scrapeResult || scrapeResult.content === 'scrape_unavailable') {
        return `## ${channel} (Scrape unavailable — note this in narrative, do not score)`
      }
      return `## ${channel}\n${scrapeResult.content}`
    })
    .join('\n\n')

  // Merge selected services with the free-text "Other" detail for sharper context
  const servicesParts = (body.businessInfo.services ?? []).filter((s) => s !== 'Other')
  if (body.businessInfo.otherServices?.trim()) {
    servicesParts.push(`Other: ${body.businessInfo.otherServices.trim()}`)
  }
  const servicesLine = servicesParts.length ? servicesParts.join(', ') : 'Not specified'

  const prompt = `
Gym: ${body.businessInfo.gymName}
Services offered: ${servicesLine}
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

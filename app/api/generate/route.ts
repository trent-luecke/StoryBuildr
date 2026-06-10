// app/api/generate/route.ts
import { NextRequest } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'
import { GYM_MARKETING_SYSTEM_PROMPT } from '@/lib/prompts/gym-marketing'
import { AuditResult, Channel } from '@/lib/types'

const storyChannelSchema = z.object({
  copy: z.string(),
  visualRecommendation: z.string(),
  suggestedPostDate: z.string(),
})

const storySchema = z.object({
  title: z.string(),
  type: z.string(),
  whySelected: z.string(),
  channels: z.record(z.string(), storyChannelSchema),
})

const generateResponseSchema = z.object({
  stories: z.array(storySchema),
})

export async function POST(request: NextRequest) {
  const body: {
    businessInfo: { gymName: string; channels: Channel[]; services: string[]; icp: string }
    auditResults: AuditResult[]
    storyMineAnswers: Partial<Record<number, string>>
  } = await request.json()

  const answersText = Object.entries(body.storyMineAnswers)
    .filter(([, v]) => v)
    .map(([i, v]) => `Q${parseInt(i) + 1}: ${v}`)
    .join('\n\n')

  const auditSummary = body.auditResults
    .map((r) => `${r.channel}: score ${r.score ?? 'self-reported'} — opportunities: ${r.opportunities.join(', ')}`)
    .join('\n')

  const prompt = `
Gym: ${body.businessInfo.gymName}
Services: ${body.businessInfo.services.join(', ')}
Ideal member: ${body.businessInfo.icp}
Active channels: ${body.businessInfo.channels.join(', ')}

## Audit Summary
${auditSummary}

## Owner Interview Answers
${answersText}

Based on the interview answers and audit findings, select the 4 most compelling stories and produce a 30-day content plan.

For each story:
- Give it a title and type (e.g. "Member Transformation", "Day in the Life", "Origin Story", "Mistake/Lesson", "Philosophy")
- Explain in 2-3 sentences why you selected it (whySelected)
- For EACH active channel (${body.businessInfo.channels.join(', ')}), generate:
  - Platform-appropriate copy (follow the platform conventions in your instructions)
  - A specific visual asset recommendation
  - A suggested post date within a 30-day calendar (e.g. "Week 1, Wednesday")

Only generate channel copy for the active channels listed above. Do not generate copy for unlisted channels.
`.trim()

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6'),
    system: GYM_MARKETING_SYSTEM_PROMPT,
    prompt,
    schema: generateResponseSchema,
  })

  return result.toTextStreamResponse()
}

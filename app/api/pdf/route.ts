// app/api/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { ReportDocument } from '@/lib/pdf/ReportDocument'
import { AuditResult, Channel, StoryPlan } from '@/lib/types'
import React from 'react'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body: {
    gymName: string
    auditResults: AuditResult[]
    storyPlan: StoryPlan
    activeChannels: Channel[]
  } = await request.json()

  const element = React.createElement(ReportDocument, {
    gymName: body.gymName,
    auditResults: body.auditResults,
    storyPlan: body.storyPlan,
    activeChannels: body.activeChannels,
  }) as unknown as React.ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="storybuildr-${body.gymName.toLowerCase().replace(/\s+/g, '-')}-report.pdf"`,
    },
  })
}

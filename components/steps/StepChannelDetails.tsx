// components/steps/StepChannelDetails.tsx
'use client'

import { useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { STEP_CARD } from '@/components/wizard/stepLayout'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { ChannelProgress } from '@/components/ui/ChannelProgress'
import { ChannelDetailsIntro } from '@/components/steps/ChannelDetailsIntro'
import { WebsiteChannelScreen } from '@/components/steps/WebsiteChannelScreen'
import { EmailChannelScreen } from '@/components/steps/EmailChannelScreen'
import { Channel, ChannelDetailsData, PreflightStatus } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', website: 'Website', email: 'Email',
}

type WebsiteResult = { url: string; status: 'pass' | 'skipped' }
type EmailData = NonNullable<ChannelDetailsData['email']>

export function StepChannelDetails() {
  const { state, dispatch } = useWizard()
  const channels = state.businessInfo?.channels ?? []
  const socialChannels = channels.filter((c) => c !== 'website' && c !== 'email')
  const ordered: Channel[] = [
    ...socialChannels,
    ...(channels.includes('website') ? (['website'] as Channel[]) : []),
    ...(channels.includes('email') ? (['email'] as Channel[]) : []),
  ]
  const total = ordered.length

  const [showIntro, setShowIntro] = useState(!state.channelIntroSeen)
  const [cursor, setCursor] = useState(0)
  const [websiteResult, setWebsiteResult] = useState<WebsiteResult | null>(() => {
    const w = state.preflightResults?.website
    if (w?.status === 'skipped') return { url: state.channelDetails?.website?.url ?? '', status: 'skipped' }
    if (w?.status === 'pass' && state.channelDetails?.website) return { url: state.channelDetails.website.url, status: 'pass' }
    return null
  })
  const [emailData, setEmailData] = useState<EmailData | null>(state.channelDetails?.email ?? null)

  function finalize(finalWebsite: WebsiteResult | null, finalEmail: EmailData | null) {
    const channelDetails: ChannelDetailsData = {}
    if (finalWebsite && finalWebsite.status !== 'skipped') channelDetails.website = { url: finalWebsite.url }
    if (finalEmail) channelDetails.email = finalEmail

    const preflightResults: Partial<Record<Channel, PreflightStatus>> = {}
    if (channels.includes('website')) preflightResults.website = finalWebsite?.status === 'skipped' ? { status: 'skipped' } : { status: 'pass' }
    if (channels.includes('email')) preflightResults.email = { status: 'pass' }

    dispatch({ type: 'SET_CHANNEL_DETAILS', data: channelDetails })
    dispatch({ type: 'SET_PREFLIGHT_RESULTS', data: preflightResults })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  function back() {
    if (cursor > 0) { setCursor(cursor - 1); return }
    if (!state.channelIntroSeen) { setShowIntro(true); return } // first pass: return to the lead-in
    dispatch({ type: 'SET_STEP', step: 2 })
  }

  // Lead-in (once).
  if (showIntro) {
    return (
      <div className={STEP_CARD}>
        <ChannelDetailsIntro
          onBack={() => dispatch({ type: 'SET_STEP', step: 2 })}
          onContinue={() => { dispatch({ type: 'MARK_CHANNEL_INTRO_SEEN' }); setShowIntro(false) }}
        />
      </div>
    )
  }

  // Defensive: no channels selected (Business Info should require ≥1).
  if (total === 0) {
    return (
      <div className={STEP_CARD}>
        <h2 className="text-2xl font-extrabold text-[#1E212E] mb-4">Your channel details</h2>
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
          <button type="button" onClick={() => finalize(null, null)} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">Begin Audit →</button>
        </div>
      </div>
    )
  }

  const channel = ordered[cursor]
  const current = cursor + 1
  const isLast = current >= total

  if (channel === 'website') {
    return (
      <div className={STEP_CARD}>
        <WebsiteChannelScreen
          current={current}
          total={total}
          isLast={isLast}
          initialUrl={websiteResult?.url ?? state.channelDetails?.website?.url}
          onBack={back}
          onContinue={(result) => {
            setWebsiteResult(result)
            if (isLast) finalize(result, emailData)
            else setCursor(cursor + 1)
          }}
        />
      </div>
    )
  }

  if (channel === 'email') {
    return (
      <div className={STEP_CARD}>
        <EmailChannelScreen
          current={current}
          total={total}
          isLast={isLast}
          initial={emailData ?? undefined}
          onBack={back}
          onContinue={(data) => {
            setEmailData(data)
            if (isLast) finalize(websiteResult, data)
            else setCursor(cursor + 1)
          }}
        />
      </div>
    )
  }

  // Social channel screen.
  const label = CHANNEL_LABELS[channel]
  return (
    <div className={STEP_CARD}>
      <ChannelProgress current={current} total={total} />
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2 mt-4">{label}</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your {label}</h2>
      <p className="text-sm text-[#444444] mb-5">Show us what you&apos;re posting so the audit reflects your real content.</p>

      <SocialChannelInput
        hideHeader
        channel={channel}
        value={state.socialInputs[channel]}
        onChange={(input) => dispatch({ type: 'SET_SOCIAL_INPUT', channel, input })}
      />

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={back} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button
          type="button"
          onClick={() => { if (isLast) finalize(websiteResult, emailData); else setCursor(cursor + 1) }}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          {isLast ? 'Begin Audit →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

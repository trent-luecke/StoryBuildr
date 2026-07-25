// components/steps/StepChannelDetails.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useWizard } from '@/hooks/useWizard'
import { STEP_CARD } from '@/components/wizard/stepLayout'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { Channel, ChannelDetailsData, PreflightStatus, SocialInput } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

type WebsiteState = 'idle' | 'checking' | 'pass' | 'unreachable' | 'skipped'

function seededFormValues(cd: ChannelDetailsData | null): Record<string, string> {
  if (!cd) return {}
  const v: Record<string, string> = {}
  if (cd.website) v.website = cd.website.url
  if (cd.email) {
    v['email-platform'] = cd.email.platform ?? ''
    v['email-other-platform'] = cd.email.otherPlatform ?? ''
    v['email-subscribers'] = String(cd.email.subscriberCount)
    v['email-frequency'] = cd.email.sendFrequency
  }
  return v
}

export function StepChannelDetails() {
  const { state, dispatch } = useWizard()
  const channels = state.businessInfo?.channels ?? []
  const socialChannels = channels.filter((c) => c !== 'email' && c !== 'website')
  const hasWebsite = channels.includes('website')
  const hasEmail = channels.includes('email')

  const { register, getValues, watch, setValue } = useForm<Record<string, string>>({
    defaultValues: seededFormValues(state.channelDetails),
  })

  const [websiteState, setWebsiteState] = useState<WebsiteState>(() => {
    const w = state.preflightResults?.website
    if (w?.status === 'pass') return 'pass'
    if (w?.status === 'skipped') return 'skipped'
    if (w?.status === 'unreachable') return 'unreachable'
    return 'idle'
  })
  const [isChecking, setIsChecking] = useState(false)
  const [emailUsesPlatform, setEmailUsesPlatform] = useState<boolean | undefined>(
    state.channelDetails?.email?.usesPlatform
  )
  const [emailError, setEmailError] = useState<string | null>(null)
  const platformValue = watch('email-platform')

  const websiteResolved = !hasWebsite || websiteState === 'pass' || websiteState === 'skipped'
  const needsWebsiteCheck = hasWebsite && websiteState !== 'pass' && websiteState !== 'skipped'

  function handleSocialChange(channel: Channel, input: SocialInput) {
    dispatch({ type: 'SET_SOCIAL_INPUT', channel, input })
  }

  async function runWebsiteCheck() {
    if (hasEmail && emailUsesPlatform === undefined) {
      setEmailError('Let us know so we can tailor your email plan.')
      return
    }
    if (!hasWebsite) {
      proceed()
      return
    }
    setIsChecking(true)
    setWebsiteState('checking')
    const res = await fetch('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: { website: getValues('website') } }),
    })
    const results: Partial<Record<Channel, PreflightStatus>> = await res.json()
    const status = results.website?.status ?? 'unreachable'
    const next: WebsiteState = status === 'pass' ? 'pass' : status === 'skipped' ? 'skipped' : 'unreachable'
    setWebsiteState(next)
    setIsChecking(false)
    if (next === 'pass') proceed('pass')
  }

  function skipWebsite() {
    setWebsiteState('skipped')
  }

  // `overrideWebsite` lets runWebsiteCheck proceed immediately with the freshly
  // computed 'pass' before the state update has flushed.
  function proceed(overrideWebsite?: WebsiteState) {
    if (hasEmail && emailUsesPlatform === undefined) {
      setEmailError('Let us know so we can tailor your email plan.')
      return
    }
    const ws = overrideWebsite ?? websiteState
    const vals = getValues()
    const channelDetails: ChannelDetailsData = {}
    if (hasWebsite && ws !== 'skipped') channelDetails.website = { url: vals.website }
    if (hasEmail) {
      channelDetails.email = {
        usesPlatform: emailUsesPlatform,
        platform: emailUsesPlatform ? (getValues('email-platform') || undefined) : undefined,
        otherPlatform:
          emailUsesPlatform && getValues('email-platform') === 'Other'
            ? (getValues('email-other-platform') || undefined)
            : undefined,
        subscriberCount: parseInt(vals['email-subscribers'] || '0'),
        sendFrequency: vals['email-frequency'],
      }
    }

    const preflightResults: Partial<Record<Channel, PreflightStatus>> = {}
    if (hasWebsite) preflightResults.website = ws === 'skipped' ? { status: 'skipped' } : { status: 'pass' }
    if (hasEmail) preflightResults.email = { status: 'pass' }

    dispatch({ type: 'SET_CHANNEL_DETAILS', data: channelDetails })
    dispatch({ type: 'SET_PREFLIGHT_RESULTS', data: preflightResults })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  return (
    <div className={STEP_CARD}>
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 3</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your channel details</h2>
      <p className="text-sm text-[#444444] mb-6">We&apos;ll use these to audit your current content.</p>

      <div className="flex flex-col gap-6">
        {socialChannels.map((channel) => (
          <SocialChannelInput
            key={channel}
            channel={channel}
            value={state.socialInputs[channel]}
            onChange={(input) => handleSocialChange(channel, input)}
          />
        ))}

        {hasWebsite && (
          <div>
            <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">
              {CHANNEL_LABELS.website} URL
              {websiteState === 'pass' && <span className="ml-2 text-green-600 normal-case font-normal">✓ Accessible</span>}
              {websiteState === 'unreachable' && <span className="ml-2 text-red-500 normal-case font-normal">⚠ Unreachable</span>}
              {websiteState === 'skipped' && <span className="ml-2 text-[#444444]/50 normal-case font-normal">Skipped</span>}
            </label>
            <input
              {...register('website')}
              disabled={websiteState === 'skipped'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="https://yourgym.com"
            />
            {websiteState === 'unreachable' && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 mb-2">We had trouble reaching this URL. You can update it and try again, or skip this channel.</p>
                <button type="button" onClick={skipWebsite} className="text-xs text-[#444444]/60 hover:text-[#444444]">Skip this channel</button>
              </div>
            )}
          </div>
        )}

        {hasEmail && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">Marketing Email List</p>
            <p className="text-xs text-[#444444]/70 mb-3">Got more than one list? Describe your marketing list: the one for promos, new offerings, and events you send to members and past leads, not a members-only newsletter.</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-[#444444] mb-1.5">Do you use an email marketing platform? (e.g., MailChimp, ConvertKit, HubSpot, etc.)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmailUsesPlatform(true); setEmailError(null) }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      emailUsesPlatform === true
                        ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
                        : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailUsesPlatform(false); setEmailError(null); setValue('email-platform', ''); setValue('email-other-platform', '') }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      emailUsesPlatform === false
                        ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
                        : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
                    }`}
                  >
                    No
                  </button>
                </div>
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              {emailUsesPlatform === true && (
                <div>
                  <label className="block text-xs text-[#444444] mb-1">Platform</label>
                  <select {...register('email-platform')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
                    <option value="">Select platform</option>
                    {['Mailchimp', 'Klaviyo', 'ConvertKit', 'HubSpot', 'GoHighLevel', 'Other'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {platformValue === 'Other' && (
                    <input
                      {...register('email-other-platform')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] mt-2"
                      placeholder="Which platform?"
                    />
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#444444] mb-1">Subscriber count</label>
                  <input type="number" {...register('email-subscribers')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. 340" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[#444444] mb-1">Send frequency</label>
                  <select {...register('email-frequency')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
                    <option value="">Select</option>
                    {['Weekly', 'Bi-weekly', 'Monthly', 'Rarely'].map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        {needsWebsiteCheck ? (
          <button type="button" onClick={runWebsiteCheck} disabled={isChecking} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            {isChecking ? 'Checking…' : websiteState === 'unreachable' ? 'Re-check →' : 'Check & Continue →'}
          </button>
        ) : (
          <button type="button" onClick={() => proceed()} disabled={!websiteResolved} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            Begin Audit →
          </button>
        )}
      </div>
    </div>
  )
}

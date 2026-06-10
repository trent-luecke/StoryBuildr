// components/steps/StepChannelDetails.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useWizard } from '@/hooks/useWizard'
import { FallbackChannelForm } from '@/components/ui/FallbackChannelForm'
import { Channel, ChannelDetailsData, PreflightStatus, FallbackChannelData } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

type ChannelState = 'idle' | 'checking' | 'pass' | 'unreachable' | 'blocked' | 'skipped' | 'fallback-done'

export function StepChannelDetails() {
  const { state, dispatch } = useWizard()
  const channels = state.businessInfo?.channels ?? []
  const socialChannels = channels.filter((c) => c !== 'email' && c !== 'website')
  const hasWebsite = channels.includes('website')
  const hasEmail = channels.includes('email')

  const { register, getValues } = useForm<Record<string, string>>()
  const [channelStates, setChannelStates] = useState<Partial<Record<Channel, ChannelState>>>({})
  const [fallbackData, setFallbackData] = useState<Partial<Record<Channel, FallbackChannelData>>>({})
  const [isChecking, setIsChecking] = useState(false)

  function setChannelState(channel: Channel, s: ChannelState) {
    setChannelStates((prev) => ({ ...prev, [channel]: s }))
  }

  async function runPreflight() {
    setIsChecking(true)
    const vals = getValues()
    const urls: Partial<Record<Channel, string>> = {}
    if (hasWebsite) urls.website = vals.website
    socialChannels.forEach((c) => { urls[c] = vals[c] })

    const res = await fetch('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    })
    const results: Partial<Record<Channel, PreflightStatus>> = await res.json()

    const newStates: Partial<Record<Channel, ChannelState>> = {}
    for (const [channel, result] of Object.entries(results) as [Channel, PreflightStatus][]) {
      newStates[channel] = (result.status === 'pass' ? 'pass' : result.status) as ChannelState
    }
    setChannelStates(newStates)
    setIsChecking(false)

    const allResolved = channels
      .filter((c) => c !== 'email')
      .every((c) => {
        const s = newStates[c]
        return s === 'pass' || s === 'skipped' || s === 'fallback-done'
      })

    if (allResolved) proceed(newStates)
  }

  function handleFallbackSubmit(channel: Channel, data: FallbackChannelData) {
    setFallbackData((prev) => ({ ...prev, [channel]: data }))
    setChannelState(channel, 'fallback-done')
  }

  function handleSkip(channel: Channel) {
    setChannelState(channel, 'skipped')
  }

  function proceed(states: Partial<Record<Channel, ChannelState>>) {
    const vals = getValues()
    const channelDetails: ChannelDetailsData = {}
    socialChannels.forEach((c) => {
      const s = states[c]
      if (s !== 'skipped') (channelDetails as any)[c] = { url: vals[c] }
    })
    if (hasWebsite && states.website !== 'skipped') channelDetails.website = { url: vals.website }
    if (hasEmail) {
      channelDetails.email = {
        platform: vals['email-platform'],
        subscriberCount: parseInt(vals['email-subscribers'] || '0'),
        sendFrequency: vals['email-frequency'],
      }
    }

    const preflightResults: Partial<Record<Channel, PreflightStatus>> = {}
    for (const c of channels) {
      const s = states[c]
      if (s === 'pass') preflightResults[c] = { status: 'pass' }
      else if (s === 'skipped') preflightResults[c] = { status: 'skipped' }
      else if (s === 'fallback-done') preflightResults[c] = { status: 'fallback', data: fallbackData[c]! }
      else if (c === 'email') preflightResults[c] = { status: 'pass' }
    }

    dispatch({ type: 'SET_CHANNEL_DETAILS', data: channelDetails })
    dispatch({ type: 'SET_PREFLIGHT_RESULTS', data: preflightResults })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  const nonEmailChannels = channels.filter((c) => c !== 'email')
  const allResolved = nonEmailChannels.every((c) => {
    const s = channelStates[c]
    return s === 'pass' || s === 'skipped' || s === 'fallback-done'
  })
  const anyChecked = Object.keys(channelStates).length > 0

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 3</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your channel details</h2>
      <p className="text-sm text-[#444444] mb-6">We'll use these to audit your current content.</p>

      <div className="flex flex-col gap-4">
        {[...socialChannels, ...(hasWebsite ? ['website' as Channel] : [])].map((channel) => {
          const s = channelStates[channel]
          return (
            <div key={channel}>
              <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">
                {CHANNEL_LABELS[channel]} {channel !== 'website' ? 'URL or handle' : 'URL'}
                {s === 'pass' && <span className="ml-2 text-green-600 normal-case font-normal">✓ Accessible</span>}
                {s === 'unreachable' && <span className="ml-2 text-red-500 normal-case font-normal">⚠ Unreachable</span>}
                {s === 'skipped' && <span className="ml-2 text-[#444444]/50 normal-case font-normal">Skipped</span>}
              </label>
              <input
                {...register(channel)}
                disabled={s === 'skipped' || s === 'fallback-done'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] disabled:bg-gray-50 disabled:text-gray-400"
                placeholder={channel === 'website' ? 'https://yourgym.com' : `https://${channel}.com/yourgym`}
              />
              {s === 'unreachable' && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-700 mb-2">We had trouble reaching this URL. You can update it and try again, or skip this channel.</p>
                  <button type="button" onClick={() => handleSkip(channel)} className="text-xs text-[#444444]/60 hover:text-[#444444]">Skip this channel</button>
                </div>
              )}
              {s === 'blocked' && (
                <FallbackChannelForm
                  channelLabel={CHANNEL_LABELS[channel]}
                  onSubmit={(data) => handleFallbackSubmit(channel, data)}
                  onSkip={() => handleSkip(channel)}
                />
              )}
            </div>
          )
        })}

        {hasEmail && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-3">Email List</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-[#444444] mb-1">Platform</label>
                <select {...register('email-platform')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
                  <option value="">Select platform</option>
                  {['Mailchimp', 'Klaviyo', 'ConvertKit', 'Other'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
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
        {!anyChecked ? (
          <button type="button" onClick={runPreflight} disabled={isChecking} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            {isChecking ? 'Checking…' : 'Check & Continue →'}
          </button>
        ) : allResolved ? (
          <button type="button" onClick={() => proceed(channelStates)} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">Begin Audit →</button>
        ) : (
          <button type="button" onClick={runPreflight} disabled={isChecking} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            {isChecking ? 'Checking…' : 'Re-check →'}
          </button>
        )}
      </div>
    </div>
  )
}

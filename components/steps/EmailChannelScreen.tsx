// components/steps/EmailChannelScreen.tsx
'use client'

import { useState } from 'react'
import { ChannelProgress } from '@/components/ui/ChannelProgress'
import { ChannelDetailsData } from '@/lib/types'

type EmailData = NonNullable<ChannelDetailsData['email']>

interface EmailChannelScreenProps {
  current: number
  total: number
  isLast: boolean
  initial?: EmailData
  onBack: () => void
  onContinue: (data: EmailData) => void
}

const PLATFORMS = ['Mailchimp', 'Klaviyo', 'ConvertKit', 'HubSpot', 'GoHighLevel', 'Other']
const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Rarely']

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
    active ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]' : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
  }`

export function EmailChannelScreen({ current, total, isLast, initial, onBack, onContinue }: EmailChannelScreenProps) {
  const [usesPlatform, setUsesPlatform] = useState<boolean | undefined>(initial?.usesPlatform)
  const [platform, setPlatform] = useState(initial?.platform ?? '')
  const [otherPlatform, setOtherPlatform] = useState(initial?.otherPlatform ?? '')
  const [subscribers, setSubscribers] = useState(initial?.subscriberCount ? String(initial.subscriberCount) : '')
  const [frequency, setFrequency] = useState(initial?.sendFrequency ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (usesPlatform === undefined) {
      setError('Let us know so we can tailor your email plan.')
      return
    }
    onContinue({
      usesPlatform,
      platform: usesPlatform ? (platform || undefined) : undefined,
      otherPlatform: usesPlatform && platform === 'Other' ? (otherPlatform || undefined) : undefined,
      subscriberCount: parseInt(subscribers || '0'),
      sendFrequency: frequency,
    })
  }

  return (
    <div>
      <ChannelProgress current={current} total={total} />
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2 mt-4">Email</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your email list</h2>
      <p className="text-xs text-[#444444]/70 mb-4">
        Your marketing list — promos, new offerings, and events you send to members and past leads, not a members-only newsletter.
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs text-[#444444] mb-1.5">Do you use an email marketing platform? (e.g., MailChimp, ConvertKit, HubSpot, etc.)</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setUsesPlatform(true); setError(null) }} className={pill(usesPlatform === true)}>Yes</button>
            <button type="button" onClick={() => { setUsesPlatform(false); setError(null); setPlatform(''); setOtherPlatform('') }} className={pill(usesPlatform === false)}>No</button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {usesPlatform === true && (
          <div>
            <label className="block text-xs text-[#444444] mb-1">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
              <option value="">Select platform</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {platform === 'Other' && (
              <input
                value={otherPlatform}
                onChange={(e) => setOtherPlatform(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] mt-2"
                placeholder="Which platform?"
              />
            )}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[#444444] mb-1">Subscriber count</label>
            <input type="number" value={subscribers} onChange={(e) => setSubscribers(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. 340" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[#444444] mb-1">Send frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
              <option value="">Select</option>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={onBack} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button type="button" onClick={submit} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">
          {isLast ? 'Begin Audit →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

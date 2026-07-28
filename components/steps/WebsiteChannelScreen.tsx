// components/steps/WebsiteChannelScreen.tsx
'use client'

import { useState } from 'react'
import { ChannelProgress } from '@/components/ui/ChannelProgress'
import { Channel, PreflightStatus } from '@/lib/types'

type WebsiteState = 'idle' | 'checking' | 'unreachable'

interface WebsiteChannelScreenProps {
  current: number
  total: number
  isLast: boolean
  initialUrl?: string
  onBack: () => void
  onContinue: (result: { url: string; status: 'pass' | 'skipped' }) => void
}

export function WebsiteChannelScreen({ current, total, isLast, initialUrl, onBack, onContinue }: WebsiteChannelScreenProps) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [ws, setWs] = useState<WebsiteState>('idle')

  async function runCheck() {
    setWs('checking')
    const res = await fetch('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: { website: url } }),
    })
    const results: Partial<Record<Channel, PreflightStatus>> = await res.json()
    const status = results.website?.status ?? 'unreachable'
    if (status === 'pass' || status === 'skipped') {
      onContinue({ url, status: 'pass' })
    } else {
      setWs('unreachable')
    }
  }

  return (
    <div>
      <ChannelProgress current={current} total={total} />
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2 mt-4">Website</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your website</h2>
      <p className="text-sm text-[#444444] mb-5">We&apos;ll take a quick look to make sure it&apos;s reachable, then audit it.</p>

      <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Website URL</label>
      <input
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); if (ws === 'unreachable') setWs('idle') }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]"
        placeholder="https://yourgym.com"
      />
      <p className="text-xs text-[#444444]/60 mt-2">We only read public pages — nothing behind a login.</p>

      {ws === 'unreachable' && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs text-red-700 mb-2">We had trouble reaching this URL. You can update it and try again, or skip this channel.</p>
          <button
            type="button"
            onClick={() => onContinue({ url, status: 'skipped' })}
            className="text-xs text-[#444444]/60 hover:text-[#444444]"
          >
            Skip this channel
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={onBack} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button
          type="button"
          onClick={runCheck}
          disabled={ws === 'checking'}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors"
        >
          {ws === 'checking' ? 'Checking…' : isLast ? 'Begin Audit →' : 'Check & continue →'}
        </button>
      </div>
    </div>
  )
}

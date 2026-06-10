// components/plan/PlatformTabs.tsx
'use client'

import { useState } from 'react'
import { Channel, Story } from '@/lib/types'
import { CopyBlock } from './CopyBlock'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

interface PlatformTabsProps {
  story: Story
  activeChannels: Channel[]
}

export function PlatformTabs({ story, activeChannels }: PlatformTabsProps) {
  const available = activeChannels.filter((c) => story.channels[c])
  const [activeTab, setActiveTab] = useState<Channel>(available[0])

  if (available.length === 0) return null

  const channelCopy = story.channels[activeTab]

  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {available.map((channel) => (
          <button
            key={channel}
            onClick={() => setActiveTab(channel)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              activeTab === channel
                ? 'bg-[#81A1D3] text-[#1E212E]'
                : 'bg-gray-100 text-[#444444] hover:bg-gray-200'
            }`}
          >
            {CHANNEL_LABELS[channel]}
          </button>
        ))}
      </div>
      {channelCopy && <CopyBlock channelCopy={channelCopy} />}
    </div>
  )
}

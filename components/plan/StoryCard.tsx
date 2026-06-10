// components/plan/StoryCard.tsx
'use client'

import { useState } from 'react'
import { Story, Channel } from '@/lib/types'
import { PlatformTabs } from './PlatformTabs'

interface StoryCardProps {
  story: Story
  activeChannels: Channel[]
  defaultExpanded: boolean
  index: number
}

export function StoryCard({ story, activeChannels, defaultExpanded, index }: StoryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`rounded-xl mb-3 overflow-hidden border transition-colors ${expanded ? 'border-[#81A1D3]' : 'border-gray-200'}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${expanded ? 'bg-[#81A1D3] text-[#1E212E]' : 'bg-gray-100 text-[#444444]'}`}>
            Story {index + 1}
          </span>
          <span className="text-sm font-bold text-[#1E212E]">{story.title}</span>
        </div>
        <span className="text-sm text-[#444444]/50 ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={`border-t border-[#81A1D3]/20 px-4 py-4 bg-white`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#444444] bg-gray-100 px-2 py-0.5 rounded-full">{story.type}</span>
          </div>
          <p className="text-xs text-[#444444] leading-relaxed mb-4">{story.whySelected}</p>
          <PlatformTabs story={story} activeChannels={activeChannels} />
        </div>
      )}
    </div>
  )
}

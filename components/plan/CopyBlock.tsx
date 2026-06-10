// components/plan/CopyBlock.tsx
import { StoryChannelCopy } from '@/lib/types'

export function CopyBlock({ channelCopy }: { channelCopy: StoryChannelCopy }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
        <p className="text-xs font-bold text-[#1E212E] mb-1.5">Copy</p>
        <p className="text-xs text-[#444444] leading-relaxed whitespace-pre-wrap">{channelCopy.copy}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-xs font-bold text-[#1E212E] mb-1">Visual</p>
          <p className="text-xs text-[#444444] leading-relaxed">{channelCopy.visualRecommendation}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-xs font-bold text-[#1E212E] mb-1">Post on</p>
          <p className="text-xs text-[#444444] leading-relaxed">{channelCopy.suggestedPostDate}</p>
        </div>
      </div>
    </div>
  )
}

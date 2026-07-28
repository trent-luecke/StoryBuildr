// components/steps/ChannelDetailsIntro.tsx
'use client'

interface ChannelDetailsIntroProps {
  onContinue: () => void
  onBack: () => void
}

const VALUE_PROPS = [
  { icon: '✦', title: 'Real examples beat guesses', body: 'Paste a few actual posts and we audit the real thing — not a rough description.' },
  { icon: '⏱', title: 'About 2–3 minutes', body: "We'll take one channel at a time so it never feels like a wall of forms." },
  { icon: '↺', title: 'No wrong answers', body: 'Not sure? Just describe the channel in your own words — that works too.' },
]

export function ChannelDetailsIntro({ onContinue, onBack }: ChannelDetailsIntroProps) {
  return (
    <div>
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 3 · Channel details</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-2">First — the part that does the heavy lifting</h2>
      <p className="text-sm text-[#444444] mb-6">
        Everything after this (your audit and your 30-day plan) is built from what you share here. A couple of real
        minutes now = a sharper, more personalized result.
      </p>

      <div className="flex flex-col gap-4 mb-8">
        {VALUE_PROPS.map((v) => (
          <div key={v.title} className="flex gap-3 items-start">
            <span className="w-8 h-8 rounded-lg bg-[#f0f5fb] text-[#81A1D3] flex items-center justify-center text-base shrink-0">
              {v.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-[#1E212E]">{v.title}</p>
              <p className="text-sm text-[#444444] mt-0.5">{v.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button type="button" onClick={onBack} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button
          type="button"
          onClick={onContinue}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          Let&apos;s do it →
        </button>
      </div>
    </div>
  )
}

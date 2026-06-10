// components/audit/ChannelCard.tsx
import { AuditResult, Channel } from '@/lib/types'
import { ScoreBar } from './ScoreBar'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

interface ChannelCardProps { result: AuditResult }

export function ChannelCard({ result }: ChannelCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-[#444444] uppercase tracking-wide">
            {result.channel}
          </p>
        </div>
        <ScoreBar score={result.score} />
      </div>

      <p className="text-sm text-[#444444] leading-relaxed mb-3">{result.narrative}</p>

      <div className="flex gap-2">
        <div className="flex-1 bg-[#f0f5fb] border-l-[3px] border-[#81A1D3] rounded-r-lg px-3 py-2">
          <p className="text-xs font-bold text-[#1E212E] mb-1.5">Doing well</p>
          <ul className="flex flex-col gap-1">
            {result.doingWell.map((item, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-[#1E212E]">
                <span className="text-[#81A1D3] shrink-0">✓</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-red-50 border-l-[3px] border-[#f87171] rounded-r-lg px-3 py-2">
          <p className="text-xs font-bold text-[#1E212E] mb-1.5">Opportunities</p>
          <ul className="flex flex-col gap-1">
            {result.opportunities.map((item, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-[#1E212E]">
                <span className="text-[#f87171] shrink-0">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

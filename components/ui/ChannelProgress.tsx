// components/ui/ChannelProgress.tsx
interface ChannelProgressProps {
  current: number
  total: number
}

export function ChannelProgress({ current, total }: ChannelProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-[#444444] tracking-wide whitespace-nowrap">
        Channel {current} of {total}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-[#eef1f6] overflow-hidden">
        <div
          data-progress-fill
          className="h-full bg-[#81A1D3] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

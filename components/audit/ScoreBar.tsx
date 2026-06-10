// components/audit/ScoreBar.tsx
interface ScoreBProps { score: number | null }

export function ScoreBar({ score }: ScoreBProps) {
  if (score === null) {
    return (
      <span className="text-xs text-[#81A1D3] font-semibold bg-[#f0f5fb] px-2.5 py-1 rounded-full">
        Self-reported
      </span>
    )
  }

  const pct = (score / 10) * 100
  const color = score >= 6 ? 'bg-[#81A1D3]' : 'bg-[#f87171]'

  return (
    <div className="text-right">
      <div className="flex items-baseline gap-0.5 justify-end">
        <span className="text-2xl font-extrabold text-[#1E212E] leading-none">{score}</span>
        <span className="text-xs text-[#444444]">/10</span>
      </div>
      <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
        <div
          data-testid="score-bar-fill"
          className={`h-1 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

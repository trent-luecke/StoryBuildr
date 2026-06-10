'use client'

import { useWizard } from '@/hooks/useWizard'
import { ChannelCard } from '@/components/audit/ChannelCard'
import { PdfCallout } from '@/components/ui/PdfCallout'

export function StepAuditResults() {
  const { state, dispatch } = useWizard()
  const results = state.auditResults ?? []
  const gymName = state.businessInfo?.gymName ?? 'your gym'

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Audit Results</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Here's what we found, {gymName}</h2>
      <p className="text-sm text-[#444444] mb-5">You're showing up — but are you telling stories? Here's the breakdown.</p>

      <PdfCallout />

      {results.map((result) => (
        <ChannelCard key={result.channel} result={result} />
      ))}

      <button
        onClick={() => dispatch({ type: 'SET_STEP', step: 6 })}
        className="w-full bg-[#81A1D3] text-[#1E212E] font-extrabold py-3 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors mt-2"
      >
        Let's find your stories →
      </button>
    </div>
  )
}

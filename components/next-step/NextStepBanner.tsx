import { NEXT_STEP_URL } from '@/lib/next-step'

// Persistent fallback once the modal is closed, so dismissing it doesn't end the funnel.
// Sticky so it stays visible wherever they were scrolled when they closed the modal.
export function NextStepBanner() {
  return (
    <div className="sticky top-[calc(var(--sticky-offset,0px)+1rem)] z-30 flex flex-col sm:flex-row sm:items-center gap-3 bg-[#1E212E] rounded-lg px-4 py-3 mb-5 shadow-lg">
      <div className="flex-1">
        <p className="text-xs font-bold text-white mb-0.5">Next: get these prospects in the door</p>
        <p className="text-xs text-white/70 leading-relaxed">You know how to attract new members. Here&apos;s how to turn them into members who show up.</p>
      </div>
      <a
        href={NEXT_STEP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 bg-[#81A1D3] text-[#1E212E] font-extrabold px-4 py-2 rounded-lg text-xs tracking-wide text-center hover:bg-[#6b8fbf] transition-colors"
      >
        Show me how →
      </a>
    </div>
  )
}

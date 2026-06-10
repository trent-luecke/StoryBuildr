// components/ui/PdfCallout.tsx
export function PdfCallout() {
  return (
    <div className="flex items-center gap-3 bg-[#f0f5fb] border border-[#81A1D3] rounded-lg px-4 py-3 mb-5">
      <span className="text-xl shrink-0">📄</span>
      <div>
        <p className="text-xs font-bold text-[#1E212E] mb-0.5">These results are saved to your report</p>
        <p className="text-xs text-[#444444] leading-relaxed">
          Finish the full workflow and you'll get everything — audit results, your stories, and your 30-day content plan — in a downloadable PDF.
        </p>
      </div>
    </div>
  )
}

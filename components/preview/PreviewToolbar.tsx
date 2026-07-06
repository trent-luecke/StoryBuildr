'use client'

import { PREVIEW_VIEWS } from '@/lib/preview/mock-data'

export function PreviewToolbar({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="sticky top-0 z-50 bg-[#1E212E] border-b-2 border-[#81A1D3] px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#81A1D3] text-[11px] font-extrabold tracking-[1.5px] uppercase mr-2">
          Preview
        </span>
        {PREVIEW_VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`text-[12px] font-bold px-2.5 py-1 rounded-md transition-colors ${
              activeId === v.id
                ? 'bg-[#81A1D3] text-[#1E212E]'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

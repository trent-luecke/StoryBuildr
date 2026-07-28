// components/ui/CopyLinkHelp.tsx
'use client'

import { useId, useState } from 'react'

interface CopyLinkHelpProps {
  platformLabel: string
}

export function CopyLinkHelp({ platformLabel }: CopyLinkHelpProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center gap-1 text-xs font-bold text-[#81A1D3] hover:text-[#6b8fbf]"
      >
        <span
          aria-hidden="true"
          className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ›
        </span>
        How do I copy a post link?
      </button>

      {open && (
        <div
          id={panelId}
          className="mt-2 rounded-lg bg-[#f0f5fb] px-3 py-2.5 text-xs text-[#444444]"
        >
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Open your <span className="font-bold text-[#1E212E]">{platformLabel}</span> post.
            </li>
            <li>
              Tap the <span className="font-bold text-[#1E212E]">⋯</span> menu in the top-right
              corner of the post.
            </li>
            <li>
              Choose <span className="font-bold text-[#1E212E]">Copy link</span> — then paste it
              above.
            </li>
          </ol>
          <p className="mt-2 text-[#444444]/70">
            Works the same in the app or on the web. On a computer, you can also copy the link
            straight from your browser&apos;s address bar with the post open.
          </p>
        </div>
      )}
    </div>
  )
}

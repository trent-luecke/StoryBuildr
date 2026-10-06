'use client'

import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { NEXT_STEP_URL } from '@/lib/next-step'

export function NextStepModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    // Outside clicks don't dismiss — closing is via the X (or Escape, for keyboard users)
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose() }} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[#1E212E]/60" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 pt-8 shadow-xl">
          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md p-1.5 text-[#444444]/70 hover:bg-[#f0f5fb] hover:text-[#1E212E] transition-colors"
          >
            <X className="size-4" />
          </Dialog.Close>
          <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Thanks for using StoryBuildr</p>
          <Dialog.Title className="text-xl font-extrabold text-[#1E212E] mb-2">
            Now, how do you get these prospects in the door?
          </Dialog.Title>
          <Dialog.Description className="text-sm text-[#444444] leading-relaxed mb-6">
            Your stories will attract new members. The next step is turning that attention into people who actually walk in.
          </Dialog.Description>
          <a
            href={NEXT_STEP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="block w-full bg-[#81A1D3] text-[#1E212E] font-extrabold py-3 rounded-lg text-sm tracking-wide text-center hover:bg-[#6b8fbf] transition-colors"
          >
            Show me how →
          </a>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

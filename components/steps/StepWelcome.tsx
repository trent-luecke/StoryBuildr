'use client'

import { useWizard } from '@/hooks/useWizard'

export function StepWelcome() {
  const { dispatch } = useWizard()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-12 py-16 max-w-2xl mx-auto text-center">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-3">Free Content Audit</p>
      <h1 className="text-4xl font-extrabold text-[#1E212E] leading-tight mb-4">
        Your gym has better stories<br />than you think.
      </h1>
      <p className="text-[#444444] text-base leading-relaxed mb-8 max-w-md">
        StoryBuildr audits your current content, uncovers the stories you're sitting on,
        and builds you a 30-day content plan with copy ready to post.
      </p>
      <div className="flex gap-6 mb-10 text-sm text-[#444444]">
        <div className="flex items-center gap-2"><span className="text-[#81A1D3] font-bold">1.</span> Channel audit</div>
        <div className="flex items-center gap-2"><span className="text-[#81A1D3] font-bold">2.</span> Story mining</div>
        <div className="flex items-center gap-2"><span className="text-[#81A1D3] font-bold">3.</span> 30-day plan + PDF</div>
      </div>
      <button
        onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
        className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-8 py-3 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
      >
        Start your free audit →
      </button>
    </div>
  )
}

import { WizardStep } from '@/lib/types'

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Welcome' },
  { step: 2, label: 'Business Info' },
  { step: 3, label: 'Channel Details' },
  { step: 4, label: 'Story Audit' },
  { step: 5, label: 'Audit Results' },
  { step: 6, label: 'Story Mine' },
  { step: 7, label: 'Your Plan' },
]

interface WizardSidebarProps {
  currentStep: WizardStep
}

export function WizardSidebar({ currentStep }: WizardSidebarProps) {
  return (
    <aside className="w-[180px] shrink-0 bg-[#1E212E] flex flex-col px-4 py-5">
      <span className="text-[#81A1D3] text-[11px] font-extrabold tracking-[1.5px] uppercase mb-6">
        StoryBuildr
      </span>

      <nav className="flex flex-col gap-3 flex-1">
        {STEPS.map(({ step, label }) => {
          const done = currentStep > step
          const active = currentStep === step
          return (
            <div
              key={step}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                active ? 'bg-white/10' : ''
              }`}
            >
              <div
                className={`w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  done || active
                    ? 'bg-[#81A1D3] text-[#1E212E]'
                    : 'bg-white/10 text-[#81A1D3]'
                }`}
              >
                {done ? '✓' : step}
              </div>
              <span
                className={`text-[9px] font-${active ? 'bold' : 'normal'} ${
                  active ? 'text-white' : done ? 'text-[#81A1D3]' : 'text-white/40'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </nav>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-[9px] text-[#81A1D3]/50 mb-1.5">{currentStep} of 7</p>
        <div className="h-1 bg-white/10 rounded-full">
          <div
            className="h-1 bg-[#81A1D3] rounded-full transition-all"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  )
}

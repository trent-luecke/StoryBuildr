import Image from 'next/image'
import { WizardStep } from '@/lib/types'

// White wordmark on transparent — built for the dark (#1E212E) nav surface
function BrandLockup({ logoClassName }: { logoClassName: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Image
        src="/teambuildr-os-logo.png"
        alt="TeamBuildr OS"
        width={4648}
        height={520}
        preload
        className={`${logoClassName} h-auto`}
      />
      <span className="text-[#81A1D3] text-[11px] font-extrabold tracking-[1.5px] uppercase">
        StoryBuildr
      </span>
    </div>
  )
}

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
    <aside className="hidden md:flex w-[180px] shrink-0 bg-[#1E212E] flex-col px-4 py-5">
      <div className="mb-6">
        <BrandLockup logoClassName="w-full" />
      </div>

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
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${
                  done || active
                    ? 'bg-[#81A1D3] text-[#1E212E]'
                    : 'bg-white/10 text-[#81A1D3]'
                }`}
              >
                {done ? '✓' : step}
              </div>
              <span
                className={`text-[13px] ${
                  active
                    ? 'font-bold text-white'
                    : done
                    ? 'font-normal text-[#81A1D3]'
                    : 'font-normal text-white/40'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </nav>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-[11px] text-[#81A1D3]/50 mb-1.5">{currentStep} of 7</p>
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

// Phones: the 180px sidebar would squeeze the step content, so it collapses into this
// slim top bar (the sidebar is display-only, so there's nothing to toggle open).
export function WizardMobileHeader({ currentStep }: WizardSidebarProps) {
  const label = STEPS.find((s) => s.step === currentStep)?.label
  return (
    <header className="md:hidden bg-[#1E212E] px-4 pt-3 pb-3">
      <div className="flex items-end justify-between mb-2">
        <BrandLockup logoClassName="w-[120px]" />
        <span className="text-[11px] text-white/70">
          Step {currentStep} of 7 · <span className="font-bold text-white">{label}</span>
        </span>
      </div>
      <div className="h-1 bg-white/10 rounded-full">
        <div
          className="h-1 bg-[#81A1D3] rounded-full transition-all"
          style={{ width: `${(currentStep / 7) * 100}%` }}
        />
      </div>
    </header>
  )
}
